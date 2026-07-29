# Project Blueprint — AI-Powered ATS Resume Analyzer & Career Assistant Platform

---

## 1. What We're Building

The project started as an **ATS Score Checker** — upload a resume, get a
score. It has since grown into an **AI-Powered ATS Resume Analyzer &
Career Assistant Platform** — not just scoring, but supporting the user's
entire job-seeking journey: resume improvement, cover letters, interview
prep, GitHub/LinkedIn review, and progress tracking.

**Scope note carried over from earlier discussion:** this is a large
vision. It is being built in phases — see Section 3 — so that a working
foundation exists before advanced features are added on top.

---

## 2. Overall User Flow

```
Open Website
  ↓
Signup / Login
  ↓
Dashboard
  ↓
Upload Resume
  ↓
Upload Job Description
  ↓
AI Analysis
  ↓
Results
  ↓
Improve Resume (AI Rewrite)
  ↓
Generate Cover Letter
  ↓
Prepare for Interview
  ↓
Save to History
  ↓
Apply for Job
```

Every feature below exists to support one step of this flow.

---

## 3. Phased Build Order

Building all of this at once is not realistic for one person/team.
Phases below are sequenced so each is tested before the next starts.

- **Phase 1 (current):** Auth, database, resume upload + parsing, security baseline — no analysis yet
- **Phase 2:** Job description parsing, semantic matching, ATS scoring engine
- **Phase 3:** Gemini-powered suggestions, AI resume rewrite
- **Phase 4:** Cover letter generator, interview question generator
- **Phase 5:** GitHub review, LinkedIn review, resume version history, skill gap roadmap
- **Phase 6:** User dashboard, recruiter dashboard, admin dashboard
- **Phase 7:** Notifications, settings page, API usage monitoring
- **Phase 8:** Scaling (Redis, Celery, queues, caching, load balancing)
- **Phase 9:** Production deployment (re-introduce containerization here)

---

## 4. Frontend (Next.js)

The user-facing part of the platform.

**Pages:** Home, About, Login, Register, Dashboard, Upload Resume,
Analysis, Resume Rewrite, Cover Letter, Interview Questions, History,
Settings.

Frontend does not calculate anything itself — it sends data to Django
and displays results.

---

## 5. Backend (Django) — Resume Intake (Phase 1)

When a user uploads a resume, Django validates it:
- Is the file a valid PDF or DOCX?
- Does it meet size limits?
- Does it pass malware/security scanning?

Only once validated does it proceed to parsing.

---

## 6. Resume Parser (Phase 1)

Extracts raw text and structure from the file using PyMuPDF (PDF) or
python-docx (DOCX), since AI can't read a PDF/DOCX file directly — it
needs plain text first.

Extracts: name, skills, education, experience, projects, certifications.

---

## 7. Text Cleaning (Phase 1)

Resumes often contain extra whitespace, stray symbols, and duplicate
blank lines after parsing. This step normalizes the extracted text before
anything else processes it, so later stages (AI, matching) aren't
confused by messy formatting artifacts.

---

## 8. Job Description Parser (Phase 2)

Extracts required skills/keywords from a pasted job description (e.g.
"React", "Next.js", "Docker", "Git") the same way the resume is parsed.

---

## 9. Semantic Matching — Sentence Transformers (Phase 2)

The core "smart" feature of the ATS engine. Plain keyword matching would
say "Frontend Development" (resume) doesn't match "React Development"
(job description) — different words. Sentence Transformers understand
these mean the same thing semantically, so the match isn't missed just
because the exact words differ.

---

## 10. ATS Scoring Engine (Phase 2)

Final formula (Version C — see the open item at the top of this doc):

| Category | Weight |
|---|---|
| JD Match | 35% |
| Skills | 20% |
| Experience | 15% |
| Projects | 10% |
| Education | 10% |
| Grammar | 5% |
| Formatting | 5% |

---

## 11. Gemini AI — Suggestions (Phase 3)

Gemini does not calculate the score — it generates suggestions based on
what the scoring engine found: missing keywords, weak experience
descriptions, grammar issues, missing quantified achievements.

Example: "Worked on website" → "Developed a responsive website that
improved loading speed by 25%."

---

## 12. AI Resume Rewrite (Phase 3)

