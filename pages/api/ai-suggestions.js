// pages/api/ai-suggestions.js
//
// Enhanced AI-powered resume analysis endpoint.
// Returns a rich JSON object with prioritised issues, rewrite suggestions,
// keyword gaps, ATS compatibility checks, recruiter feedback, and more.
// Falls back to a rule-based engine if no AI key is configured.

const PROVIDER       = (process.env.AI_PROVIDER || 'rules').toLowerCase().trim();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const GEMINI_MODEL   = 'gemini-2.5-flash';
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const CLAUDE_MODEL   = 'claude-sonnet-4-5';
const CLAUDE_URL     = 'https://api.anthropic.com/v1/messages';
const CLAUDE_VERSION = '2023-06-01';
const TIMEOUT_MS     = 40_000; // longer timeout for rich analysis

// ---------------------------------------------------------------------------
// Gemini prompt — asks for the full structured JSON analysis
// ---------------------------------------------------------------------------
function buildPrompt(resumeText, jobTitle) {
  const jobContext = jobTitle
    ? `The candidate is targeting the role: "${jobTitle}". Tailor ALL feedback, keyword suggestions, and rewrite examples specifically for this role. Compare the resume against what a hiring manager for "${jobTitle}" positions would expect to see.`
    : `Infer the target role from the resume content and tailor feedback accordingly.`;

  return `You are an elite ATS resume analyst and professional resume coach with 15+ years of experience at top recruiting firms. You have reviewed over 50,000 resumes for FAANG, Fortune 500, and top consulting firms.

${jobContext}

Analyse the resume below with extreme precision. Your feedback must be:
- Directly tied to ACTUAL content found in this specific resume
- Highly specific — quote real phrases, job titles, companies, skills from the CV
- Actionable — tell exactly what to change and how
- Professional and encouraging in tone

Return ONLY a valid JSON object (no markdown, no extra text). Use this exact structure:

{
  "targetRole": <string — the role being targeted>,
  "estimatedScoreAfterFixes": <number 0-100>,
  "strengths": [<string>],
  "criticalIssues": [{"title": <string>, "whyItHurts": <string>, "howToFix": <string>, "before": <string>, "after": <string>}],
  "highPriority": [{"title": <string>, "whyItHurts": <string>, "howToFix": <string>, "before": <string>, "after": <string>}],
  "mediumPriority": [{"title": <string>, "whyItHurts": <string>, "howToFix": <string>}],
  "lowPriority": [{"title": <string>, "howToFix": <string>}],
  "topImprovements": [{"rank": <1-5>, "improvement": <string>, "impact": <string>}],
  "recruiterFeedback": <string 2-3 sentences>,
  "rewriteSuggestions": [{"original": <string>, "rewritten": <string>, "reason": <string>}],
  "keywordSuggestions": [{"keyword": <string>, "reason": <string>}],
  "atsCompatibility": [{"check": <string>, "status": "pass"|"fail"|"warning", "detail": <string>}]
}

RULES:
1. criticalIssues: ATS-breaking problems (missing contact, no dates, image-based content, encrypted). Max 3.
2. highPriority: Major content weaknesses (no metrics, weak bullets, missing summary, buzzwords). Max 4.
3. mediumPriority: Style and structure improvements. Max 4.
4. lowPriority: Polish items. Max 3.
5. topImprovements: The 5 highest-impact changes ranked 1 (highest) to 5.
6. rewriteSuggestions: Take ACTUAL weak bullets from the resume and rewrite them with STAR format + metrics. Min 2, max 4.
7. keywordSuggestions: Suggest 5-8 missing high-value ATS keywords specifically relevant to the target role. If job title is provided, use it to determine which keywords matter most.
8. atsCompatibility: Check for: missing email, missing phone, missing dates, no summary section, no experience section, no skills section, multi-column layout signals, tables/graphics indicators.
9. recruiterFeedback: Write as if you are a recruiter hiring for "${jobTitle || 'this role'}" seeing this resume for the first time. Be honest but constructive.
10. strengths: List 2-4 genuine strengths you found in this resume. Be specific, not generic.
11. targetRole: State the role being targeted (use provided job title if given, otherwise infer from resume).
12. NEVER invent information not present in the resume.
13. ALWAYS quote actual lines from the resume in before/after examples.

Resume text:
---
${resumeText.slice(0, 15000)}
---`;
}

