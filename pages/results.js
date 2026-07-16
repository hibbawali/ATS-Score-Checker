// pages/results.js
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Head from 'next/head';

// ─── Helpers ────────────────────────────────────────────────────────────────

function getScoreBand(score) {
  if (score >= 90) return { label: 'EXCELLENT',  ringColor: '#006c4a', badgeBg: 'bg-[#006c4a]', desc: 'Outstanding! Your resume is highly optimised for ATS systems.' };
  if (score >= 75) return { label: 'GOOD',        ringColor: '#004ac6', badgeBg: 'bg-[#004ac6]', desc: 'Good score. A few improvements could push you into the top tier.' };
  if (score >= 50) return { label: 'NEEDS WORK',  ringColor: '#824500', badgeBg: 'bg-[#824500]', desc: 'Your resume needs attention before it can pass most ATS filters.' };
  return             { label: 'POOR',             ringColor: '#ba1a1a', badgeBg: 'bg-[#ba1a1a]', desc: 'High risk of rejection. Critical issues are blocking your resume.' };
}

const SEVERITY_CONFIG = {
  Critical:   { order: 0, badgeBg: 'bg-[#ba1a1a]', cardBg: 'bg-[#ffdad6]/20', cardBorder: 'border-[#ba1a1a]/20', iconBg: 'bg-[#ba1a1a]', countLabel: 'Must Fix' },
  Warning:    { order: 1, badgeBg: 'bg-[#824500]', cardBg: 'bg-[#ffdcc3]/10', cardBorder: 'border-[#824500]/20', iconBg: 'bg-[#824500]', countLabel: 'Optimise' },
  Suggestion: { order: 2, badgeBg: 'bg-[#004ac6]', cardBg: 'bg-[#f2f4f6]',    cardBorder: 'border-[#c3c6d7]',    iconBg: 'bg-[#dbe1ff]', countLabel: 'Best Practice' },
};

const PRIORITY_CONFIG = {
  criticalIssues: { label: '🔴 Critical',        bg: 'bg-[#ffdad6]/30', border: 'border-[#ba1a1a]/30', iconBg: 'bg-[#ba1a1a]', badge: 'CRITICAL',  badgeBg: 'bg-[#ba1a1a]', showBA: true },
  highPriority:   { label: '🟠 High Priority',   bg: 'bg-[#ffdcc3]/20', border: 'border-[#824500]/20', iconBg: 'bg-[#824500]', badge: 'HIGH',      badgeBg: 'bg-[#824500]', showBA: true },
  mediumPriority: { label: '🟡 Medium Priority', bg: 'bg-[#fffbeb]',    border: 'border-[#f59e0b]/20', iconBg: 'bg-[#d97706]', badge: 'MEDIUM',    badgeBg: 'bg-[#d97706]', showBA: false },
  lowPriority:    { label: '🟢 Low Priority',    bg: 'bg-[#f0fdf4]',    border: 'border-[#006c4a]/20', iconBg: 'bg-[#006c4a]', badge: 'LOW',       badgeBg: 'bg-[#006c4a]', showBA: false },
};

