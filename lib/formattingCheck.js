/**
 * lib/formattingCheck.js
 *
 * Pure rule engine for ATS Formatting checks.
 * No external dependencies — only standard JS string/regex operations.
 *
 * IMPORTANT: These are TEXT-BASED HEURISTICS that approximate formatting issues.
 * They are NOT true visual or layout analysis. The extraction step (pdf-parse /
 * mammoth) strips all font data, column structure, and visual layout — so this
 * file detects formatting problems indirectly, by looking for patterns in the
 * extracted plain text that commonly result from problematic resume layouts.
 *
 * Three checks are implemented:
 *   1. Multi-column / table layout signal  — irregular whitespace and word-order
 *      jumbling that pdf-parse produces when reading columns out of visual order
 *   2. Bullet point consistency            — mixed bullet characters across the doc
 *   3. Excessive blank lines               — large whitespace gaps that suggest
 *      tables or complex layout blocks that didn't extract cleanly
 *
 * @param {string} text - Plain-text content extracted from the resume.
 * @returns {{ score: number, issues: Array<{ code: string, severity: string, message: string }> }}
 */

// ---------------------------------------------------------------------------
// Scoring weights
// Base score starts at 100; deductions subtracted; result clamped to [0, 100].
//
//   MULTICOLUMN_LAYOUT    Warning    → −25
//   MIXED_BULLETS         Suggestion → −10
//   EXCESSIVE_WHITESPACE  Warning    → −15
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Check 1 helpers — Multi-column / table layout signal
// ---------------------------------------------------------------------------

// When pdf-parse reads a two-column resume, it typically reads left-to-right
// across the full page width, which produces lines where unrelated fragments
// from different columns are jammed together with multiple internal spaces.
//
// Signal 1: Lines with 3+ consecutive internal spaces (column-gap artefacts).
// We ignore leading whitespace (indentation is normal) and look only at
// internal gaps within a line that has real content on both sides.
const MULTI_SPACE_RE = /\S {3,}\S/;

// Signal 2: Very short lines mixed densely with very long lines.
// A single-column resume has fairly consistent line lengths.
// Multi-column extraction produces erratic line length variance because some
// lines are just a fragment from one column and some span both.
//
// We compute the coefficient of variation (stddev / mean) of non-empty line
// lengths. A high value (> 0.9) combined with a meaningful sample size (>= 10
// non-empty lines) suggests erratic line length typical of column mis-reading.
// Threshold chosen conservatively to avoid false positives on short resumes.

// ---------------------------------------------------------------------------
// Check 2 helpers — Bullet point consistency
// ---------------------------------------------------------------------------

// The characters we recognise as bullet starters.
// Each represents a distinct "style" — mixing these is the issue we detect.
const BULLET_CHARS = [
  { char: '-',  re: /^-\s/  },   // hyphen bullet
  { char: '•',  re: /^•\s/  },   // filled circle
  { char: '*',  re: /^\*\s/ },   // asterisk
  { char: '·',  re: /^·\s/  },   // middle dot
  { char: '▪',  re: /^▪\s/  },   // small filled square
  { char: '▸',  re: /^▸\s/  },   // right-pointing triangle
  { char: '◦',  re: /^◦\s/  },   // open circle
  { char: '›',  re: /^›\s/  },   // single right angle quote
  { char: '–',  re: /^–\s/  },   // en-dash used as bullet
  { char: '○',  re: /^○\s/  },   // open circle variant
];

// ---------------------------------------------------------------------------
// Check 3 helpers — Excessive blank lines
// ---------------------------------------------------------------------------

// A "blank-line run" is a sequence of consecutive empty (or whitespace-only)
// lines. One or two blank lines between sections is normal. Three or more in
// a row is unusual and often indicates a table, text box, or graphic that
// failed to extract, leaving only its surrounding whitespace behind.
const BLANK_RUN_THRESHOLD = 3;   // consecutive blank lines to count as a run
const BLANK_RUN_COUNT_WARN = 2;  // how many such runs trigger the Warning

// ---------------------------------------------------------------------------
// Helper: compute population standard deviation of an array of numbers.
// Returns 0 for arrays with fewer than 2 elements.
// ---------------------------------------------------------------------------
function stddev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

