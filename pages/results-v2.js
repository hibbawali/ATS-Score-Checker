// pages/results-v2.js
// Enhanced results page for Phase 2 - handles both v1 and v2 analysis formats
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

function CategoryBar({ label, score, weight }) {
  const pct = score ?? 0;
  const color = pct >= 75 ? '#006c4a' : pct >= 50 ? '#824500' : '#ba1a1a';
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-[#434655]">
          {label}
          {weight && <span className="text-xs text-[#737686] ml-1">({weight}%)</span>}
        </span>
        <span className="text-sm font-bold" style={{ color }}>{score != null ? score : '—'}</span>
      </div>
      <div className="w-full h-2 bg-[#e0e3e5] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 delay-300"
          style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
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

function RecommendationCard({ recommendation, index }) {
  return (
    <div className="rounded-xl border border-[#c3c6d7] bg-[#f8f9fc] p-4 flex items-start gap-3">
      <span className="w-6 h-6 bg-[#004ac6] text-white text-xs font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        {index + 1}
      </span>
      <p className="text-sm text-[#191c1e] font-medium">{recommendation}</p>
    </div>
  );
}

function ComparisonBadge({ hasJobDescription }) {
  if (!hasJobDescription) return null;
  
  return (
    <div className="inline-flex items-center gap-2 bg-[#dcfce7] text-[#006c4a] text-sm font-semibold px-4 py-1.5 rounded-full">
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      Intelligent Job Matching Enabled
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ResultsPageV2() {
  const router = useRouter();
  
  const [analysisData, setAnalysisData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Parse router.query once ready
  useEffect(() => {
    if (!router.isReady) return;
    
    const q = router.query;
    
    // Determine analysis version
    const version = q.version || '1.0';
    const hasJobDescription = q.hasJobDescription === 'true';
    
    let data = {
      version,
      hasJobDescription,
      overall_score: q.score != null ? Number(q.score) : null,
      job_title: q.jobTitle || '',
      resume_text: q.text || '',
    };

    if (version === '2.0') {
      // Phase 2 format
      try {
        data.category_scores = q.categoryScores ? JSON.parse(q.categoryScores) : {};
        data.score_weights = q.scoreWeights ? JSON.parse(q.scoreWeights) : {};
        data.recommendations = q.recommendations ? JSON.parse(q.recommendations) : [];
        data.issues = q.issues ? JSON.parse(q.issues) : [];
      } catch (e) {
        console.error('Error parsing Phase 2 data:', e);
        data.category_scores = {};
        data.recommendations = [];
        data.issues = [];
      }
    } else {
      // Phase 1 format (backward compatibility)
      data.legacy_scores = {
        parseability: q.parseabilityScore != null ? Number(q.parseabilityScore) : null,
        structure: q.structureScore != null ? Number(q.structureScore) : null,
        formatting: q.formattingScore != null ? Number(q.formattingScore) : null,
        content_quality: q.contentQualityScore != null ? Number(q.contentQualityScore) : null,
      };
      
      try {
        data.issues = q.issues ? JSON.parse(q.issues) : [];
      } catch (e) {
        console.error('Error parsing Phase 1 issues:', e);
        data.issues = [];
      }
    }
    
    setAnalysisData(data);
    setIsLoading(false);
  }, [router.isReady, router.query]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fc]">
        <div className="text-center">
          <svg className="w-10 h-10 animate-spin text-[#004ac6] mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-[#434655] text-sm font-medium">Loading analysis results...</p>
        </div>
      </div>
    );
  }

  if (!analysisData || analysisData.overall_score == null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8f9fc]">
        <div className="text-center">
          <p className="text-[#ba1a1a] font-semibold mb-4">Analysis data not found</p>
          <button
            onClick={() => router.push('/upload')}
            className="px-6 py-3 bg-[#004ac6] text-white rounded-xl font-semibold hover:bg-[#0053db] transition-colors"
          >
            Start New Analysis
          </button>
        </div>
      </div>
    );
  }

  const band = getScoreBand(analysisData.overall_score);
  const isPhase2 = analysisData.version === '2.0';

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f8f9fc] overflow-x-hidden"
      style={{ fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>Analysis Result — ResumeScore {isPhase2 ? 'Pro' : ''}</title>
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
                <span className="text-[#191c1e] text-lg font-bold tracking-tight">
                  ResumeScore{isPhase2 && <span className="text-[#004ac6]"> Pro</span>}
                </span>
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
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl md:text-4xl font-black text-[#191c1e] tracking-tight">
                  {isPhase2 ? 'Intelligent Analysis' : 'Analysis Result'}
                </h1>
                {isPhase2 && (
                  <span className="px-2 py-1 bg-[#004ac6] text-white text-xs font-bold rounded-full uppercase tracking-wide">
                    Phase 2
                  </span>
                )}
              </div>
              <p className="text-[#434655] text-base">
                {isPhase2 
                  ? 'Your resume has been analyzed using our advanced AI-powered matching engine.'
                  : 'Your resume has been scanned against real ATS algorithms. Here\'s the full breakdown.'
                }
              </p>
              
              <div className="mt-3 flex flex-wrap gap-3">
                {analysisData.job_title && (
                  <div className="inline-flex items-center gap-2 bg-[#dbe1ff] text-[#004ac6] text-sm font-semibold px-4 py-1.5 rounded-full">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015-1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Target Role: {analysisData.job_title}
                  </div>
                )}
                <ComparisonBadge hasJobDescription={analysisData.hasJobDescription} />
              </div>
            </div>

            {/* ── 3. Score card ── */}
            <SectionWrapper>
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <ScoreRing score={analysisData.overall_score} band={band} />
                <div className="flex-1 flex flex-col gap-4 w-full">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`px-3 py-1 ${band.badgeBg} text-white text-xs font-black rounded-full uppercase tracking-wider`}>
                      {band.label}
                    </span>
                    <p className="text-[#434655] text-sm">{band.desc}</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                    {isPhase2 ? (
                      // Phase 2 category scores with weights
                      <>
                        <CategoryBar 
                          label="Job Description Match" 
                          score={analysisData.category_scores.jdMatch} 
                          weight={analysisData.score_weights.jdMatch}
                        />
                        <CategoryBar 
                          label="Skills" 
                          score={analysisData.category_scores.skills} 
                          weight={analysisData.score_weights.skills}
                        />
                        <CategoryBar 
                          label="Experience" 
                          score={analysisData.category_scores.experience} 
                          weight={analysisData.score_weights.experience}
                        />
                        <CategoryBar 
                          label="Projects" 
                          score={analysisData.category_scores.projects} 
                          weight={analysisData.score_weights.projects}
                        />
                        <CategoryBar 
                          label="Education" 
                          score={analysisData.category_scores.education} 
                          weight={analysisData.score_weights.education}
                        />
                        <CategoryBar 
                          label="Grammar" 
                          score={analysisData.category_scores.grammar} 
                          weight={analysisData.score_weights.grammar}
                        />
                        <CategoryBar 
                          label="Formatting" 
                          score={analysisData.category_scores.formatting} 
                          weight={analysisData.score_weights.formatting}
                        />
                      </>
                    ) : (
                      // Phase 1 legacy scores
                      <>
                        <CategoryBar label="Parseability" score={analysisData.legacy_scores.parseability} />
                        <CategoryBar label="Structure" score={analysisData.legacy_scores.structure} />
                        <CategoryBar label="Formatting" score={analysisData.legacy_scores.formatting} />
                        <CategoryBar label="Content Quality" score={analysisData.legacy_scores.content_quality} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </SectionWrapper>

            {/* ── 4. Phase 2 Features ── */}
            {isPhase2 && (
              <SectionWrapper>
                <SectionHeading emoji="✨" title="New Phase 2 Features" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-xl border border-[#006c4a]/20 bg-[#dcfce7]/30 p-4 text-center">
                    <div className="w-12 h-12 bg-[#006c4a] rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-[#191c1e] text-sm mb-1">Semantic Matching</h3>
                    <p className="text-xs text-[#434655]">AI understands meaning, not just keywords</p>
                  </div>
                  
                  <div className="rounded-xl border border-[#004ac6]/20 bg-[#dbe1ff]/30 p-4 text-center">
                    <div className="w-12 h-12 bg-[#004ac6] rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-[#191c1e] text-sm mb-1">Weighted Scoring</h3>
                    <p className="text-xs text-[#434655]">35% JD Match, 20% Skills, optimized formula</p>
                  </div>
                  
                  <div className="rounded-xl border border-[#d97706]/20 bg-[#fef3c7]/30 p-4 text-center">
                    <div className="w-12 h-12 bg-[#d97706] rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189l4.38-1.2a1.5 1.5 0 01.44 2.97l-3.29.89a6.01 6.01 0 01-2.78 0l-3.29-.89a1.5 1.5 0 01.44-2.97l4.38 1.2A6.01 6.01 0 0012 12.75zm0 0V9a2.25 2.25 0 114.5 0v.75a8.25 8.25 0 01-16.5 0V9a2.25 2.25 0 114.5 0v3.75z" />
                      </svg>
                    </div>
                    <h3 className="font-bold text-[#191c1e] text-sm mb-1">Smart Recommendations</h3>
                    <p className="text-xs text-[#434655]">Targeted suggestions based on job analysis</p>
                  </div>
                </div>
              </SectionWrapper>
            )}

            {/* ── 5. Recommendations ── */}
            {analysisData.recommendations?.length > 0 && (
              <SectionWrapper>
                <SectionHeading 
                  emoji={isPhase2 ? "🎯" : "💡"} 
                  title={isPhase2 ? "AI-Powered Recommendations" : "Improvement Recommendations"} 
                  count={analysisData.recommendations.length} 
                />
                <div className="space-y-3">
                  {analysisData.recommendations.map((rec, i) => (
                    <RecommendationCard key={i} recommendation={rec} index={i} />
                  ))}
                </div>
              </SectionWrapper>
            )}

            {/* ── 6. Issues ── */}
            {analysisData.issues?.length > 0 && (
              <SectionWrapper>
                <SectionHeading emoji="📋" title="Detected Issues" count={analysisData.issues.length} />
                <div className="space-y-3">
                  {analysisData.issues.map((issue, i) => (
                    <div key={i} className="rounded-xl border border-[#c3c6d7] bg-[#f8f9fc] px-4 py-3 flex items-start gap-3">
                      <div className="w-7 h-7 bg-[#824500] text-white rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round"
                            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#191c1e]">{issue.message}</p>
                        {issue.code && <p className="text-xs text-[#737686] mt-0.5">Code: {issue.code}</p>}
                        {issue.severity && <span className="inline-block mt-1 px-2 py-0.5 bg-[#824500] text-white text-xs font-bold rounded uppercase">{issue.severity}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </SectionWrapper>
            )}

            {/* ── 7. Version info ── */}
            <div className="text-center py-4">
              <p className="text-xs text-[#737686]">
                Analysis Version: {analysisData.version}
                {isPhase2 && (
                  <>
                    {' • '}
                    <span className="text-[#006c4a] font-semibold">Enhanced with AI-powered semantic matching</span>
                  </>
                )}
              </p>
            </div>

            {/* ── 8. CTA ── */}
            <SectionWrapper className="text-center">
              <div className="py-4">
                <h3 className="text-xl font-bold text-[#191c1e] mb-2">Ready to improve your resume?</h3>
                <p className="text-[#434655] mb-6">Use these insights to optimize your resume and increase your interview chances.</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button
                    onClick={() => router.push('/upload')}
                    className="px-6 py-3 bg-[#004ac6] text-white rounded-xl font-semibold hover:bg-[#0053db] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    Analyze Another Resume
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="px-6 py-3 bg-white border border-[#c3c6d7] text-[#004ac6] rounded-xl font-semibold hover:bg-[#f2f4f6] transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Save Report
                  </button>
                </div>
              </div>
            </SectionWrapper>

          </div>
        </div>
      </div>
    </div>
  );
}