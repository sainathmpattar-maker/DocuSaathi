'use strict';

/**
 * verify_phase5.js
 *
 * Automated end-to-end test script for Phase 5 Gemini Document Analysis Pipeline.
 * Tests:
 * 1. Environment & Auth check
 * 2. IDOR prevention (User B cannot analyze User A's document)
 * 3. Real Gemini multimodal analysis from Supabase private storage
 * 4. Structured output validation (Zod & deterministic rules)
 * 5. Database persistence (documents, extractions, validation_results, deadlines)
 * 6. Re-analysis idempotency (no duplicate rows)
 * 7. Controlled failure handling (status does not stay 'processing')
 */

require('dotenv').config();
const { getSupabaseAdmin } = require('../src/lib/supabase');

const BASE_URL = 'http://localhost:4000';

function generateInvoicePdf() {
  const lines = [
    'TAX INVOICE',
    '',
    'Seller: Sharma Electronics Private Limited',
    'GSTIN: 27AABCS1429B1ZB',
    'Address: 42 Tech Park, Andheri East, Mumbai, Maharashtra 400069',
    '',
    'Buyer: Apex Logistics Solutions',
    'Buyer GSTIN: 27XYZPS9876C1ZA',
    'Invoice Number: INV-2026-8821',
    'Invoice Date: 2026-09-20',
    'Due Date: 2026-10-01',
    'Payment Status: Overdue',
    '',
    'Description: Mechanical Office Keyboards x 10',
    'Subtotal / Taxable Amount: INR 10000.00',
    'CGST (9%): INR 900.00',
    'SGST (9%): INR 900.00',
    'Total Tax: INR 1800.00',
    'Total Amount: INR 11800.00',
    '',
    'Terms: Payment strictly due within 30 days of invoice date.'
  ];

  let streamContent = 'BT\n/F1 14 Tf\n50 720 Td\n18 TL\n';
  for (const line of lines) {
    streamContent += '(' + line.replace(/[\\()]/g, '\\$&') + ') \'\n';
  }
  streamContent += 'ET\n';

  const len = Buffer.byteLength(streamContent);

  const objects = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    '5 0 obj\n<< /Length ' + len + ' >>\nstream\n' + streamContent + 'endstream\nendobj\n'
  ];

  let pdf = objects.join('');
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += 'xref\n0 6\n0000000000 65535 f \n';
  
  let offset = Buffer.byteLength(objects[0]);
  for (let i = 1; i <= 5; i++) {
    pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
    offset += Buffer.byteLength(objects[i]);
  }
  pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xrefOffset + '\n%%EOF\n';
  return Buffer.from(pdf);
}