User requests a full rewrite; Gemini improves grammar, professional tone,
ATS keyword alignment, and achievement phrasing across the whole resume.

---

## 13. AI Cover Letter Generator (Phase 4)

```
Resume + Job Description → Gemini → Personalized Cover Letter
```
Generated fresh per company/role, not a generic template.

---

## 14. Interview Question Generator (Phase 4)

```
Resume + Job Role → AI → Technical / JavaScript / HR / Behavioral Questions
```

---

## 15. GitHub Portfolio Review (Phase 5)

User provides a GitHub link. AI checks repositories, languages used,
project quality, and README completeness, then gives suggestions (e.g.
"README missing — add screenshots and a description").

---

## 16. LinkedIn Review (Phase 5)

AI checks headline, summary, skills, projects, and experience sections,
then gives suggestions.

---

## 17. Resume Version History (Phase 5)

Tracks resume versions over time (V1, V2, V3...) so the user can compare
changes and see improvement over time.

---

## 18. AI Skill Gap Roadmap (Phase 5)

```
Job requires Docker → Resume doesn't mention it
  ↓
AI suggests: learn Docker → build a project with it → add it to the resume
```

---

## 19. User Dashboard (Phase 6)

Shows: total uploads, best ATS score achieved, recent analyses, resume
versions, generated cover letters.

---

## 20. Recruiter Dashboard (Phase 6)

Recruiters can view: candidate, ATS score, top skills, weak areas, hiring
recommendation.

---

## 21. Admin Dashboard (Phase 6)

Admin manages: users, reports, feedback, analytics.

---

## 22. JWT Authentication (Phase 1)

```
Signup → Login → JWT Token issued → Protected Dashboard access → Logout
```
JWT acts as a digital ID card — once issued, it proves the user is
genuine on every subsequent request without re-entering credentials.

---

## 23. PostgreSQL (Phase 1)

All persistent data lives here: users, resumes, resume versions, scores,
cover letters, interview questions, history.

---

## 24. Security (Applies From Phase 1 Onward)

- JWT authentication
- Secure password hashing
- File validation (type, size, malware scan)
- SQL injection protection
- XSS protection
- CSRF protection
- Environment variables for all secrets (never hardcoded)

---

## 25. Scaling Features (Phase 8 — only after core product is stable)

- **Redis:** caches already-computed results so the AI isn't called
  repeatedly for the same input
- **Celery:** runs heavy AI tasks in the background so the user isn't
  stuck waiting on a blocking request
- **Queue:** processes many simultaneous uploads in order, rather than
  the system trying to handle them all at once
- **Cache:** avoids recalculating a result for a resume that hasn't changed
- **Load Balancer:** spreads traffic across multiple servers so no single
  server gets overloaded

**Reminder from earlier discussion:** caching and "not crashing under
load" are two different problems — caching saves cost/time on repeat
work, but doesn't by itself prevent the system from crashing under many
concurrent new users. Both are needed, not just one.

---

## 26. Notification System (Phase 7)

In-app notifications for: analysis completed, cover letter ready,
interview questions generated, resume rewrite finished. Email
notifications are future scope beyond this.

---

## 27. Settings Page (Phase 7)

User-managed: profile info, password change, dark/light mode, language,
AI preferences, notification preferences, account deletion.

---

## 28. API Usage Monitoring (Phase 7)

Tracks: number of AI requests (daily/monthly), error rate, approximate
API cost — important because Gemini API usage has real cost implications
at scale, and this needs visibility before costs become a surprise.

---

## 29. Project Folder Structure (Target)

```
frontend/
backend/
    authentication/
    users/
    resume/
    ats_engine/
    ai_engine/
    resume_parser/
    cover_letter/
    interview/
    github_review/
    linkedin_review/
    notifications/
    analytics/
    dashboard/
database/
tests/
documentation/
deployment/
scripts/
```
Each feature gets its own folder so the codebase stays maintainable as
features are added phase by phase.

---

## 30. Relationship to Other Project Docs
This blueprint expands on `project.md` with the detailed step-by-step
flow for each feature. Where the two differ (e.g. the scoring formula —
see the open item at the top), treat that as unresolved until explicitly
decided, not as this document silently overriding the other.
