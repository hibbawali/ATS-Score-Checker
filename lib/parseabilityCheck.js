/**
 * lib/parseabilityCheck.js
 *
 * Pure rule engine for ATS Parseability checks.
 * No external dependencies — only standard JS string/regex operations.
 *
 * @param {string} text - Plain-text content extracted from the resume.
 * @param {{ pageCount?: number, fileType?: "pdf"|"docx" }} metadata
 * @returns {{ score: number, issues: Array<{ code: string, severity: string, message: string }> }}
 */

// Pre-compiled regex for garbled/encoding characters.
// Matches: Unicode replacement char, C0/C1 control chars (excluding \t \n \r), Private Use Area.
const GARBLED_RE = /[\uFFFD\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\uE000-\uF8FF]/g;

// Issue code constants — all three must be distinct strings
const CODE_NO_TEXT    = 'NO_TEXT_EXTRACTED';
const CODE_LOW_RATIO  = 'LOW_TEXT_RATIO';
const CODE_GARBLED    = 'GARBLED_TEXT';

function checkParseability(text, metadata) {
  // --- Input coercion ---
  // Coerce invalid inputs to safe defaults so the function never throws.
  const safeText = typeof text === 'string' ? text : '';
  const safeMeta =
    metadata !== null &&
    typeof metadata === 'object' &&
    !Array.isArray(metadata)
      ? metadata
      : {};

  const issues = [];
  let deductions = 0;

  // --- Check 1: Text Extractability ---
  // Detects: documents from which no usable text was extracted (empty or whitespace-only).
  // Severity: Critical | Code: NO_TEXT_EXTRACTED
  // Effect: forces score = 0 and skips remaining checks entirely.
  if (safeText.trim() === '') {
    return {
      score: 0,
      issues: [
        {
          code: CODE_NO_TEXT,
          severity: 'Critical',
          message:
            'No text could be extracted from this document. ATS systems will not be able to read it.',
        },
      ],
    };
  }

  // --- Check 2: Text-to-Page Ratio ---
  // Detects: near-empty documents (very little text per page) indicating scanned images
  // or graphics-heavy layouts that ATS systems cannot read.
  // Severity: Critical (ratio < 100 chars/page) | Warning (100–299 chars/page)
  // Code: LOW_TEXT_RATIO
  const pageCount = safeMeta.pageCount;
  const validPageCount =
    typeof pageCount === 'number' && !isNaN(pageCount) && pageCount > 0;

  if (validPageCount) {
    const ratio = safeText.length / pageCount;

    if (ratio < 100) {
      issues.push({
        code: CODE_LOW_RATIO,
        severity: 'Critical',
        message:
          'This document has very little text per page. It may be a scanned image or have content as graphics that ATS systems cannot read.',
      });
      deductions += 40;
    } else if (ratio < 300) {
      issues.push({
        code: CODE_LOW_RATIO,
        severity: 'Warning',
        message:
          'This document has less text than expected for a resume. Some sections may be graphics or formatted in a way that ATS systems struggle to parse.',
      });
      deductions += 20;
    }
    // ratio >= 300: no issue
  }
  // If pageCount is invalid/absent/zero/negative/NaN: skip entirely

  // --- Check 3: Garbled / Encoding Issues ---
  // Detects: Unicode replacement chars, C0/C1 control chars (excluding \t \n \r),
  // and Private Use Area characters — all indicators of encoding corruption.
  // Note: \t (U+0009), \n (U+000A), \r (U+000D) are intentionally excluded from the regex.
  // Severity: Critical (garbled ratio > 2%) | Warning (0 < ratio ≤ 2%)
  // Code: GARBLED_TEXT
  // Division by zero is impossible here: Check 1 guarantees safeText.length > 0.
  const garbledCount = (safeText.match(GARBLED_RE) || []).length;
  const garbledRatio = garbledCount / safeText.length;

  if (garbledRatio > 0.02) {
    issues.push({
      code: CODE_GARBLED,
      severity: 'Critical',
      message:
        'This document contains a high proportion of unreadable or garbled characters. It may have encoding problems that will prevent ATS systems from reading it correctly.',
    });
    deductions += 30;
  } else if (garbledRatio > 0) {
    issues.push({
      code: CODE_GARBLED,
      severity: 'Warning',
      message:
        'This document contains some unreadable or garbled characters. This may indicate encoding issues that could affect ATS parsing.',
    });
    deductions += 15;
  }

  // --- Scoring ---
  // Base score: 100. Subtract deductions per check.
  // Deduction amounts: LOW_TEXT_RATIO Critical=40, Warning=20; GARBLED_TEXT Critical=30, Warning=15.
  // Clamped to [0, 100] — can never go negative or exceed 100.
  const finalScore = Math.min(100, Math.max(0, 100 - deductions));

  return { score: finalScore, issues };
}

module.exports = { checkParseability };
