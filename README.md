# ATS Resume Score Checker

A resume checker that tells you how well your resume will survive an ATS (Applicant Tracking System) — the software companies use to filter resumes before a human ever sees them.

## What it does

Upload a PDF or DOCX resume, and it runs the extracted text through a rule-based scoring engine — no AI involved in the scoring itself, so it's fully deterministic and free to run at any scale.

Right now it checks two things:

**Parseability** — can a machine actually read this file? Checks for:
- Whether text is extractable at all (catches scanned images with no real text)
- Text-to-page ratio (catches near-empty or graphics-heavy resumes)
- Garbled/encoding issues

**Structure** — is the resume organized the way ATS systems expect?
- Standard section headers present (Contact, Summary, Experience, Education, Skills)
- Contact info detectable (email, phone)
- Work history in reverse-chronological order
- Consistent date formatting throughout

Each category gets its own score, combined into an overall score with a plain-language label (Excellent / Good / Needs Work / Poor) and a list of specific issues found, ranked by severity.

## Tech stack

- **Next.js** (Pages Router) + React
- **Tailwind CSS**
- **pdf-parse** and **mammoth** for extracting text from PDF/DOCX
- **formidable** for handling file uploads
- No database — everything is processed in-memory per request, nothing is stored

## Why it's built this way

The scoring is intentionally rule-based instead of AI-powered. That was a deliberate choice: deterministic checks are predictable, explainable, and don't cost anything to run, no matter how many resumes get checked. If a resume gets flagged for a missing section, you know exactly why — there's no black box.


**Live demo:**
        https://ats-score-checker-cju9.vercel.app/upload

Built as part of my internship at Devonsite (thanks to Faiza Manzoor and Umer Sulehri for the project).
