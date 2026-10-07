'use strict';

/**
 * services/validationEngine.js
 *
 * Deterministic, rule-based verification engine for extracted document data.
 * Does not rely solely on AI for calculations or compliance checks.
 *
 * Checks implemented:
 * 1. Invoice total math (subtotal + taxes - discounts ≈ totalAmount)
 * 2. GST tax component math (CGST + SGST ≈ totalTax, CGST ≈ SGST)
 * 3. GSTIN format and presence validation
 * 4. Temporal date sequence verification (dueDate >= issueDate, overdue checks)
 * 5. Value sanity checks (non-negative amounts)
 */

/**
 * Helper to safely extract a numeric float from field values.
 */
function parseCurrency(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string') return null;

  // Remove currency symbols (₹, $, Rs.), commas, spaces
  const cleaned = val.replace(/[₹$,\sRsINR]/gi, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Helper to safely parse dates.
 */
function parseDate(val) {
  if (!val || typeof val !== 'string') return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Validates GSTIN structure (15 alphanumeric characters standard in India).
 */
function isValidGSTIN(gstin) {
  if (!gstin || typeof gstin !== 'string') return false;
  const clean = gstin.trim().toUpperCase();
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(clean);
}

/**
 * Runs deterministic validation rules against extracted fields and AI results.
 *
 * @param {Object} params
 * @param {string} params.documentType - Classified document category
 * @param {Array<{ field_name: string, field_value: string }>} params.fields - Extracted fields array
 * @param {Array<Object>} params.aiRisks - Risks identified by Gemini
 * @returns {Array<Object>} Combined, deduplicated list of validation results / risk flags
 */
function runDeterministicValidation({ documentType, fields, aiRisks = [] }) {
  const fieldMap = {};
  for (const f of fields) {
    if (f.field_name && f.field_value !== null && f.field_value !== undefined) {
      fieldMap[f.field_name.toLowerCase()] = String(f.field_value).trim();
    }
  }

  const generatedRisks = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // ─── 1. GST Invoice Arithmetic & Tax Validation ─────────────────────────────
  if (documentType === 'GST Invoice') {
    const subtotal = parseCurrency(fieldMap['subtotal'] || fieldMap['taxableamount']);
    const totalTax = parseCurrency(fieldMap['totaltax'] || fieldMap['taxamount']);
    const discount = parseCurrency(fieldMap['discount']) || 0;
    const totalAmount = parseCurrency(fieldMap['totalamount'] || fieldMap['grandtotal'] || fieldMap['amount']);

    const cgst = parseCurrency(fieldMap['cgst']);
    const sgst = parseCurrency(fieldMap['sgst']);
    const igst = parseCurrency(fieldMap['igst']);

    // Check Subtotal + Tax - Discount ≈ Total
    if (subtotal !== null && totalTax !== null && totalAmount !== null) {
      const computedTotal = subtotal + totalTax - discount;
      const discrepancy = Math.abs(computedTotal - totalAmount);

      if (discrepancy > 1.00) {
        generatedRisks.push({
          severity: 'error',
          title: 'Potential inconsistency detected in invoice total',
          description: `Calculated amount (Subtotal ₹${subtotal.toFixed(2)} + Tax ₹${totalTax.toFixed(2)} - Discount ₹${discount.toFixed(2)} = ₹${computedTotal.toFixed(2)}) does not match stated Total (₹${totalAmount.toFixed(2)}). Difference: ₹${discrepancy.toFixed(2)}.`,
          status: 'open',
        });
      }
    }

    // Check CGST + SGST vs Total Tax
    if (cgst !== null && sgst !== null) {
      const combinedGst = cgst + sgst;
      if (totalTax !== null && Math.abs(combinedGst - totalTax) > 1.00) {
        generatedRisks.push({
          severity: 'warning',
          title: 'Potential inconsistency in GST tax breakdown',
          description: `CGST (₹${cgst.toFixed(2)}) + SGST (₹${sgst.toFixed(2)}) = ₹${combinedGst.toFixed(2)}, which does not match total tax ₹${totalTax.toFixed(2)}.`,
          status: 'open',
        });
      }

      // Check intra-state symmetry (CGST should generally equal SGST)
      if (Math.abs(cgst - sgst) > 0.50) {
        generatedRisks.push({
          severity: 'info',
          title: 'CGST and SGST component divergence',
          description: `CGST (₹${cgst.toFixed(2)}) and SGST (₹${sgst.toFixed(2)}) are unequal, which is atypical for standard intra-state transactions.`,
          status: 'open',
        });
      }
    }

    // Check Seller GSTIN presence & format
    const sellerGSTIN = fieldMap['sellergstin'] || fieldMap['gstin'];
    if (!sellerGSTIN) {
      generatedRisks.push({
        severity: 'warning',
        title: 'Missing or unreadable Seller GSTIN',
        description: 'The invoice does not clearly list a 15-digit GST identification number for the seller.',
        status: 'open',
      });
    } else if (!isValidGSTIN(sellerGSTIN)) {
      generatedRisks.push({
        severity: 'info',
        title: 'Non-standard GSTIN format',
        description: `The extracted GSTIN "${sellerGSTIN}" does not match standard 15-character Indian format.`,
        status: 'open',
      });
    }

    // Check Invoice Number
    const invoiceNumber = fieldMap['invoicenumber'] || fieldMap['billnumber'];
    if (!invoiceNumber) {
      generatedRisks.push({
        severity: 'warning',
        title: 'Missing Invoice Number',
        description: 'Could not detect an invoice or reference number on this bill.',
        status: 'open',
      });
    }
  }

  // ─── 2. Utility Bill / Notice Due Date & Amount Validation ──────────────────
  if (documentType === 'Utility Bill' || documentType === 'Tax Notice') {
    const amountDue = parseCurrency(fieldMap['amountdue'] || fieldMap['totalamount'] || fieldMap['demandamount']);
    if (amountDue !== null && amountDue < 0) {
      generatedRisks.push({
        severity: 'warning',
        title: 'Negative amount detected',
        description: `The document indicates a negative balance or refund amount of ₹${amountDue.toFixed(2)}.`,
        status: 'open',
      });
    }
  }

  // ─── 3. Temporal Sequence Checks (Issue Date vs Due Date) ────────────────────
  const issueDateStr = fieldMap['invoicedate'] || fieldMap['billdate'] || fieldMap['noticedate'] || fieldMap['date'];
  const dueDateStr = fieldMap['duedate'] || fieldMap['paymentduedate'];

  const issueDate = parseDate(issueDateStr);
  const dueDate = parseDate(dueDateStr);

  if (issueDate && dueDate) {
    if (dueDate < issueDate) {
      generatedRisks.push({
        severity: 'critical',
        title: 'Potential inconsistency: Due date precedes document date',
        description: `The due date (${dueDate.toLocaleDateString('en-IN')}) is earlier than the issue date (${issueDate.toLocaleDateString('en-IN')}).`,
        status: 'open',
      });
    }
  }

  // Check if due date has already passed
  if (dueDate) {
    if (dueDate < now) {
      const daysPassed = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      generatedRisks.push({
        severity: 'warning',
        title: 'Payment/Action deadline has passed',
        description: `The stated due date (${dueDate.toLocaleDateString('en-IN')}) passed approximately ${daysPassed} day(s) ago.`,
        status: 'open',
      });
    }
  }

  // ─── 4. Merge with AI-detected Risks (Avoid duplicates) ─────────────────────
  const combined = [...generatedRisks];
  const seenTitles = new Set(generatedRisks.map((r) => r.title.toLowerCase()));

  for (const aiRisk of aiRisks) {
    const titleKey = (aiRisk.title || '').toLowerCase().trim();
    if (!seenTitles.has(titleKey)) {
      seenTitles.add(titleKey);
      combined.push({
        severity: aiRisk.severity || 'warning',
        title: aiRisk.title,
        description: aiRisk.description,
        status: aiRisk.status || 'open',
      });
    }
  }

  return combined;
}

module.exports = {
  runDeterministicValidation,
  parseCurrency,
  parseDate,
  isValidGSTIN,
};
