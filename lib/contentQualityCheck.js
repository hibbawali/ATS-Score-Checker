/**
 * lib/contentQualityCheck.js
 *
 * Pure rule engine for ATS Content Quality checks.
 * No external dependencies — only standard JS string/regex operations.
 * All checks are fully deterministic text-pattern matching. No AI/LLM calls.
 *
 * Three checks are implemented:
 *   1. Weak phrase detection       — scans for common weak/passive phrases that
 *      recruiters and ATS systems flag as low-impact, and suggests stronger
 *      action-verb alternatives for each phrase found
 *   2. Quantified achievements     — detects whether experience bullet points
 *      contain numbers, percentages, or measurable results; flags if more than
 *      half of experience bullets have zero quantifiable metrics
 *   3. Bullet point structure      — checks that bullets start with a strong
 *      action verb (not "I was…", "My role…", etc.) and are not excessively
 *      long (> 40 words), which makes them hard to scan
 *
 * @param {string} text - Plain-text content extracted from the resume.
 * @returns {{ score: number, issues: Array<{ code: string, severity: string, message: string }> }}
 */

// ---------------------------------------------------------------------------
// Scoring weights
// Base score starts at 100; deductions subtracted; result clamped to [0, 100].
//
//   WEAK_PHRASES          Warning    → −10 (flat, regardless of how many phrases found)
//   UNQUANTIFIED_BULLETS  Warning    → −20
//   WEAK_BULLET_STRUCTURE Suggestion → −10
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Check 1 helpers — Weak phrase detection
// ---------------------------------------------------------------------------

// Each entry maps a weak phrase (matched case-insensitively anywhere in the text)
// to a suggested stronger alternative action verb or rewrite hint.
// Phrases are ordered longest-first so more-specific matches take priority when
// iterating, even though we test all of them independently.
const WEAK_PHRASES = [
  { phrase: 'responsible for',    suggestion: 'e.g. "Led", "Owned", "Managed"'         },
  { phrase: 'duties included',    suggestion: 'e.g. "Delivered", "Executed", "Built"'  },
  { phrase: 'duties include',     suggestion: 'e.g. "Deliver", "Execute", "Build"'     },
  { phrase: 'job duties',         suggestion: 'describe accomplishments, not duties'    },
  { phrase: 'assisted with',      suggestion: 'e.g. "Supported", "Contributed to"'     },
  { phrase: 'helped with',        suggestion: 'e.g. "Facilitated", "Enabled"'          },
  { phrase: 'helped to',          suggestion: 'e.g. "Contributed to", "Enabled"'       },
  { phrase: 'worked on',          suggestion: 'e.g. "Developed", "Implemented"'        },
  { phrase: 'worked with',        suggestion: 'e.g. "Collaborated with", "Partnered"'  },
  { phrase: 'involved in',        suggestion: 'e.g. "Participated in", "Contributed"'  },
  { phrase: 'participated in',    suggestion: 'e.g. "Contributed to", "Supported"'     },
  { phrase: 'tasked with',        suggestion: 'e.g. "Delivered", "Implemented"'        },
  { phrase: 'in charge of',       suggestion: 'e.g. "Led", "Directed", "Oversaw"'      },
  { phrase: 'was responsible',    suggestion: 'e.g. "Led", "Owned", "Managed"'         },
  { phrase: 'have experience in', suggestion: 'show the experience, don\'t state it'   },
  { phrase: 'experience in',      suggestion: 'replace with a concrete achievement'    },
  { phrase: 'exposure to',        suggestion: 'e.g. "Applied", "Used", "Implemented"'  },
  { phrase: 'familiar with',      suggestion: 'e.g. "Proficient in", "Applied"'        },
  { phrase: 'knowledge of',       suggestion: 'e.g. "Applied", "Used", "Built with"'   },
];

// ---------------------------------------------------------------------------
// Check 2 helpers — Quantified achievements
// ---------------------------------------------------------------------------