const ATS_STATUS = {
  pass:    { icon: 'M5 13l4 4L19 7', color: 'text-[#006c4a]', bg: 'bg-[#dcfce7]', label: 'Pass' },
  fail:    { icon: 'M6 18L18 6M6 6l12 12', color: 'text-[#ba1a1a]', bg: 'bg-[#ffdad6]', label: 'Fail' },
  warning: { icon: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z', color: 'text-[#824500]', bg: 'bg-[#ffdcc3]', label: 'Warning' },
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function ScoreRing({ score, band }) {
  const r = 70, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="relative w-40 h-40 flex items-center justify-center flex-shrink-0">
      <svg width="160" height="160" aria-hidden="true">
        <circle cx="80" cy="80" r={r} fill="transparent" stroke="#e0e3e5" strokeWidth="12" />
        <circle cx="80" cy="80" r={r} fill="transparent" stroke={band.ringColor} strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-in-out', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black text-[#191c1e]">{score}</span>
        <span className="text-xs font-bold text-[#737686] uppercase tracking-widest mt-0.5">Score</span>
      </div>
    </div>
  );
}

function CategoryBar({ label, score }) {
  const pct = score ?? 0;
  const color = pct >= 75 ? '#006c4a' : pct >= 50 ? '#824500' : '#ba1a1a';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-[#434655]">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>{score != null ? score : '—'}</span>
      </div>
      <div className="w-full h-2 bg-[#e0e3e5] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 delay-300"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function IssueCard({ issue, config }) {
  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-5 space-y-3`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 ${config.iconBg} text-white rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#191c1e] text-sm leading-snug">{issue.title}</p>
          {issue.whyItHurts && (
            <p className="text-xs text-[#737686] mt-1.5">
              <span className="font-semibold text-[#ba1a1a]">Why it hurts: </span>{issue.whyItHurts}
            </p>
          )}
          {issue.howToFix && (
            <p className="text-xs text-[#434655] mt-1">
              <span className="font-semibold text-[#006c4a]">How to fix: </span>{issue.howToFix}
            </p>
          )}
        </div>
      </div>
      {config.showBA && issue.before && issue.after && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
          <div className="rounded-lg bg-[#ffdad6]/40 border border-[#ba1a1a]/20 px-3 py-2">
            <p className="text-xs font-bold text-[#ba1a1a] mb-1">Before</p>
            <p className="text-xs text-[#434655] italic">"{issue.before}"</p>
          </div>
          <div className="rounded-lg bg-[#82f5c1]/20 border border-[#006c4a]/20 px-3 py-2">
            <p className="text-xs font-bold text-[#006c4a] mb-1">After</p>
            <p className="text-xs text-[#434655]">"{issue.after}"</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionWrapper({ children, className = '' }) {
  return (
    <section className={`bg-white rounded-2xl border border-[#c3c6d7] shadow-sm p-6 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({ emoji, title, count, badgeBg }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {badgeBg && (
        <span className={`px-2 py-0.5 ${badgeBg} text-white text-xs font-black rounded uppercase tracking-tight`}>
          {emoji}
        </span>
      )}
      <h2 className="text-[#191c1e] text-lg font-bold">
        {!badgeBg && emoji && <span className="mr-1">{emoji}</span>}
        {title}
        {count != null && <span className="ml-2 text-sm font-normal text-[#737686]">({count})</span>}
      </h2>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <svg className="w-10 h-10 animate-spin text-[#004ac6]" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      <p className="text-[#434655] text-sm font-medium">Running AI analysis… this may take a few seconds</p>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter();

  // Scores & rule-based issues from query
  const [score, setScore]                         = useState(null);
  const [parseabilityScore, setParseabilityScore] = useState(null);
  const [structureScore, setStructureScore]       = useState(null);
  const [formattingScore, setFormattingScore]     = useState(null);
  const [contentQualityScore, setContentQualityScore] = useState(null);
  const [issues, setIssues]                       = useState([]);
  const [resumeText, setResumeText]               = useState('');

  // AI analysis
  const [analysis, setAnalysis]   = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState('');

  // Parse router.query once ready
  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query;
    setScore(q.score != null ? Number(q.score) : null);
    setParseabilityScore(q.parseabilityScore != null ? Number(q.parseabilityScore) : null);
    setStructureScore(q.structureScore != null ? Number(q.structureScore) : null);
    setFormattingScore(q.formattingScore != null ? Number(q.formattingScore) : null);
    setContentQualityScore(q.contentQualityScore != null ? Number(q.contentQualityScore) : null);
    try { setIssues(q.issues ? JSON.parse(q.issues) : []); } catch { setIssues([]); }
    setResumeText(q.text || '');
  }, [router.isReady, router.query]);

  // Fetch AI analysis once we have the resume text
  useEffect(() => {
    if (!resumeText) return;
    let cancelled = false;
    setAiLoading(true);
    setAiError('');
    fetch('/api/ai-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: resumeText, score }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then((data) => { if (!cancelled) setAnalysis(data); })
      .catch((err) => { if (!cancelled) setAiError(err.message || 'AI analysis failed. Please try again.'); })
      .finally(() => { if (!cancelled) setAiLoading(false); });
    return () => { cancelled = true; };
  }, [resumeText]);

  // Grouped rule-based issues
  const groupedIssues = issues.reduce((acc, issue) => {
    const sev = issue.severity || 'Suggestion';
    if (!acc[sev]) acc[sev] = [];
    acc[sev].push(issue);
    return acc;
  }, {});
  const sortedSeverities = Object.keys(groupedIssues).sort(
    (a, b) => (SEVERITY_CONFIG[a]?.order ?? 99) - (SEVERITY_CONFIG[b]?.order ?? 99)
  );

  const band = score != null ? getScoreBand(score) : null;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f8f9fc] overflow-x-hidden"
      style={{ fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>Analysis Result — ResumeScore</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
      </Head>

      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-5">
          <div className="flex flex-col w-full max-w-[960px] gap-6">

            {/* ── 1. Header ── */}
            <header className="flex items-center justify-between border-b border-[#c3c6d7] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-[#004ac6] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[#191c1e] text-lg font-bold tracking-tight">ResumeScore</span>
              </div>
              <button
                onClick={() => router.push('/upload')}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#c3c6d7] rounded-xl text-sm font-semibold text-[#004ac6] hover:bg-[#f2f4f6] transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Check Another Resume
              </button>
            </header>

            {/* ── 2. Title row ── */}
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-[#191c1e] tracking-tight">Analysis Result</h1>
              <p className="text-[#434655] text-base mt-1">Your resume has been scanned against real ATS algorithms. Here's the full breakdown.</p>
            </div>

            {/* ── 3. Score card ── */}
            {score != null && band && (
              <SectionWrapper>
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <ScoreRing score={score} band={band} />
                  <div className="flex-1 flex flex-col gap-4 w-full">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-3 py-1 ${band.badgeBg} text-white text-xs font-black rounded-full uppercase tracking-wider`}>
                        {band.label}
                      </span>
                      <p className="text-[#434655] text-sm">{band.desc}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                      <CategoryBar label="Parseability"     score={parseabilityScore} />
                      <CategoryBar label="Structure"        score={structureScore} />
                      <CategoryBar label="Formatting"       score={formattingScore} />
                      <CategoryBar label="Content Quality"  score={contentQualityScore} />
                    </div>
                  </div>
                </div>
              </SectionWrapper>
            )}

            {/* ── 4. Score projection ── */}
            {analysis?.estimatedScoreAfterFixes != null && score != null && (
              <div className="rounded-2xl border border-[#004ac6]/30 bg-[#dbe1ff]/30 px-6 py-4 flex flex-wrap items-center gap-3">
                <svg className="w-5 h-5 text-[#004ac6] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
                <span className="text-[#191c1e] font-semibold text-sm">
                  Score Projection:
                </span>
                <span className="text-[#434655] text-sm">
                  Current{' '}
                  <span className="font-bold text-[#191c1e]">{score}</span>
                  {' → '}
                  Estimated after fixes{' '}
                  <span className="font-bold text-[#006c4a]">{analysis.estimatedScoreAfterFixes}</span>
                </span>
              </div>
            )}

            {/* ── 5. Strengths ── */}
            {analysis?.strengths?.length > 0 && (
              <SectionWrapper>
                <SectionHeading emoji="✅" title="What's Working Well" count={analysis.strengths.length} />
                <ul className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-[#191c1e]">
                      <span className="w-5 h-5 bg-[#dcfce7] text-[#006c4a] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </SectionWrapper>
            )}

            {/* ── 6. ATS Compatibility Checks ── */}
            {analysis?.atsCompatibility?.length > 0 && (
              <SectionWrapper>
                <SectionHeading emoji="🤖" title="ATS Compatibility Checks" count={analysis.atsCompatibility.length} />
                <div className="divide-y divide-[#f2f4f6]">
                  {analysis.atsCompatibility.map((item, i) => {
                    const cfg = ATS_STATUS[item.status] || ATS_STATUS.warning;
                    return (
                      <div key={i} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.color} flex-shrink-0 mt-0.5`}>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                          </svg>
                          {cfg.label}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#191c1e]">{item.check}</p>
                          {item.detail && <p className="text-xs text-[#737686] mt-0.5">{item.detail}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionWrapper>
            )}

            {/* ── 7. Rule-based issues ── */}
            {issues.length > 0 && (
              <SectionWrapper>
                <SectionHeading emoji="📋" title="Detected Issues" count={issues.length} />
                <div className="space-y-6">
                  {sortedSeverities.map((sev) => {
                    const cfg = SEVERITY_CONFIG[sev] || SEVERITY_CONFIG.Suggestion;
                    return (
                      <div key={sev}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`px-2 py-0.5 ${cfg.badgeBg} text-white text-xs font-bold rounded uppercase`}>{sev}</span>
                          <span className="text-xs text-[#737686]">{groupedIssues[sev].length} issue{groupedIssues[sev].length !== 1 ? 's' : ''} — {cfg.countLabel}</span>
                        </div>
                        <div className="space-y-2">
                          {groupedIssues[sev].map((issue, i) => (
                            <div key={i} className={`rounded-xl border ${cfg.cardBorder} ${cfg.cardBg} px-4 py-3 flex items-start gap-3`}>
                              <div className={`w-7 h-7 ${cfg.iconBg} text-white rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5`}>
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#191c1e]">{issue.message}</p>
                                {issue.code && <p className="text-xs text-[#737686] mt-0.5">Code: {issue.code}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionWrapper>
            )}

            {/* ── 8. AI Priority Issues ── */}
            {(analysis?.criticalIssues?.length > 0 ||
              analysis?.highPriority?.length > 0 ||
              analysis?.mediumPriority?.length > 0 ||
              analysis?.lowPriority?.length > 0) && (
              <SectionWrapper>
                <SectionHeading emoji="🎯" title="AI-Powered Improvements" />
                <div className="space-y-8">
                  {['criticalIssues', 'highPriority', 'mediumPriority', 'lowPriority'].map((key) => {
                    const items = analysis[key];
                    if (!items || items.length === 0) return null;
                    const cfg = PRIORITY_CONFIG[key];
                    return (
                      <div key={key}>
                        <h3 className="text-base font-bold text-[#191c1e] mb-3">{cfg.label}</h3>
                        <div className="space-y-3">
                          {items.map((issue, i) => (
                            <IssueCard key={i} issue={issue} config={cfg} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </SectionWrapper>
            )}

            {/* ── 9. Rewrite Suggestions ── */}
            {analysis?.rewriteSuggestions?.length > 0 && (
              <SectionWrapper>
                <SectionHeading emoji="✏️" title="Rewrite Suggestions" count={analysis.rewriteSuggestions.length} />
                <div className="space-y-4">
                  {analysis.rewriteSuggestions.map((s, i) => (
                    <div key={i} className="rounded-xl border border-[#c3c6d7] bg-[#f8f9fc] p-4 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-lg bg-[#ffdad6]/30 border border-[#ba1a1a]/20 px-3 py-2.5">
                          <p className="text-xs font-bold text-[#ba1a1a] mb-1.5">Original</p>
                          <p className="text-xs text-[#434655] italic leading-relaxed">"{s.original}"</p>
                        </div>
                        <div className="rounded-lg bg-[#dcfce7]/50 border border-[#006c4a]/20 px-3 py-2.5">
                          <p className="text-xs font-bold text-[#006c4a] mb-1.5">Rewritten</p>
                          <p className="text-xs text-[#191c1e] leading-relaxed">"{s.rewritten}"</p>
                        </div>
                      </div>
                      {s.reason && (
                        <p className="text-xs text-[#737686] flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#004ac6] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round"
                              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                          </svg>
                          {s.reason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </SectionWrapper>
            )}

            {/* ── 10. Keyword Suggestions ── */}
            {analysis?.keywordSuggestions?.length > 0 && (
              <SectionWrapper>
                <SectionHeading emoji="🔑" title="Missing Keywords" count={analysis.keywordSuggestions.length} />
                <p className="text-sm text-[#434655] mb-4">Add these keywords to improve your match rate with job descriptions and ATS filters.</p>
                <div className="flex flex-wrap gap-2">
                  {analysis.keywordSuggestions.map((kw, i) => (
                    <div key={i} className="group relative">
                      <span className="inline-block px-3 py-1.5 bg-[#dbe1ff] text-[#004ac6] text-xs font-semibold rounded-full cursor-help hover:bg-[#004ac6] hover:text-white transition-colors">
                        {kw.keyword}
                      </span>
                      {kw.reason && (
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-[#191c1e] text-white text-xs rounded-lg px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                          {kw.reason}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#191c1e]" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </SectionWrapper>
            )}

            {/* ── 11. Top 5 Improvements ── */}
            {analysis?.topImprovements?.length > 0 && (
              <SectionWrapper>
                <SectionHeading emoji="🏆" title="Top Improvements by Impact" />
                <ol className="space-y-3">
                  {analysis.topImprovements.map((item, i) => (
                    <li key={i} className="flex items-start gap-4 rounded-xl border border-[#c3c6d7] bg-[#f8f9fc] px-4 py-3">
                      <span className="w-8 h-8 bg-[#004ac6] text-white text-sm font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        {item.rank || i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#191c1e]">{item.improvement}</p>
                        {item.impact && (
                          <p className="text-xs text-[#006c4a] font-medium mt-0.5 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                            </svg>
                            {item.impact}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </SectionWrapper>
            )}

            {/* ── 12. Recruiter Perspective ── */}
            {analysis?.recruiterFeedback && (
              <div className="rounded-2xl bg-[#191c1e] px-6 py-6 text-white">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-[#004ac6] rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#dbe1ff] uppercase tracking-wider mb-2">Recruiter Perspective</p>
                    <p className="text-sm text-[#e0e3e5] leading-relaxed">{analysis.recruiterFeedback}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── 13. AI loading / error state ── */}
            {aiLoading && (
              <SectionWrapper>
                <Spinner />
              </SectionWrapper>
            )}
            {aiError && !aiLoading && (
              <div className="rounded-2xl border border-[#ba1a1a]/30 bg-[#ffdad6]/30 px-5 py-4 flex items-start gap-3">
                <svg className="w-5 h-5 text-[#ba1a1a] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-[#93000a]">AI analysis unavailable</p>
                  <p className="text-xs text-[#737686] mt-0.5">{aiError}</p>
                </div>
              </div>
            )}

            {/* ── 14. CTA banner ── */}
            <div className="rounded-2xl bg-[#004ac6] px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-6 text-white">
              <div>
                <h2 className="text-xl font-black tracking-tight">Ready to land that interview?</h2>
                <p className="text-[#dbe1ff] text-sm mt-1">Apply the fixes above, then re-scan to see your improved score.</p>
              </div>
              <button
                onClick={() => router.push('/upload')}
                className="flex items-center gap-2 px-6 py-3 bg-white text-[#004ac6] font-bold rounded-xl hover:bg-[#f2f4f6] transition-colors shadow-md flex-shrink-0 text-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Scan Again
              </button>
            </div>

          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="bg-[#e0e3e5] border-t border-[#c3c6d7] py-8 px-4 md:px-20 mt-6">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#004ac6] rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm text-[#434655] font-medium">ResumeScore</span>
              <span className="text-sm text-[#737686]">· © 2025 All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-sm text-[#737686]">
              <a href="#" className="hover:text-[#004ac6] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#004ac6] transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-[#004ac6] transition-colors">Help Center</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
