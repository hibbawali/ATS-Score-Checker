// pages/upload.js
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_SIZE = 5 * 1024 * 1024;

function validateFile(file) {
  const errors = [];
  if (!ACCEPTED_TYPES.includes(file.type)) errors.push('Only PDF and DOCX files are accepted.');
  if (file.size > MAX_SIZE) errors.push('File must be 5 MB or smaller.');
  return errors;
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName]         = useState('');
  const [jobTitle, setJobTitle]         = useState('');
  const [errors, setErrors]             = useState([]);
  const [submitting, setSubmitting]     = useState(false);
  const [serverError, setServerError]   = useState('');
  const [dragOver, setDragOver]         = useState(false);
  const router = useRouter();

  function processFile(file) {
    if (!file) return;
    const validationErrors = validateFile(file);
    setErrors(validationErrors);
    setServerError('');
    if (validationErrors.length === 0) {
      setSelectedFile(file);
      setFileName(file.name);
    } else {
      setSelectedFile(null);
      setFileName('');
    }
  }

  function handleFileChange(e) { processFile(e.target.files?.[0]); }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    processFile(e.dataTransfer.files?.[0]);
  }

  async function handleSubmit() {
    if (!selectedFile) return;
    setSubmitting(true);
    setServerError('');
    try {
      const formData = new FormData();
      formData.append('resume', selectedFile);
      const response = await fetch('/api/parse', { method: 'POST', body: formData });
      const data = await response.json();
      if (!response.ok) {
        setServerError(data.error || 'Something went wrong. Please try again.');
        setSubmitting(false);
        return;
      }
      router.push({
        pathname: '/results',
        query: {
          score:               data.score,
          parseabilityScore:   data.parseabilityScore,
          structureScore:      data.structureScore,
          formattingScore:     data.formattingScore,
          contentQualityScore: data.contentQualityScore,
          issues:              JSON.stringify(data.issues),
          text:                data.text,
          jobTitle:            jobTitle.trim(),
        },
      });
    } catch {
      setServerError('Could not reach the server. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  const isDisabled = !selectedFile || errors.length > 0 || submitting;

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#f7f9fb] overflow-x-hidden"
      style={{ fontFamily: 'Inter, sans-serif' }}>
      <Head>
        <title>ResumeScore — Free ATS Resume Checker</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </Head>

      <div className="layout-container flex h-full grow flex-col">
        <div className="px-4 md:px-10 lg:px-20 flex flex-1 justify-center py-5">
          <div className="flex flex-col w-full max-w-[960px]">

            {/* Header */}
            <header className="flex items-center justify-between border-b border-[#c3c6d7] px-4 py-3 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 bg-[#004ac6] rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="text-[#191c1e] text-lg font-bold tracking-tight">ResumeScore</span>
              </div>
              <div className="inline-flex items-center gap-2 bg-[#dbe1ff] text-[#004ac6] text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-[#006c4a]" />
                SECURE AI UPLOAD
              </div>
            </header>

            {/* Hero */}
            <section className="text-center flex flex-col items-center py-10 px-4">
              <h1 className="text-4xl md:text-5xl font-black text-[#191c1e] mb-4 leading-tight tracking-tight">
                Optimize your resume for<br className="hidden md:block" /> the modern hiring process.
              </h1>
              <p className="text-[#434655] text-lg mb-10 max-w-xl leading-relaxed">
                Our AI analyzes your resume against real ATS algorithms to help you land the interview.
              </p>

              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={`relative w-full max-w-2xl bg-white border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer
                  ${dragOver ? 'border-[#004ac6] bg-[#dbe1ff]/10' : selectedFile ? 'border-[#006c4a] bg-[#82f5c1]/10' : 'border-[#c3c6d7] hover:border-[#004ac6]'}`}
              >
                <label htmlFor="resume-input" className="flex flex-col items-center gap-4 cursor-pointer w-full">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors
                    ${selectedFile ? 'bg-[#82f5c1]' : 'bg-[#eceef0]'}`}>
                    {selectedFile ? (
                      <svg className="w-8 h-8 text-[#006c4a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-[#004ac6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    )}
                  </div>
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="text-[#191c1e] font-bold text-lg">Ready to analyse</p>
                      <p className="text-[#006c4a] text-sm mt-1 font-medium">{fileName}</p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-[#191c1e] font-semibold text-lg">Drag and drop your resume</p>
                      <p className="text-[#434655] text-sm mt-1">PDF, DOCX up to 5 MB</p>
                    </div>
                  )}
                  <span className="inline-block bg-[#004ac6] text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-[#0053db] transition-colors shadow-lg shadow-[#004ac6]/20 mt-2">
                    Choose File
                  </span>
                </label>
                <input
                  id="resume-input" type="file" accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  aria-label="Upload your resume — PDF or DOCX, max 5 MB"
                />
              </div>

              {/* Job title input */}
              <div className="mt-6 w-full max-w-2xl">
                <label htmlFor="job-title" className="block text-sm font-semibold text-[#191c1e] mb-2">
                  Target Job Title
                  <span className="ml-2 text-xs font-normal text-[#737686]">(optional — improves AI analysis accuracy)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-[#737686]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round"
                        d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </div>
                  <input
                    id="job-title"
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Software Engineer, Data Analyst, Product Manager…"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#c3c6d7] bg-white text-sm text-[#191c1e] placeholder-[#737686]
                      focus:outline-none focus:ring-2 focus:ring-[#004ac6] focus:border-transparent transition-all"
                  />
                </div>
                {jobTitle.trim() && (
                  <p className="mt-1.5 text-xs text-[#006c4a] flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    AI will tailor keyword gaps and feedback specifically for <strong className="ml-1">{jobTitle.trim()}</strong> roles
                  </p>
                )}
              </div>

              {/* Validation errors */}
              {errors.length > 0 && (
                <div role="alert" className="mt-4 w-full max-w-2xl rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/20 px-4 py-3">
                  {errors.map((err, i) => (
                    <p key={i} className="text-sm text-[#93000a] font-medium">{err}</p>
                  ))}
                </div>
              )}

              {/* Server error */}
              {serverError && (
                <div role="alert" className="mt-4 w-full max-w-2xl rounded-xl bg-[#ffdad6] border border-[#ba1a1a]/20 px-4 py-3">
                  <p className="text-sm text-[#93000a] font-medium">{serverError}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={isDisabled}
                className="mt-6 flex items-center gap-2 px-10 py-4 bg-[#004ac6] text-white font-bold rounded-xl hover:bg-[#0053db] transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    Analysing…
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Check My Resume
                  </>
                )}
              </button>

              {/* Trust indicators */}
              <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-2xl">
                {[
                  { icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z', label: 'Data Privacy Secured' },
                  { icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', label: 'Results in Seconds' },
                  { icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941', label: 'ATS-Level Insights' },
                ].map(({ icon, label }) => (
                  <div key={label} className="flex items-center gap-2 justify-center text-[#434655]">
                    <svg className="w-5 h-5 text-[#006c4a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                    </svg>
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* How it Works */}
            <section className="bg-[#f2f4f6] border-y border-[#c3c6d7] py-10 mt-6 -mx-4 md:-mx-10 lg:-mx-20 px-4 md:px-10 lg:px-20">
              <div className="max-w-[960px] mx-auto">
                <h2 className="text-2xl font-bold text-[#191c1e] mb-6 text-center md:text-left">How it Works</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { step: '1', title: 'Upload', desc: 'Securely upload your resume in PDF or DOCX format. Your data is encrypted and never shared.', icon: 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5' },
                    { step: '2', title: 'Analyze', desc: 'Our AI-powered ATS checker scans for keywords, formatting, structure, and content impact metrics.', icon: 'M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z' },
                    { step: '3', title: 'Improve', desc: 'Get a detailed score and actionable suggestions to land more interviews.', icon: 'M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941' },
                  ].map(({ step, title, desc, icon }) => (
                    <div key={step} className="flex flex-col gap-4 rounded-xl border border-[#c3c6d7] bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="w-12 h-12 rounded-lg bg-[#dbe1ff] flex items-center justify-center text-[#004ac6]">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-[#191c1e] font-bold text-base mb-1">{step}. {title}</h3>
                        <p className="text-[#434655] text-sm leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#e0e3e5] border-t border-[#c3c6d7] py-8 px-4 md:px-20">
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