// Matches numeric evidence in a bullet line:
//   - plain numbers: "5 engineers", "3 projects"
//   - percentages:   "20%", "20 percent"
//   - currency:      "$50K", "£1M", "€200"
//   - multipliers:   "2x", "10x"
//   - time savings:  "2 hours", "3 weeks"
// This regex intentionally casts a wide net — false positives (e.g. version
// numbers like "Python 3") are acceptable; the check only fires when the
// majority of bullets have NO match at all.
const METRIC_RE = /\d+\s*(%|percent|x\b|\$|£|€|k\b|m\b|bn\b|million|billion|thousand|users?|customers?|clients?|team|people|engineers?|developers?|members?|projects?|products?|apps?|services?|hours?|days?|weeks?|months?|years?|lines?|repos?|tickets?|issues?|bugs?|calls?|leads?|sales?|revenue|cost|saving)/i;

// ---------------------------------------------------------------------------
// Check 3 helpers — Bullet point structure quality
// ---------------------------------------------------------------------------

// Recognise lines that are bullet points.
// Supports common bullet characters and plain hyphen/asterisk starters.
const IS_BULLET_RE = /^[\•\-\*·▪▸◦›–○]\s+\S/;

// Patterns that indicate a bullet does NOT start with a strong action verb.
// We flag bullets beginning with first-person pronouns or possessives,
// or with explicitly weak openers.
const WEAK_OPENER_RE = /^[\•\-\*·▪▸◦›–○]\s+(i\s|i'|my\s|our\s|the\s|a\s|an\s|was\s|were\s|is\s|are\s|have\s|had\s|been\s|this\s|that\s)/i;

// Maximum word count for a single bullet before we flag it as too long.
// 40 words is a comfortable upper bound — beyond this, bullets become
// paragraphs and are hard for both humans and ATS systems to scan.
const MAX_BULLET_WORDS = 40;

// ---------------------------------------------------------------------------
// Helper: strip the leading bullet character from a line and return the text.
// ---------------------------------------------------------------------------
function bulletText(line) {
  return line.replace(/^[\•\-\*·▪▸◦›–○]\s+/, '').trim();
}

// ---------------------------------------------------------------------------
// Helper: count whitespace-delimited words in a string.
// ---------------------------------------------------------------------------
function wordCount(str) {
  return str.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

function checkContentQuality(text) {
  // --- Input coercion ---
  // Coerce non-string input to empty string so the function never throws.
  const safeText = typeof text === 'string' ? text : '';

  const issues = [];
  let deductions = 0;

  // Split into trimmed non-empty lines — reused across all checks.
  const nonEmptyLines = safeText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length > 0);

  // Identify all bullet lines once — reused by Checks 2 and 3.
  const bulletLines = nonEmptyLines.filter(l => IS_BULLET_RE.test(l));

  // =========================================================================
  // Check 1: Weak phrase detection
  //
  // Strategy: for each weak phrase in WEAK_PHRASES, search the full lowercased
  // text for an occurrence. Collect all matches, then emit one combined issue
  // listing every phrase found alongside its suggested alternative.
  //
  // We test the full text (not line-by-line) so we catch phrases that span
  // across word boundaries regardless of surrounding punctuation.
  //
  // Severity: Warning | Code: WEAK_PHRASES | Deduction: −10
  // =========================================================================

  const lowerText = safeText.toLowerCase();

  // Collect every weak phrase that actually appears in the text.
  const foundWeak = WEAK_PHRASES.filter(({ phrase }) => lowerText.includes(phrase));

  if (foundWeak.length > 0) {
    // Build a readable list: "responsible for" (try: "Led", "Owned", "Managed")
    const list = foundWeak
      .map(({ phrase, suggestion }) => `"${phrase}" (try: ${suggestion})`)
      .join('; ');

    issues.push({
      code: 'WEAK_PHRASES',
      severity: 'Warning',
      message:
        `Weak or passive phrases were detected: ${list}. ` +
        'Replace these with strong action verbs that show what you achieved, not just what you did. ' +
        'Strong openers like "Led", "Built", "Delivered", and "Increased" signal impact immediately.',
    });
    deductions += 10;
  }

  // =========================================================================
  // Check 2: Quantified achievements
  //
  // Strategy: look at all bullet lines for numeric/metric evidence using
  // METRIC_RE. Compute what fraction of bullets contain zero measurable
  // results. If more than half (> 50%) of bullets have no metrics, flag it.
  //
  // We only run this check when there are at least 4 bullet lines — fewer
  // than that is not enough data to judge a pattern.
  //
  // Severity: Warning | Code: UNQUANTIFIED_BULLETS | Deduction: −20
  // =========================================================================

  if (bulletLines.length >= 4) {
    const unquantifiedBullets = bulletLines.filter(l => !METRIC_RE.test(l));
    const unquantifiedRatio   = unquantifiedBullets.length / bulletLines.length;

    if (unquantifiedRatio > 0.5) {
      const pct = Math.round(unquantifiedRatio * 100);
      issues.push({
        code: 'UNQUANTIFIED_BULLETS',
        severity: 'Warning',
        message:
          `${pct}% of your bullet points appear to have no measurable results or numbers. ` +
          'ATS systems and recruiters look for quantified achievements such as percentages, ' +
          'team sizes, revenue figures, or time savings. ' +
          'Try adding metrics like "Increased throughput by 30%", "Led a team of 4", ' +
          'or "Reduced deployment time from 2 hours to 15 minutes".',
      });
      deductions += 20;
    }
  }

  // =========================================================================
  // Check 3: Bullet point structure quality
  //
  // Two sub-checks run on each bullet line:
  //
  //   Sub-check A — Weak opener: bullets that start with first-person pronouns
  //     ("I", "My", "Our"), articles ("The", "A", "An"), or state-of-being
  //     verbs ("Was", "Were", "Is") are not action-oriented and read passively.
  //     We count how many such bullets exist and flag if there are 2 or more.
  //
  //   Sub-check B — Overly long bullets: bullets exceeding MAX_BULLET_WORDS
  //     words are hard for humans and ATS systems to scan. We count how many
  //     such bullets exist and flag if there is at least 1.
  //
  // Both sub-checks emit separate issues with distinct codes so they can be
  // acted on independently.
  //
  // Severity: Suggestion | Codes: WEAK_BULLET_OPENER, LONG_BULLET_POINTS
  // Deduction: −10 total (split −5 / −5 if both fire)
  // =========================================================================

  // Sub-check A: weak openers
  const weakOpenerBullets = bulletLines.filter(l => WEAK_OPENER_RE.test(l));

  if (weakOpenerBullets.length >= 2) {
    issues.push({
      code: 'WEAK_BULLET_OPENER',
      severity: 'Suggestion',
      message:
        `${weakOpenerBullets.length} bullet point${weakOpenerBullets.length === 1 ? '' : 's'} ` +
        'start with a weak opener (e.g. "I", "My", "Was", "The"). ' +
        'Start each bullet with a past-tense action verb instead — ' +
        'for example: "Built", "Delivered", "Optimised", "Reduced", "Grew". ' +
        'Action-verb openers signal ownership and impact directly.',
    });
    deductions += 5;
  }

  // Sub-check B: overly long bullets
  const longBullets = bulletLines.filter(
    l => wordCount(bulletText(l)) > MAX_BULLET_WORDS
  );

  if (longBullets.length >= 1) {
    issues.push({
      code: 'LONG_BULLET_POINTS',
      severity: 'Suggestion',
      message:
        `${longBullets.length} bullet point${longBullets.length === 1 ? '' : 's'} ` +
        `exceed${longBullets.length === 1 ? 's' : ''} ${MAX_BULLET_WORDS} words, ` +
        'which makes them difficult to scan quickly. ' +
        'Keep bullets concise — aim for one clear action and one clear result per line, ' +
        'ideally under 20 words. Split long bullets into two shorter ones if needed.',
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

module.exports = { checkContentQuality };
