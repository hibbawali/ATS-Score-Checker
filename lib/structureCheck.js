/**
 * lib/structureCheck.js
 *
 * Pure rule engine for ATS Structure checks.
 * Takes the already-extracted resume text (string) and runs five checks:
 *   1. Standard section headers present
 *   2. Contact info present and machine-readable (name, email, phone)
 *   3. Experience entries in reverse-chronological order
 *   4. Missing dates on experience / education entries
 *   5. Consistent date format throughout
 *
 * No external dependencies — only standard JS string/regex operations.
 * Returns the same shape as parseabilityCheck: { score, issues }
 *
 * @param {string} text - Plain-text content extracted from the resume.
 * @returns {{ score: number, issues: Array<{ code: string, severity: string, message: string }> }}
 */

// ---------------------------------------------------------------------------
// Scoring weights
// Each check has a fixed deduction if it fires.
// Base score starts at 100; deductions are subtracted; result clamped to [0,100].
//
//   MISSING_KEY_SECTION   Critical  →  −15 per missing section (max 4 sections checked)
//   MISSING_CONTACT_FIELD Warning   →  −10 per missing contact field (name/email/phone)
//   NON_CHRONOLOGICAL     Warning   →  −15
//   MISSING_DATES         Warning   →  −10
//   INCONSISTENT_DATES    Suggestion → −5
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Check 1 helpers — Section header detection
// ---------------------------------------------------------------------------

// Each entry is one logical section. "patterns" lists every heading variant
// we accept (case-insensitive). We test each line of the resume against these.
const SECTION_DEFINITIONS = [
  {
    name: 'Contact',
    code: 'MISSING_SECTION_CONTACT',
    patterns: [
      /^contact(\s+info(rmation)?)?$/i,
      /^personal(\s+info(rmation)?)?$/i,
      /^about\s+me$/i,
    ],
    // Contact is often implied by the very first block of text (name + email line),
    // so we also detect it by the presence of contact fields — handled in Check 2.
    impliedByContactCheck: true,
  },
  {
    name: 'Summary / Objective',
    code: 'MISSING_SECTION_SUMMARY',
    patterns: [
      /^(professional\s+)?summary$/i,
      /^objective$/i,
      /^career\s+(objective|summary|profile)$/i,
      /^profile$/i,
      /^about$/i,
      /^overview$/i,
    ],
  },
  {
    name: 'Experience',
    code: 'MISSING_SECTION_EXPERIENCE',
    patterns: [
      /^(work\s+)?experience$/i,
      /^work\s+history$/i,
      /^employment(\s+history)?$/i,
      /^professional\s+experience$/i,
      /^career\s+history$/i,
      /^relevant\s+experience$/i,
    ],
  },
  {
    name: 'Education',
    code: 'MISSING_SECTION_EDUCATION',
    patterns: [
      /^education(al)?(\s+(background|history|qualifications))?$/i,
      /^academic(\s+(background|history))?$/i,
      /^qualifications?$/i,
      /^degrees?$/i,
    ],
  },
  {
    name: 'Skills',
    code: 'MISSING_SECTION_SKILLS',
    patterns: [
      /^(technical\s+|core\s+|key\s+|professional\s+)?skills?$/i,
      /^competenc(y|ies)$/i,
      /^expertise$/i,
      /^technologies$/i,
      /^tools(\s+&\s+technologies)?$/i,
    ],
  },
];

// ---------------------------------------------------------------------------
// Check 2 helpers — Contact info detection
// ---------------------------------------------------------------------------

// Email: standard RFC-5321 simplified pattern
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/;

// Phone: accepts formats like +1-800-555-0199, (800) 555-0199, 07911 123456, +44 7911 123456
const PHONE_RE = /(\+?\d[\d\s\-().]{6,}\d)/;

// Name: heuristic — look for two or more capitalised words on a line by themselves
// within the first 10 non-empty lines of the document (where the name usually appears).
const NAME_LINE_RE = /^[A-Z][a-zA-Z'\-]+(?:\s+[A-Z][a-zA-Z'\-]+){1,4}$/;

// ---------------------------------------------------------------------------
// Check 3 & 4 & 5 helpers — Date detection and parsing
// ---------------------------------------------------------------------------

// Matches a wide range of date tokens that appear in resume experience lines.
// We look for things like: "Jan 2022", "January 2022", "01/2022", "2022-01",
// "2022", "Present", "Current", "Now", "2022 – 2024", "Jan 2020 - Present"
//
// This regex matches a single date token (not a full range).
const DATE_TOKEN_RE =
  /(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4}|\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}|\d{4}|Present|Current|Now)/gi;