// ---------------------------------------------------------------------------
// Default/fallback analysis structure when AI is unavailable
// ---------------------------------------------------------------------------
function getDefaultAnalysis() {
  return {
    estimatedScoreAfterFixes: null,
    strengths: [],
    criticalIssues: [],
    highPriority: [],
    mediumPriority: [],
    lowPriority: [],
    topImprovements: [],
    recruiterFeedback: '',
    rewriteSuggestions: [],
    keywordSuggestions: [],
    atsCompatibility: [],
  };
}

// ---------------------------------------------------------------------------
// Rule-based fallback engine — runs when no AI key is available
// ---------------------------------------------------------------------------
const WEAK_PHRASE_MAP = [
  { phrase: 'responsible for', verb: 'Led / Managed / Owned' },
  { phrase: 'duties included', verb: 'Delivered / Executed' },
  { phrase: 'helped with',     verb: 'Supported / Enabled' },
  { phrase: 'assisted with',   verb: 'Contributed to / Facilitated' },
  { phrase: 'worked on',       verb: 'Developed / Implemented' },
  { phrase: 'worked with',     verb: 'Collaborated with' },
  { phrase: 'involved in',     verb: 'Contributed to' },
  { phrase: 'tasked with',     verb: 'Delivered / Implemented' },
  { phrase: 'in charge of',    verb: 'Led / Directed / Oversaw' },
  { phrase: 'was responsible', verb: 'Led / Owned' },
  { phrase: 'familiar with',   verb: 'Proficient in / Applied' },
  { phrase: 'knowledge of',    verb: 'Applied / Built with' },
  { phrase: 'exposure to',     verb: 'Applied / Used' },
];

const BUZZWORDS = [
  'hardworking','team player','go-getter','self-starter','detail-oriented',
  'passionate','motivated','dynamic','synergy','proactive','results-driven',
  'thought leader','guru','ninja','rockstar',
];

const METRIC_RE = /\d+\s*(%|percent|x\b|\$|£|€|k\b|million|billion|thousand|users?|customers?|clients?|team|people|engineers?|projects?|hours?|days?|weeks?|months?|years?|leads?|sales?|revenue|saving)/i;

const ACTION_VERBS = new Set([
  'achieved','built','created','delivered','designed','developed','drove',
  'engineered','established','executed','generated','grew','implemented',
  'improved','increased','launched','led','optimised','optimized','produced',
  'reduced','saved','scaled','shipped','spearheaded','streamlined','transformed',
  'managed','directed','oversaw','deployed','automated','migrated','refactored',
  'integrated','configured','maintained','analysed','analyzed','presented',
  'trained','mentored','negotiated','coordinated','collaborated',
]);

function truncate(line, max = 70) {
  const clean = line.replace(/^[\•\-\*·▪▸◦›–○]\s*/, '').trim();
  return clean.length > max ? clean.slice(0, max - 1) + '…' : clean;
}

