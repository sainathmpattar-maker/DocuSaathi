'use strict';

/**
 * services/analysisService.js
 *
 * Orchestrates the DocuSaathi Intelligence Engine pipeline:
 * Retrieve Private Storage Object → Gemini Multimodal Ingestion → Zod Validation
 * → Deterministic Validation Engine → Idempotent Supabase Persistence.
 *
 * SECURITY & IDOR DEFENSE:
 * - Documents are retrieved and mutated ONLY when matching the verified JWT userId.
 * - Private storage file buffers are streamed directly to memory and never written to disk.
 * - Re-analyzing a document safely replaces existing child rows, preventing duplicates.
 */

const { getSupabaseAdmin } = require('../lib/supabase');
const { analyzeDocumentWithGemini } = require('../lib/gemini');
const { runDeterministicValidation } = require('./validationEngine');

const STORAGE_BUCKET = 'documents';

/**
 * Executes the full DocuSaathi Intelligence Engine pipeline on a user's document.
 *
 * @param {Object} params
 * @param {string} params.documentId - Document UUID
 * @param {string} params.userId - Verified user ID from JWT
 * @returns {Promise<Object>} Full analysis results
 */
async function analyzeDocument({ documentId, userId }) {
  const supabase = getSupabaseAdmin();

  // ─── 1. Authenticate & Verify Document Ownership (IDOR Check) ───────────────
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('id, user_id, file_name, file_url, file_type, file_size, document_type, status, created_at, updated_at')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (docError || !document) {
    const err = new Error('Document not found or unauthorized.');
    err.code = 'DOCUMENT_NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // ─── 2. Update status to 'processing' ───────────────────────────────────────
  await supabase
    .from('documents')
    .update({ status: 'processing', updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .eq('user_id', userId);

  try {
    // ─── 3. Fetch user preferred language from profiles ───────────────────────
    let preferredLanguage = 'English';
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.preferred_language) {
      preferredLanguage = profile.preferred_language;
    }

    // ─── 4. Download file buffer from private Supabase Storage ────────────────
    const { data: storageFileBlob, error: downloadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(document.file_url);

    if (downloadError || !storageFileBlob) {
      console.error('[DocuSaathi Storage] Error retrieving storage file:', downloadError?.message);
      const err = new Error('Unable to retrieve document file from secure storage.');
      err.code = 'STORAGE_FILE_NOT_FOUND';
      err.status = 502;
      throw err;
    }

    // Convert blob to Buffer for AI SDK
    const arrayBuffer = await storageFileBlob.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // ─── 5. Send to Gemini Multimodal Pipeline with Prompt Injection Defense ──
    const aiOutput = await analyzeDocumentWithGemini({
      fileBuffer,
      mimeType: document.file_type || 'application/pdf',
      preferredLanguage,
    });

    // ─── 6. Run Deterministic Calculation & Compliance Validation ─────────────
    const finalValidationResults = runDeterministicValidation({
      documentType: aiOutput.documentType,
      fields: aiOutput.fields,
      aiRisks: aiOutput.risks,
    });

    // ─── 7. Save results into Supabase tables (Idempotent Replace) ─────────────
    // Clean up any previous analysis rows for this document
    await Promise.all([
      supabase.from('extractions').delete().eq('document_id', documentId),
      supabase.from('validation_results').delete().eq('document_id', documentId),
      supabase.from('deadlines').delete().eq('document_id', documentId),
    ]);

    // Insert new extractions
    const extractionRows = [];
    if (aiOutput.fields && aiOutput.fields.length > 0) {
      aiOutput.fields.forEach((f) => {
        extractionRows.push({
          document_id: documentId,
          field_name: f.field_name,
          field_value: f.field_value,
          confidence: f.confidence !== undefined ? f.confidence : null,
        });
      });
    }

    // Persist AI summary & explanation metadata so it can be reloaded on view
    if (aiOutput.documentSummary) {
      extractionRows.push({
        document_id: documentId,
        field_name: '_documentSummary',
        field_value: aiOutput.documentSummary,
        confidence: 1.0,
      });
    }
    if (aiOutput.plainLanguageExplanation) {
      extractionRows.push({
        document_id: documentId,
        field_name: '_plainLanguageExplanation',
        field_value: JSON.stringify(aiOutput.plainLanguageExplanation),
        confidence: 1.0,
      });
    }
    if (aiOutput.actionPlan) {
      extractionRows.push({
        document_id: documentId,
        field_name: '_actionPlan',
        field_value: JSON.stringify(aiOutput.actionPlan),
        confidence: 1.0,
      });
    }

    if (extractionRows.length > 0) {
      const { error: extError } = await supabase.from('extractions').insert(extractionRows);
      if (extError) {
        console.warn('[DocuSaathi DB] Extractions insert note:', extError.message);
      }
    }

    // Insert validation results & risk flags
    if (finalValidationResults.length > 0) {
      const allowedSeverities = new Set(['info', 'warning', 'error', 'critical']);
      const validationRows = finalValidationResults.map((r) => ({
        document_id: documentId,
        severity: allowedSeverities.has(r.severity) ? r.severity : 'warning',
        title: r.title,
        description: r.description,
        status: r.status || 'open',
      }));

      const { error: valError } = await supabase.from('validation_results').insert(validationRows);
      if (valError) {
        console.warn('[DocuSaathi DB] Validation results insert note:', valError.message);
      }
    }

    // Insert deadlines
    if (aiOutput.deadlines && aiOutput.deadlines.length > 0) {
      const allowedPriorities = new Set(['low', 'medium', 'high', 'critical']);
      const deadlineRows = aiOutput.deadlines.map((d) => ({
        document_id: documentId,
        title: d.title,
        due_date: d.due_date || null,
        priority: allowedPriorities.has(d.priority) ? d.priority : 'medium',
        completed: d.completed || false,
      }));

      const { error: deadError } = await supabase.from('deadlines').insert(deadlineRows);
      if (deadError) {
        console.warn('[DocuSaathi DB] Deadlines insert note:', deadError.message);
      }
    }

    // Update document record status to 'completed'
    const { data: updatedDoc, error: updateError } = await supabase
      .from('documents')
      .update({
        document_type: aiOutput.documentType,
        confidence_score: aiOutput.confidenceScore,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('user_id', userId)
      .select('id, user_id, file_name, file_type, file_size, document_type, status, confidence_score, created_at, updated_at')
      .single();

    if (updateError) {
      throw updateError;
    }

    return {
      success: true,
      document: updatedDoc,
      summary: aiOutput.documentSummary,
      plainLanguageExplanation: aiOutput.plainLanguageExplanation,
      extractions: aiOutput.fields,
      validation_results: finalValidationResults,
      deadlines: aiOutput.deadlines,
      actionPlan: aiOutput.actionPlan,
    };
  } catch (pipelineError) {
    // ─── Status Failure Fallback ───────────────────────────────────────────────
    console.error('[DocuSaathi Analysis] Pipeline failure:', pipelineError.message);
    try {
      await supabase
        .from('documents')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('id', documentId)
        .eq('user_id', userId);
    } catch (statusUpdateErr) {
      console.warn('[DocuSaathi DB] Failed status update error:', statusUpdateErr);
    }

    throw pipelineError;
  }
}

/**
 * Retrieves existing analysis results for an already-analyzed document.
 *
 * @param {string} documentId
 * @param {string} userId - Verified from JWT
 */
async function getAnalysisResults({ documentId, userId }) {
  const supabase = getSupabaseAdmin();

  // Verify ownership
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('id, user_id, file_name, file_type, file_size, document_type, status, confidence_score, created_at, updated_at')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (docError || !document) {
    const err = new Error('Document not found.');
    err.code = 'NOT_FOUND';
    err.status = 404;
    throw err;
  }

  // Fetch child records
  const [extractionsRes, validationRes, deadlinesRes] = await Promise.all([
    supabase.from('extractions').select('*').eq('document_id', documentId).order('created_at', { ascending: true }),
    supabase.from('validation_results').select('*').eq('document_id', documentId).order('created_at', { ascending: true }),
    supabase.from('deadlines').select('*').eq('document_id', documentId).order('due_date', { ascending: true }),
  ]);

  const allExtractions = extractionsRes.data || [];
  let summary = null;
  let plainLanguageExplanation = null;
  let actionPlan = [];
  const cleanExtractions = [];

  for (const ext of allExtractions) {
    if (ext.field_name === '_documentSummary') {
      summary = ext.field_value;
    } else if (ext.field_name === '_plainLanguageExplanation') {
      try {
        plainLanguageExplanation = JSON.parse(ext.field_value);
      } catch (_) {
        plainLanguageExplanation = null;
      }
    } else if (ext.field_name === '_actionPlan') {
      try {
        actionPlan = JSON.parse(ext.field_value);
      } catch (_) {
        actionPlan = [];
      }
    } else {
      cleanExtractions.push(ext);
    }
  }

  return {
    success: true,
    document,
    summary,
    plainLanguageExplanation,
    extractions: cleanExtractions,
    validation_results: validationRes.data || [],
    deadlines: deadlinesRes.data || [],
    actionPlan,
  };
}

module.exports = {
  analyzeDocument,
  getAnalysisResults,
};