// Date range separator: dash, en-dash, em-dash, or "to"
const DATE_RANGE_SEP_RE = /\s*(?:–|—|-|to)\s*/i;

// Formats we can distinguish (used for consistency check)
function detectDateFormat(token) {
  if (/^(Present|Current|Now)$/i.test(token)) return 'open';
  if (/^[A-Za-z]+\s+\d{4}$/.test(token))      return 'month-name-year'; // "Jan 2022"
  if (/^\d{1,2}\/\d{4}$/.test(token))          return 'mm/yyyy';         // "01/2022"
  if (/^\d{4}\/\d{1,2}$/.test(token))          return 'yyyy/mm';         // "2022/01"
  if (/^\d{4}-\d{1,2}$/.test(token))           return 'yyyy-mm';         // "2022-01"
  if (/^\d{1,2}-\d{4}$/.test(token))           return 'mm-yyyy';         // "01-2022"
  if (/^\d{4}$/.test(token))                   return 'year-only';       // "2022"
  return 'unknown';
}

// Convert a date token to a numeric value (year * 12 + month) for comparison.
// Higher value = more recent. Returns null if unparseable.
// "Present" / "Current" / "Now" gets the maximum possible value so it sorts as newest.
function dateTokenToMonths(token) {
  if (/^(Present|Current|Now)$/i.test(token)) return 999999;

  // Named month + year: "Jan 2022"
  const namedMatch = token.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (namedMatch) {
    const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const m = monthNames.indexOf(namedMatch[1].toLowerCase().slice(0, 3));
    const y = parseInt(namedMatch[2], 10);
    if (m !== -1) return y * 12 + m;
  }

  // mm/yyyy or mm-yyyy
  const mSlashY = token.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (mSlashY) return parseInt(mSlashY[2], 10) * 12 + (parseInt(mSlashY[1], 10) - 1);

  // yyyy/mm or yyyy-mm
  const ySlashM = token.match(/^(\d{4})[\/\-](\d{1,2})$/);
  if (ySlashM) return parseInt(ySlashM[1], 10) * 12 + (parseInt(ySlashM[2], 10) - 1);

  // Year only: "2022"
  const yearOnly = token.match(/^(\d{4})$/);
  if (yearOnly) return parseInt(yearOnly[1], 10) * 12;

  return null; // unparseable
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

function checkStructure(text) {
  // --- Input coercion ---
  // If text is not a string, coerce to empty string.
  // All checks will then fire at the appropriate severity.
  const safeText = typeof text === 'string' ? text : '';

  const issues = [];
  let deductions = 0;

  // Split text into lines once — reused by all checks
  const lines = safeText.split(/\r?\n/);

  // Trim each line and filter out completely blank lines for header detection
  const nonEmptyLines = lines.map(l => l.trim()).filter(l => l.length > 0);

  // =========================================================================
  // Check 1: Standard section headers
  // Detects: whether each of the five expected resume sections has a clearly
  // labelled heading that an ATS can identify.
  // Severity: Critical | Code: MISSING_SECTION_<NAME>
  // Deduction: −15 per missing section
  // =========================================================================

  // Build a Set of section codes that ARE found, by testing every non-empty line
  // against every pattern in every section definition.
  const foundSectionCodes = new Set();

  for (const line of nonEmptyLines) {
    for (const section of SECTION_DEFINITIONS) {
      if (foundSectionCodes.has(section.code)) continue; // already found this one
      for (const pattern of section.patterns) {
        if (pattern.test(line)) {
          foundSectionCodes.add(section.code);
          break;
        }
      }
    }
  }

  // For each section NOT found, add an issue.
  // Contact section gets a pass if Check 2 finds contact fields (impliedByContactCheck).
  // We handle that after Check 2 runs — for now, track which sections are missing.
  const missingSections = SECTION_DEFINITIONS.filter(
    s => !foundSectionCodes.has(s.code)
  );

  // =========================================================================
  // Check 2: Contact info present and machine-readable
  // Detects: whether the resume contains a recognisable name, email address,
  // and phone number that an ATS can extract.
  // Severity: Warning | Code: MISSING_CONTACT_<FIELD>
  // Deduction: −10 per missing field
  // =========================================================================

  const hasEmail = EMAIL_RE.test(safeText);
  const hasPhone = PHONE_RE.test(safeText);

  // Name detection: check the first 10 non-empty lines for a "Firstname Lastname" pattern
  const hasName = nonEmptyLines
    .slice(0, 10)
    .some(line => NAME_LINE_RE.test(line));

  // Now resolve the Contact section: if we found email/phone/name, treat Contact as present
  // even if there's no explicit "Contact" heading (most resumes don't have one).
  const contactImplied = hasEmail || hasPhone || hasName;
  const missingSectionsFiltered = missingSections.filter(s => {
    if (s.impliedByContactCheck && contactImplied) return false; // don't flag Contact
    return true;
  });

  // Add section issues
  for (const section of missingSectionsFiltered) {
    issues.push({
      code: section.code,
      severity: 'Critical',
      message: `No "${section.name}" section heading was detected. ATS systems use section labels to categorise your resume content.`,
    });
    deductions += 15;
  }

  // Add contact field issues
  if (!hasEmail) {
    issues.push({
      code: 'MISSING_CONTACT_EMAIL',
      severity: 'Warning',
      message: 'No email address was detected. ATS systems and recruiters need a machine-readable email address to contact you.',
    });
    deductions += 10;
  }

  if (!hasPhone) {
    issues.push({
      code: 'MISSING_CONTACT_PHONE',
      severity: 'Warning',
      message: 'No phone number was detected. Including a phone number improves ATS contact extraction.',
    });
    deductions += 10;
  }

  if (!hasName) {
    issues.push({
      code: 'MISSING_CONTACT_NAME',
      severity: 'Warning',
      message: 'No name was detected at the top of the document. Make sure your full name appears clearly on the first line.',
    });
    deductions += 10;
  }

  // =========================================================================
  // Check 3: Reverse-chronological order in the Experience section
  // Detects: experience entries whose start dates are not in descending order
  // (i.e. most recent job listed last instead of first).
  // Severity: Warning | Code: NON_CHRONOLOGICAL_ORDER
  // Deduction: −15
  // =========================================================================

  // Strategy:
  //   1. Find the line index where the Experience section starts.
  //   2. Find the line index where the next major section starts (to bound the search).
  //   3. Within that block, extract lines that contain a date range (start – end).
  //   4. Parse the START date of each range into a numeric value.
  //   5. Check that the values are non-increasing (most recent first).

  // Find the Experience section boundary
  let expStartLine = -1;
  let expEndLine   = lines.length;

  for (let i = 0; i < nonEmptyLines.length; i++) {
    const line = nonEmptyLines[i];
    // Check if this line is the Experience section header
    const isExpHeader = SECTION_DEFINITIONS
      .find(s => s.code === 'MISSING_SECTION_EXPERIENCE')
      ?.patterns.some(p => p.test(line));
    if (isExpHeader && expStartLine === -1) {
      expStartLine = i;
      continue;
    }
    // Check if this line is ANY other major section header (signals end of Experience block)
    if (expStartLine !== -1) {
      const isOtherHeader = SECTION_DEFINITIONS
        .filter(s => s.code !== 'MISSING_SECTION_EXPERIENCE')
        .some(s => s.patterns.some(p => p.test(line)));
      if (isOtherHeader) {
        expEndLine = i;
        break;
      }
    }
  }

  if (expStartLine !== -1) {
    // Extract the Experience block lines
    const expLines = nonEmptyLines.slice(expStartLine + 1, expEndLine);

    // Collect start dates: for each line that contains a date range, grab the first date token
    const startDates = [];
    for (const line of expLines) {
      // A date range line typically looks like: "Jan 2020 – Present" or "2018 - 2020"
      // We require the separator to distinguish a range from a single date mention.
      const hasSeparator = DATE_RANGE_SEP_RE.test(line);
      const tokens = line.match(DATE_TOKEN_RE);
      if (tokens && tokens.length >= 1 && hasSeparator) {
        const startVal = dateTokenToMonths(tokens[0]);
        if (startVal !== null) {
          startDates.push(startVal);
        }
      }
    }

    // Check that start dates are non-increasing (most recent = highest value = first)
    let outOfOrder = false;
    for (let i = 1; i < startDates.length; i++) {
      if (startDates[i] > startDates[i - 1]) {
        outOfOrder = true;
        break;
      }
    }

    if (outOfOrder) {
      issues.push({
        code: 'NON_CHRONOLOGICAL_ORDER',
        severity: 'Warning',
        message: 'Your experience entries do not appear to be in reverse-chronological order (most recent first). Most ATS systems and recruiters expect the newest role at the top.',
      });
      deductions += 15;
    }
  }

  // =========================================================================
  // Check 4: Missing dates on experience / education entries
  // Detects: blocks of text under Experience or Education headings that
  // describe a role or degree but have no date token nearby.
  // Severity: Warning | Code: MISSING_DATES
  // Deduction: −10
  // =========================================================================

  // Strategy: find Experience and Education section blocks, then look for
  // "entry-like" lines (lines that look like job titles or degree names —
  // longer than 10 chars, not all-caps headers, not bullet points) and check
  // whether any date token appears within ±3 lines of each such line.
  // If more than one entry appears to have no date, flag it once.

  // Sections to check for missing dates
  const DATE_CHECK_SECTIONS = ['MISSING_SECTION_EXPERIENCE', 'MISSING_SECTION_EDUCATION'];

  // A line is "entry-like" if it's long enough to be a role/degree title
  // and doesn't look like a bullet point or a sub-heading
  function isEntryLike(line) {
    if (line.length < 10) return false;               // too short
    if (/^[\•\-\*\>\·▪▸◦]/.test(line)) return false; // bullet point
    if (/^\d+\./.test(line)) return false;            // numbered list
    if (line === line.toUpperCase()) return false;     // all-caps (likely a header)
    return true;
  }

  let missingDateCount = 0;

  for (const sectionCode of DATE_CHECK_SECTIONS) {
    // Find where this section starts and ends in nonEmptyLines
    let secStart = -1;
    let secEnd   = nonEmptyLines.length;

    const sectionDef = SECTION_DEFINITIONS.find(s => s.code === sectionCode);
    if (!sectionDef) continue;

    for (let i = 0; i < nonEmptyLines.length; i++) {
      const line = nonEmptyLines[i];
      const isThisHeader = sectionDef.patterns.some(p => p.test(line));
      if (isThisHeader && secStart === -1) {
        secStart = i;
        continue;
      }
      if (secStart !== -1) {
        const isOtherHeader = SECTION_DEFINITIONS
          .filter(s => s.code !== sectionCode)
          .some(s => s.patterns.some(p => p.test(line)));
        if (isOtherHeader) {
          secEnd = i;
          break;
        }
      }
    }

    if (secStart === -1) continue; // section not found — skip

    const sectionLines = nonEmptyLines.slice(secStart + 1, secEnd);

    // For each entry-like line, check if any date token appears within ±3 lines
    for (let i = 0; i < sectionLines.length; i++) {
      if (!isEntryLike(sectionLines[i])) continue;

      // Look in a window of ±3 lines around this line
      const windowStart = Math.max(0, i - 3);
      const windowEnd   = Math.min(sectionLines.length - 1, i + 3);
      const windowText  = sectionLines.slice(windowStart, windowEnd + 1).join(' ');

      const dateMatches = windowText.match(DATE_TOKEN_RE);
      if (!dateMatches || dateMatches.length === 0) {
        missingDateCount++;
      }
    }
  }

  if (missingDateCount > 0) {
    issues.push({
      code: 'MISSING_DATES',
      severity: 'Warning',
      message: `${missingDateCount} experience or education ${missingDateCount === 1 ? 'entry appears' : 'entries appear'} to be missing dates. ATS systems use dates to calculate your years of experience.`,
    });
    deductions += 10;
  }

  // =========================================================================
  // Check 5: Consistent date format throughout
  // Detects: resumes that mix date formats (e.g. "Jan 2022" in one place and
  // "01/2022" in another). ATS parsers can misread mixed formats.
  // Severity: Suggestion | Code: INCONSISTENT_DATE_FORMAT
  // Deduction: −5
  // =========================================================================

  // Collect all date tokens from the entire document and record their format type.
  // We ignore "open" tokens (Present/Current/Now) and "year-only" tokens since
  // those don't carry a format preference.
  const allTokens = safeText.match(DATE_TOKEN_RE) || [];
  const formatsSeen = new Set();

  for (const token of allTokens) {
    const fmt = detectDateFormat(token);
    if (fmt !== 'open' && fmt !== 'year-only' && fmt !== 'unknown') {
      formatsSeen.add(fmt);
    }
  }

  // If more than one non-trivial format is present, flag inconsistency
  if (formatsSeen.size > 1) {
    issues.push({
      code: 'INCONSISTENT_DATE_FORMAT',
      severity: 'Suggestion',
      message: `Multiple date formats were detected (${[...formatsSeen].join(', ')}). Using a single consistent format (e.g. "Jan 2022") helps ATS systems parse your timeline accurately.`,
    });
    deductions += 5;
  }

  // =========================================================================
  // Final score
  // Base: 100. Subtract all deductions. Clamp to [0, 100].
  // =========================================================================
  const finalScore = Math.min(100, Math.max(0, 100 - deductions));

  return { score: finalScore, issues };
}

module.exports = { checkStructure };