function getRuleBasedAnalysis(text) {
  const lower = text.toLowerCase();
  const lines  = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const bullets = lines.filter(l => /^[\•\-\*·▪▸◦›–○]\s+\S/.test(l));

  const result = getDefaultAnalysis();

  // --- Strengths ---
  if (/\d+\s*(%|percent|x\b|\$|k\b|users?|team|revenue)/i.test(text))
    result.strengths.push('Your resume contains some quantified achievements — this is a strong positive signal for ATS systems.');
  if (/\b(summary|profile|objective)\b/i.test(text))
    result.strengths.push('You have a professional summary section, which helps ATS systems categorise your profile quickly.');
  if (/@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(text))
    result.strengths.push('Contact information including an email address is present and machine-readable.');

  // --- Critical issues ---
  if (!/@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(text))
    result.criticalIssues.push({ title: 'Missing Email Address', whyItHurts: 'ATS systems cannot extract your contact details without a machine-readable email.', howToFix: 'Add your email address in plain text at the top of your resume.', before: '(no email found)', after: 'john.doe@gmail.com' });
  if (!/(\+?\d[\d\s\-().]{6,}\d)/.test(text))
    result.criticalIssues.push({ title: 'Missing Phone Number', whyItHurts: 'Recruiters and ATS systems need a phone number for contact extraction.', howToFix: 'Add a phone number in plain text format, e.g. +1 (555) 123-4567.', before: '(no phone found)', after: '+1 (555) 123-4567' });

  // --- High priority ---
  const weakMatches = WEAK_PHRASE_MAP.filter(({ phrase }) => lower.includes(phrase));
  if (weakMatches.length > 0) {
    const example = weakMatches[0];
    const exLine = lines.find(l => l.toLowerCase().includes(example.phrase));
    result.highPriority.push({
      title: 'Weak / Passive Phrases Detected',
      whyItHurts: `Phrases like "${example.phrase}" tell recruiters what your job description was, not what you accomplished. ATS scoring algorithms penalise passive language.`,
      howToFix: `Replace with strong action verbs: ${example.verb}. Focus on your contribution and outcome, not your duties.`,
      before: exLine ? truncate(exLine) : `"${example.phrase}..."`,
      after: `"${example.verb.split('/')[0].trim()} [specific outcome with measurable result]"`,
    });
  }

  if (bullets.length >= 4) {
    const unquantified = bullets.filter(l => !METRIC_RE.test(l));
    const ratio = unquantified.length / bullets.length;
    if (ratio > 0.5) {
      const exBullet = unquantified[0];
      result.highPriority.push({
        title: `${Math.round(ratio * 100)}% of Bullets Lack Measurable Results`,
        whyItHurts: 'Recruiters spend 6–8 seconds scanning a resume. Bullets without numbers are skipped. ATS systems rank resumes with quantified achievements higher.',
        howToFix: 'Add metrics to every bullet: team size, % improvement, revenue impact, time saved, users reached, accuracy, or throughput.',
        before: exBullet ? truncate(exBullet) : '(unquantified bullet)',
        after: `"${truncate(exBullet || '').split(' ').slice(0, 4).join(' ')} [X users / Y% improvement / $Z saved / N team members]"`,
      });
    }
  }

  if (!/\b(summary|objective|profile|about)\b/i.test(text)) {
    const topLines = lines.slice(0, 8);
    const role = topLines.find(l => /\b(developer|engineer|designer|manager|analyst|consultant|specialist)\b/i.test(l));
    result.highPriority.push({
      title: 'No Professional Summary Section',
      whyItHurts: 'Without a summary, ATS systems have no context for your profile. Recruiters cannot quickly assess your seniority or specialisation.',
      howToFix: 'Add a 2–3 line summary at the top describing your role, years of experience, key technologies, and biggest achievement.',
      before: '(no summary section found)',
      after: role ? `"${truncate(role, 30)} with X years of experience specialising in [key skill]. Delivered [top achievement]."`
                  : '"Experienced professional with X years in [field], specialising in [key skill]. Delivered [top achievement]."',
    });
  }

  // --- Buzzwords check ---
  const foundBuzz = BUZZWORDS.filter(w => lower.includes(w));
  if (foundBuzz.length >= 2) {
    const exLine = lines.find(l => l.toLowerCase().includes(foundBuzz[0]));
    result.mediumPriority.push({
      title: `Overused Buzzwords: "${foundBuzz.slice(0, 3).join('", "')}"`,
      whyItHurts: 'These words appear on 90%+ of resumes and add no differentiation. ATS systems and recruiters have learned to ignore them.',
      howToFix: 'Replace each buzzword with a concrete achievement that proves the trait.',
      before: exLine ? truncate(exLine) : `"${foundBuzz[0]}"`,
      after: `Instead of "${foundBuzz[0]}", show: "Led a cross-functional team of 6 to deliver [project] 2 weeks ahead of schedule."`,
    });
  }

  // --- Weak bullet openers ---
  if (bullets.length >= 3) {
    const weakOpeners = bullets.filter(l => {
      const first = l.replace(/^[\•\-\*·▪▸◦›–○]\s+/, '').split(/\s/)[0].toLowerCase();
      return !ACTION_VERBS.has(first);
    });
    if (weakOpeners.length / bullets.length > 0.4) {
      result.mediumPriority.push({
        title: `${weakOpeners.length} Bullets Don't Start With Action Verbs`,
        whyItHurts: 'Bullets not starting with action verbs read passively and score lower in ATS keyword matching.',
        howToFix: 'Start every bullet with a past-tense action verb: "Led", "Built", "Increased", "Reduced", "Deployed", "Designed".',
      });
    }
  }

  // --- Top improvements ---
  result.topImprovements = [
    { rank: 1, improvement: 'Add measurable metrics to every bullet point', impact: 'Can increase ATS score by 10–15 points and dramatically improve recruiter engagement' },
    { rank: 2, improvement: 'Replace passive phrases with strong action verbs', impact: 'Directly improves ATS keyword matching and readability score' },
    { rank: 3, improvement: 'Add a professional summary section', impact: 'Helps ATS categorise your profile and gives recruiters immediate context' },
    { rank: 4, improvement: 'Remove generic buzzwords and replace with evidence', impact: 'Differentiates you from 90% of candidates using the same words' },
    { rank: 5, improvement: 'Ensure all dates, contact info, and section headings are present', impact: 'Prevents automatic disqualification by ATS filters' },
  ];

  // --- Recruiter feedback ---
  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  result.recruiterFeedback = wordCount < 250
    ? 'As a recruiter, this resume feels incomplete. The limited content makes it difficult to assess your experience level or technical depth. Expanding each role with 3–5 strong, metric-driven bullets would significantly increase interview chances.'
    : foundBuzz.length >= 2
    ? `As a recruiter, this resume has the right structure but the language feels generic. Terms like "${foundBuzz.slice(0, 2).join('" and "')}" don't differentiate you. Replacing these with specific achievements and numbers would make this resume much more competitive.`
    : 'As a recruiter, this resume shows promise. The main opportunity is to strengthen the bullet points with measurable outcomes — specific numbers and results are what separate shortlisted candidates from the rest.';

  // --- ATS compatibility ---
  result.atsCompatibility = [
    { check: 'Email address', status: /@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(text) ? 'pass' : 'fail', detail: /@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/.test(text) ? 'Email found in plain text' : 'No email address detected' },
    { check: 'Phone number', status: /(\+?\d[\d\s\-().]{6,}\d)/.test(text) ? 'pass' : 'fail', detail: /(\+?\d[\d\s\-().]{6,}\d)/.test(text) ? 'Phone number found' : 'No phone number detected' },
    { check: 'Professional summary', status: /\b(summary|objective|profile|about)\b/i.test(text) ? 'pass' : 'warning', detail: /\b(summary|objective|profile|about)\b/i.test(text) ? 'Summary section found' : 'No summary section detected' },
    { check: 'Experience section', status: /\b(experience|employment|work history)\b/i.test(text) ? 'pass' : 'fail', detail: /\b(experience|employment|work history)\b/i.test(text) ? 'Experience section found' : 'No experience section heading detected' },
    { check: 'Education section', status: /\b(education|degree|university|college)\b/i.test(text) ? 'pass' : 'warning', detail: /\b(education|degree|university|college)\b/i.test(text) ? 'Education section found' : 'No education section detected' },
    { check: 'Skills section', status: /\b(skills|technologies|expertise|competencies)\b/i.test(text) ? 'pass' : 'warning', detail: /\b(skills|technologies|expertise|competencies)\b/i.test(text) ? 'Skills section found' : 'No skills section detected' },
    { check: 'Readable text (not image)', status: text.trim().length > 100 ? 'pass' : 'fail', detail: text.trim().length > 100 ? 'Text is machine-readable' : 'Very little text extracted — may be image-based' },
  ];

  // --- Keyword suggestions (generic based on common roles) ---
  const isDevRole = /\b(developer|engineer|software|frontend|backend|fullstack|python|javascript|react|node)\b/i.test(text);
  const isDataRole = /\b(data|analyst|machine learning|ml|ai|python|sql|tableau|power bi)\b/i.test(text);
  const isManagementRole = /\b(manager|director|lead|head of|vp|vice president)\b/i.test(text);

  if (isDevRole) {
    result.keywordSuggestions = [
      { keyword: 'Agile / Scrum', reason: 'Used in 78% of software job descriptions' },
      { keyword: 'CI/CD', reason: 'Highly valued for DevOps and engineering roles' },
      { keyword: 'REST API', reason: 'Core skill expected for most backend/fullstack roles' },
      { keyword: 'Git / Version Control', reason: 'Fundamental — often filtered by ATS' },
      { keyword: 'Unit Testing', reason: 'Demonstrates code quality awareness' },
    ];
  } else if (isDataRole) {
    result.keywordSuggestions = [
      { keyword: 'Statistical Analysis', reason: 'Core keyword for data analyst roles' },
      { keyword: 'Data Visualization', reason: 'Expected in most data roles' },
      { keyword: 'A/B Testing', reason: 'High-value signal for product/data roles' },
      { keyword: 'ETL Pipeline', reason: 'Common in data engineering job descriptions' },
      { keyword: 'Predictive Modeling', reason: 'Differentiator for ML/AI roles' },
    ];
  } else if (isManagementRole) {
    result.keywordSuggestions = [
      { keyword: 'P&L Management', reason: 'Expected for senior management roles' },
      { keyword: 'Stakeholder Management', reason: 'Key for director/VP level positions' },
      { keyword: 'OKR / KPI', reason: 'Shows strategic goal-setting experience' },
      { keyword: 'Cross-functional Leadership', reason: 'Differentiates senior leaders' },
      { keyword: 'Change Management', reason: 'High-value for transformation roles' },
    ];
  } else {
    result.keywordSuggestions = [
      { keyword: 'Project Management', reason: 'Appears in 60%+ of job descriptions' },
      { keyword: 'Stakeholder Communication', reason: 'Valued across all professional roles' },
      { keyword: 'Problem Solving', reason: 'Core competency keyword in ATS filters' },
      { keyword: 'Cross-team Collaboration', reason: 'Shows ability to work across departments' },
      { keyword: 'Process Improvement', reason: 'Signals initiative and business impact' },
    ];
  }

  // --- Rewrite suggestions ---
  const weakBullets = bullets.filter(l => !METRIC_RE.test(l)).slice(0, 2);
  result.rewriteSuggestions = weakBullets.map(bullet => ({
    original: truncate(bullet, 100),
    rewritten: `${truncate(bullet, 40).replace(/^[\•\-\*·▪▸◦›–○]\s*/, '')} — achieving [X% improvement / serving N users / saving $Y / completing in Z weeks]`,
    reason: 'Added measurable outcome using STAR format (Situation → Task → Action → Result)',
  }));

  if (result.rewriteSuggestions.length === 0) {
    result.rewriteSuggestions.push({
      original: 'Worked on machine learning model development',
      rewritten: 'Developed a spam classification model using Logistic Regression and Naive Bayes, achieving 97% accuracy on 10,000+ test samples',
      reason: 'Specific technologies + measurable outcome transforms a vague bullet into a strong achievement',
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Parse Gemini/Claude JSON response safely
// ---------------------------------------------------------------------------
function parseAnalysisJson(raw) {
  const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    const match = stripped.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object in AI response');
    parsed = JSON.parse(match[0]);
  }
  if (typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('AI response is not an object');
  return parsed;
}

// ---------------------------------------------------------------------------
// Gemini call
// ---------------------------------------------------------------------------
async function callGemini(resumeText, jobTitle) {
  const isOAuth = GEMINI_API_KEY && !GEMINI_API_KEY.startsWith('AIza');
  const url = isOAuth ? GEMINI_URL : `${GEMINI_URL}?key=${GEMINI_API_KEY}`;
  const headers = { 'Content-Type': 'application/json' };
  if (isOAuth) headers['Authorization'] = `Bearer ${GEMINI_API_KEY}`;

  const body = {
    contents: [{ parts: [{ text: buildPrompt(resumeText, jobTitle) }] }],
    generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body), signal: controller.signal });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Gemini timed out after ${TIMEOUT_MS / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(`Gemini API error ${response.status}: ${e?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!raw) throw new Error('Gemini returned empty response');
  return parseAnalysisJson(raw);
}

// ---------------------------------------------------------------------------
// Claude call
// ---------------------------------------------------------------------------
async function callClaude(resumeText, jobTitle) {
  const body = {
    model: CLAUDE_MODEL, max_tokens: 4096,
    messages: [{ role: 'user', content: buildPrompt(resumeText, jobTitle) }],
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response;
  try {
    response = await fetch(CLAUDE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': CLAUDE_API_KEY, 'anthropic-version': CLAUDE_VERSION },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`Claude timed out after ${TIMEOUT_MS / 1000}s`);
    throw err;
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(`Claude API error ${response.status}: ${e?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const raw = data?.content?.[0]?.text;
  if (!raw) throw new Error('Claude returned empty response');
  return parseAnalysisJson(raw);
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text, score, jobTitle } = req.body || {};
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "text" field.' });
  }

  const targetRole = (jobTitle && typeof jobTitle === 'string') ? jobTitle.trim() : '';

  try {
    let analysis;

    if (PROVIDER === 'gemini' && GEMINI_API_KEY) {
      try {
        analysis = await callGemini(text, targetRole);
      } catch (err) {
        console.warn('[ai-suggestions] Gemini failed, falling back to rule-based:', err.message);
        analysis = getRuleBasedAnalysis(text);
      }
    } else if (PROVIDER === 'claude' && CLAUDE_API_KEY) {
      try {
        analysis = await callClaude(text, targetRole);
      } catch (err) {
        console.warn('[ai-suggestions] Claude failed, falling back to rule-based:', err.message);
        analysis = getRuleBasedAnalysis(text);
      }
    } else {
      analysis = getRuleBasedAnalysis(text);
    }

    // Include the target role in the response so the UI can display it
    if (targetRole && !analysis.targetRole) analysis.targetRole = targetRole;

    return res.status(200).json({ ...analysis, currentScore: score || null });

  } catch (err) {
    console.error('[ai-suggestions] Unhandled error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred while generating analysis.' });
  }
}