async function runVerification() {
  console.log('====================================================');
  console.log('STARTING PHASE 5 REAL E2E VERIFICATION SUITE');
  console.log('====================================================\n');

  const admin = getSupabaseAdmin();
  const timestamp = Date.now();
  const password = 'TestSecurePass!123';

  // ─── Step 1: Create Test Users ─────────────────────────────────────────
  console.log('1. Setting up Test Users...');
  const userAEmail = `user_a_${timestamp}@docusaathi.test`;
  const userBEmail = `user_b_${timestamp}@docusaathi.test`;

  const { data: uA, error: errA } = await admin.auth.admin.createUser({
    email: userAEmail,
    password: password,
    email_confirm: true,
  });
  if (errA) throw new Error('Create User A failed: ' + errA.message);

  const { data: uB, error: errB } = await admin.auth.admin.createUser({
    email: userBEmail,
    password: password,
    email_confirm: true,
  });
  if (errB) throw new Error('Create User B failed: ' + errB.message);

  const userAId = uA.user.id;
  const userBId = uB.user.id;

  const { createClient } = require('@supabase/supabase-js');
  const authClientA = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const authClientB = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data: signA, error: signErrA } = await authClientA.auth.signInWithPassword({
    email: userAEmail,
    password: password,
  });
  if (signErrA) throw new Error('Sign in A failed: ' + signErrA.message);
  const tokenA = signA.session.access_token;

  const { data: signB, error: signErrB } = await authClientB.auth.signInWithPassword({
    email: userBEmail,
    password: password,
  });
  if (signErrB) throw new Error('Sign in B failed: ' + signErrB.message);
  const tokenB = signB.session.access_token;

  console.log('   User A created & authenticated (ID: ' + userAId + ')');
  console.log('   User B created & authenticated (ID: ' + userBId + ')');

  // ─── Step 2: Test Unauthenticated Request (Requirement 3) ───────────────
  console.log('\n2. Testing Authentication Enforcement...');
  const unauthRes = await fetch(`${BASE_URL}/api/documents/00000000-0000-0000-0000-000000000000/analyze`, {
    method: 'POST',
  });
  console.log(`   Unauthenticated status: ${unauthRes.status} (Expected: 401)`);
  if (unauthRes.status !== 401) {
    throw new Error(`Authentication check failed: expected 401, got ${unauthRes.status}`);
  }
  console.log('   -> PASS: Unauthenticated requests correctly rejected with 401');

  // ─── Step 3: Upload Document for User A ─────────────────────────────────
  console.log('\n3. Uploading Sample GST Invoice for User A via POST /api/documents/upload...');
  const pdfBuffer = generateInvoicePdf();

  const formData = new FormData();
  const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });
  formData.append('file', pdfBlob, 'gst_invoice_sample.pdf');

  const uploadRes = await fetch(`${BASE_URL}/api/documents/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
    body: formData,
  });

  const uploadData = await uploadRes.json();
  if (uploadRes.status !== 201 || !uploadData.success) {
    throw new Error('Upload failed: ' + JSON.stringify(uploadData));
  }

  const documentAId = uploadData.document.id;
  console.log(`   Uploaded document via API successfully! Document ID: ${documentAId} (Status: ${uploadData.document.status})`);

  // ─── Step 4: Verify IDOR Protection (Requirement 4) ────────────────────
  console.log('\n4. Testing IDOR Protection (User B attempts to analyze User A Document)...');
  const idorRes = await fetch(`${BASE_URL}/api/documents/${documentAId}/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenB}`,
    },
  });
  const idorData = await idorRes.json();
  console.log(`   User B request status: ${idorRes.status} (Expected 404/403)`);
  console.log('   User B response:', idorData);
  if (idorRes.status !== 404 && idorRes.status !== 403) {
    throw new Error(`IDOR check failed: expected 403 or 404, got ${idorRes.status}`);
  }
  console.log('   -> PASS: IDOR prevented. Unauthorized user blocked.');

  // ─── Step 5: Real Gemini Pipeline Execution (Requirement 5 & 6) ────────
  console.log('\n5. Executing REAL Gemini Analysis Pipeline for Document Owner (User A)...');
  console.log('   Calling POST /api/documents/:id/analyze...');
  const startTime = Date.now();
  const analyzeRes = await fetch(`${BASE_URL}/api/documents/${documentAId}/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });

  const durationMs = Date.now() - startTime;
  const analyzeData = await analyzeRes.json();

  if (analyzeRes.status !== 200 || !analyzeData.success) {
    console.error('Analysis failed:', analyzeData);
    throw new Error(`Analysis request failed with status ${analyzeRes.status}: ${JSON.stringify(analyzeData)}`);
  }

  console.log(`   Analysis succeeded in ${(durationMs / 1000).toFixed(2)}s!`);
  console.log(`   Document Type: ${analyzeData.document.document_type}`);
  console.log(`   Confidence Score: ${analyzeData.document.confidence_score}`);
  console.log(`   Document Status: ${analyzeData.document.status}`);
  console.log(`   Summary: ${analyzeData.summary}`);
  console.log(`   Plain Language Explanation: ${JSON.stringify(analyzeData.plainLanguageExplanation).slice(0, 100)}...`);
  console.log(`   Extracted Fields: ${analyzeData.extractions.length} items`);
  console.log(`   Sample Fields:`, analyzeData.extractions.slice(0, 4));
  console.log(`   Validation Results / Risks: ${analyzeData.validation_results.length} items`);
  console.log(`   Sample Validation Results:`, analyzeData.validation_results.slice(0, 2));
  console.log(`   Deadlines: ${analyzeData.deadlines.length} items:`, analyzeData.deadlines);
  console.log(`   Action Plan: ${analyzeData.actionPlan.length} steps`);

  // Verify response fields
  if (!analyzeData.document.document_type || analyzeData.document.document_type !== 'GST Invoice') {
    throw new Error('Expected document_type to be "GST Invoice", got: ' + analyzeData.document.document_type);
  }
  if (typeof analyzeData.document.confidence_score !== 'number' || analyzeData.document.confidence_score < 0.5) {
    throw new Error('Confidence score invalid: ' + analyzeData.document.confidence_score);
  }
  if (!analyzeData.summary || analyzeData.summary.length < 10) {
    throw new Error('Summary missing or too short');
  }
  if (!analyzeData.extractions || analyzeData.extractions.length === 0) {
    throw new Error('No extractions returned');
  }
  if (!analyzeData.deadlines || analyzeData.deadlines.length === 0) {
    throw new Error('No deadlines returned');
  }
  console.log('   -> PASS: Complete real Gemini structured response validated.');

  // ─── Step 6: Verify Database Records (Requirement 7) ───────────────────
  console.log('\n6. Verifying Database State in Supabase...');
  const { data: dbDoc, error: docErr } = await admin.from('documents').select('*').eq('id', documentAId).maybeSingle();
  const { data: dbExt, error: extErr } = await admin.from('extractions').select('*').eq('document_id', documentAId);
  const { data: dbVal, error: valErr } = await admin.from('validation_results').select('*').eq('document_id', documentAId);
  const { data: dbDln, error: dlnErr } = await admin.from('deadlines').select('*').eq('document_id', documentAId);

  if (docErr) throw new Error('Querying documents error: ' + docErr.message);
  if (!dbDoc) throw new Error('Document record not found for ID: ' + documentAId);
  console.log(`   documents.status = ${dbDoc.status} (Expected: 'completed')`);
  console.log(`   extractions count in DB: ${dbExt?.length || 0}`);
  console.log(`   validation_results count in DB: ${dbVal?.length || 0}`);
  console.log(`   deadlines count in DB: ${dbDln?.length || 0}`);

  if (dbDoc.status !== 'completed') {
    throw new Error(`Expected document status 'completed', found: ${dbDoc.status}`);
  }
  if (dbExt.length === 0) throw new Error('extractions table is empty for document');
  if (dbVal.length === 0) throw new Error('validation_results table is empty for document');
  if (dbDln.length === 0) throw new Error('deadlines table is empty for document');
  console.log('   -> PASS: Database records verified successfully.');

  // ─── Step 7: Verify Re-Analysis (Requirement 8) ────────────────────────
  console.log('\n7. Verifying Re-Analysis Idempotency...');
  const firstExtCount = dbExt.length;
  const firstValCount = dbVal.length;
  const firstDlnCount = dbDln.length;

  const reanalyzeRes = await fetch(`${BASE_URL}/api/documents/${documentAId}/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });
  const reanalyzeData = await reanalyzeRes.json();
  if (reanalyzeRes.status !== 200 || !reanalyzeData.success) {
    throw new Error('Re-analysis failed: ' + JSON.stringify(reanalyzeData));
  }

  const { data: reExt } = await admin.from('extractions').select('*').eq('document_id', documentAId);
  const { data: reVal } = await admin.from('validation_results').select('*').eq('document_id', documentAId);
  const { data: reDln } = await admin.from('deadlines').select('*').eq('document_id', documentAId);

  console.log(`   Original counts: [extractions: ${firstExtCount}, validation: ${firstValCount}, deadlines: ${firstDlnCount}]`);
  console.log(`   After re-analysis: [extractions: ${reExt.length}, validation: ${reVal.length}, deadlines: ${reDln.length}]`);

  // Ensure duplicate rows were not accumulated (they should be roughly equal, not 2x)
  if (reExt.length > firstExtCount * 1.5) {
    throw new Error(`Uncontrolled duplicate extractions created! Was ${firstExtCount}, now ${reExt.length}`);
  }
  if (reVal.length > firstValCount * 1.5) {
    throw new Error(`Uncontrolled duplicate validation results created! Was ${firstValCount}, now ${reVal.length}`);
  }
  console.log('   -> PASS: Re-analysis replaced previous results without row duplication.');

  // ─── Step 8: Controlled Failure Handling (Requirement 9) ───────────────
  console.log('\n8. Verifying Controlled Failure Handling...');
  // Create a document with a non-existent storage file
  const { data: brokenDoc } = await admin
    .from('documents')
    .insert({
      user_id: userAId,
      file_name: 'non_existent_file.pdf',
      file_url: `${userAId}/non_existent_path_${Date.now()}.pdf`,
      file_type: 'application/pdf',
      status: 'uploaded',
    })
    .select('*')
    .single();

  const failRes = await fetch(`${BASE_URL}/api/documents/${brokenDoc.id}/analyze`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
    },
  });
  const failData = await failRes.json();
  console.log(`   Failure request HTTP status: ${failRes.status}`);
  console.log('   Failure response error:', failData.error);

  const { data: brokenDocUpdated } = await admin
    .from('documents')
    .select('status')
    .eq('id', brokenDoc.id)
    .single();

  console.log(`   Broken document final status in DB: ${brokenDocUpdated.status} (Expected: 'failed', NOT 'processing')`);

  if (brokenDocUpdated.status !== 'failed') {
    throw new Error(`Failure handling failed: document status is '${brokenDocUpdated.status}', expected 'failed'`);
  }
  console.log('   -> PASS: Error handled cleanly; document status set to "failed" and not stuck in "processing".');

  // ─── Cleanup Test Data ──────────────────────────────────────────────────
  console.log('\n9. Cleaning up test data...');
  if (uploadData.document?.file_url) {
    await admin.storage.from('documents').remove([uploadData.document.file_url]);
  }
  await admin.from('documents').delete().in('id', [documentAId, brokenDoc.id]);
  await admin.auth.admin.deleteUser(userAId);
  await admin.auth.admin.deleteUser(userBId);
  console.log('   Cleanup complete.');

  console.log('\n====================================================');
  console.log('ALL PHASE 5 E2E LIVE VERIFICATION CHECKS PASSED!');
  console.log('====================================================');
}

runVerification().catch((err) => {
  console.error('\n*** VERIFICATION FAILED ***');
  console.error(err);
  process.exit(1);
});