function checkFormatting(text) {
  // --- Input coercion ---
  // Coerce non-string input to empty string so the function never throws.
  const safeText = typeof text === 'string' ? text : '';

  const issues = [];
  let deductions = 0;

  // Split into raw lines (preserving blank lines for Check 3)
  const lines = safeText.split(/\r?\n/);

  // Trimmed non-empty lines — used by Checks 1 and 2
  const nonEmptyLines = lines.map(l => l.trim()).filter(l => l.length > 0);

  // =========================================================================
  // Check 1: Multi-column / table layout signal
  //
  // Heuristic: looks for two independent text signals that commonly appear
  // together when pdf-parse mis-reads a multi-column layout.
  //
  // Signal A — Internal multi-space gaps: count lines that contain 3+
  //   consecutive spaces between non-space characters. Normal single-column
  //   text rarely has this; column-gap artefacts produce it frequently.
  //
  // Signal B — High line-length variance: compute the coefficient of variation
  //   (CV = stddev / mean) of non-empty line lengths. A well-formatted
  //   single-column resume has moderate CV; column mis-reading produces very
  //   erratic lengths (some lines are just a column fragment).
  //
  // We require BOTH signals to fire before flagging, to reduce false positives.
  // Severity: Warning | Code: MULTICOLUMN_LAYOUT | Deduction: −25
  // =========================================================================

  // Signal A: count multi-space lines (skip very short lines — they're often headers)
  const multiSpaceLines = nonEmptyLines.filter(
    line => line.length > 20 && MULTI_SPACE_RE.test(line)
  );
  const multiSpaceRatio = nonEmptyLines.length > 0
    ? multiSpaceLines.length / nonEmptyLines.length
    : 0;
  // Threshold: more than 15% of non-empty lines have internal multi-space gaps
  const signalA = multiSpaceRatio > 0.15;

  // Signal B: coefficient of variation of line lengths
  if (nonEmptyLines.length >= 10) {
    const lengths = nonEmptyLines.map(l => l.length);
    const mean    = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const cv      = mean > 0 ? stddev(lengths) / mean : 0;
    // Threshold: CV > 0.9 indicates highly erratic line lengths
    const signalB = cv > 0.9;

    if (signalA && signalB) {
      issues.push({
        code: 'MULTICOLUMN_LAYOUT',
        severity: 'Warning',
        message:
          'This resume may use a multi-column or table layout. ' +
          'ATS systems often read multi-column resumes out of order, ' +
          'jumbling your content and causing key information to be missed. ' +
          'Consider reformatting to a single-column layout.',
      });
      deductions += 25;
    }
  } else if (signalA) {
    // Not enough lines for CV check — flag on Signal A alone if very strong
    if (multiSpaceRatio > 0.35) {
      issues.push({
        code: 'MULTICOLUMN_LAYOUT',
        severity: 'Warning',
        message:
          'This resume may use a multi-column or table layout. ' +
          'ATS systems often read multi-column resumes out of order, ' +
          'jumbling your content and causing key information to be missed. ' +
          'Consider reformatting to a single-column layout.',
      });
      deductions += 25;
    }
  }

  // =========================================================================
  // Check 2: Bullet point consistency
  //
  // Heuristic: collect the leading bullet character of every line that starts
  // with a recognised bullet symbol followed by a space. If more than one
  // distinct bullet style is used, flag it.
  //
  // Why this matters: inconsistent bullets are a symptom of copy-pasting
  // content from different sources or templates. While not an ATS blocker,
  // some ATS systems group bullet lines differently depending on the character,
  // which can mis-parse list structure.
  //
  // Severity: Suggestion | Code: MIXED_BULLETS | Deduction: −10
  // =========================================================================

  const bulletStylesSeen = new Set();

  for (const line of nonEmptyLines) {
    for (const { char, re } of BULLET_CHARS) {
      if (re.test(line)) {
        bulletStylesSeen.add(char);
        break; // only count the first matching style per line
      }
    }
  }

  // Only flag if we have at least 3 bullet lines total AND more than one style.
  // (Fewer than 3 bullets = not enough data to judge consistency.)
  const totalBulletLines = nonEmptyLines.filter(line =>
    BULLET_CHARS.some(({ re }) => re.test(line))
  ).length;

  if (totalBulletLines >= 3 && bulletStylesSeen.size > 1) {
    const stylesFound = [...bulletStylesSeen].map(c => `"${c}"`).join(', ');
    issues.push({
      code: 'MIXED_BULLETS',
      severity: 'Suggestion',
      message:
        `Mixed bullet point styles were detected (${stylesFound}). ` +
        'Using a single consistent bullet character throughout your resume ' +
        'improves readability and ensures ATS systems parse your lists correctly.',
    });
    deductions += 10;
  }

  // =========================================================================
  // Check 3: Excessive blank lines
  //
  // Heuristic: scan the raw line array for runs of 3+ consecutive blank
  // (whitespace-only) lines. A single blank line between sections is normal.
  // Multiple consecutive blank lines usually indicate a text box, table, image,
  // or decorative element that the extractor skipped, leaving a gap behind.
  //
  // We count how many such "runs" exist. If there are 2 or more runs,
  // the resume likely has several complex layout elements that ATS systems
  // will not be able to read.
  //
  // Severity: Warning | Code: EXCESSIVE_WHITESPACE | Deduction: −15
  // =========================================================================

  let blankRunCount = 0;   // number of distinct blank-line runs of length >= threshold
  let currentRun    = 0;   // current consecutive blank-line count

  for (const line of lines) {
    if (line.trim() === '') {
      currentRun++;
    } else {
      if (currentRun >= BLANK_RUN_THRESHOLD) {
        blankRunCount++;
      }
      currentRun = 0;
    }
  }
  // Catch a run at the very end of the document
  if (currentRun >= BLANK_RUN_THRESHOLD) {
    blankRunCount++;
  }

  if (blankRunCount >= BLANK_RUN_COUNT_WARN) {
    issues.push({
      code: 'EXCESSIVE_WHITESPACE',
      severity: 'Warning',
      message:
        `${blankRunCount} large whitespace gap${blankRunCount === 1 ? '' : 's'} were detected in this document. ` +
        'This often indicates tables, text boxes, or graphics that did not extract as readable text. ' +
        'ATS systems may skip or mis-read content around these gaps. ' +
        'Avoid using tables, text boxes, or images to present resume content.',
    });
    deductions += 15;
  }

  // =========================================================================
  // Final score
  // Base: 100. Subtract all deductions. Clamp to [0, 100].
  // =========================================================================
  const finalScore = Math.min(100, Math.max(0, 100 - deductions));

  return { score: finalScore, issues };
}

module.exports = { checkFormatting };
