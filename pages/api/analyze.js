// pages/api/analyze.js
//
// Phase 2 Enhanced Analysis API Route
// Handles resume analysis with optional job description for semantic matching
// Uses the new Phase 2 scoring formula and intelligence engines

const { IncomingForm } = require('formidable');
const fs = require('fs');
const mammoth = require('mammoth');

const { checkParseability } = require('../../lib/parseabilityCheck');
const { checkStructure } = require('../../lib/structureCheck');
const { checkFormatting } = require('../../lib/formattingCheck');
const { checkContentQuality } = require('../../lib/contentQualityCheck');

// Disable Next.js default body parser so formidable can read the raw stream
export const config = {
  api: { bodyParser: false },
};

// Phase 2 scoring weights (new formula)
const WEIGHTS_V2 = {
  jd_match: 0.35,     // Job Description Match: 35%
  skills: 0.20,       // Skills: 20% 
  experience: 0.15,   // Experience: 15%
  projects: 0.10,     // Projects: 10%
  education: 0.10,    // Education: 10%
  grammar: 0.05,      // Grammar: 5%
  formatting: 0.05,   // Formatting: 5%
};

// Legacy Phase 1 weights (for backward compatibility)
const WEIGHTS_V1 = {
  parseability: 0.25,
  structure: 0.25,
  formatting: 0.25,
  contentQuality: 0.25,
};

// Error messages
const ERR = {
  METHOD_NOT_ALLOWED: 'Method not allowed',
  NO_FILE: 'No file uploaded',
  EMPTY_FILE: 'The uploaded file is empty.',
  INACCESSIBLE: 'The uploaded file could not be accessed.',
  PASSWORD_PROTECTED: 'This PDF is password-protected. Please remove the password and try again.',
  CORRUPTED: 'The file could not be parsed. It may be corrupted.',
  IMAGE_PDF: 'No text could be extracted from this PDF. It may be a scanned image. Please provide a text-based PDF.',
  EMPTY_DOCX: 'No text could be extracted from this DOCX file. The document appears to have no readable text content.',
  UNSUPPORTED_TYPE: 'Unsupported file type. Only PDF and DOCX files are accepted.',
  UNEXPECTED: 'An unexpected error occurred while processing the file.',
};

// PDF error classification (reused from Phase 1)
function classifyPdfError(err) {
  const msg = (err && err.message) ? err.message.toLowerCase() : '';
  const name = (err && err.name) ? err.name.toLowerCase() : '';

  if (
    msg.includes('encrypted') || msg.includes('password') || 
    msg.includes('pdfpassword') || name.includes('pdfpassword') ||
    msg.includes('cannot read encrypt') || msg.includes('requires a password')
  ) return 'password';

  if (
    msg.includes('bad xref') || msg.includes('invalid pdf') ||
    msg.includes('stream must have data') || msg.includes('unexpected eof') ||
    msg.includes('unexpectedeof') || msg.includes('end of file') ||
    msg.includes('malformed') || msg.includes('invalid object') ||
    msg.includes('invalid stream') || msg.includes('cannot read property') ||
    name.includes('rangeerror') || msg.includes('offset') || (err instanceof RangeError)
  ) return 'corrupted';

  return 'unknown';
}

// Extract PDF text (reused from Phase 1)
async function extractPdfText(file) {
  const pdfParse = require('pdf-parse');
  const buffer = await fs.promises.readFile(file.filepath);
  try {
    const data = await pdfParse(buffer);
    return { text: data.text, pageCount: data.numpages };
  } catch (err) {
    const kind = classifyPdfError(err);
    err._pdfKind = kind;
    throw err;
  }
}

// Extract DOCX text (reused from Phase 1)
async function extractDocxText(file) {
  const result = await mammoth.extractRawText({ path: file.filepath });
  return { text: result.value, pageCount: 1 };
}

// Phase 2: Job Description Matching Score
function calculateJdMatchScore(resumeText, jobDescription) {
  if (!jobDescription || !jobDescription.trim()) {
    return 70; // Default neutral score when no JD provided
  }

  const resumeLower = resumeText.toLowerCase();
  const jdLower = jobDescription.toLowerCase();

  // Extract keywords from job description
  const techKeywords = [
    'python', 'java', 'javascript', 'typescript', 'react', 'angular', 'vue',
    'nodejs', 'django', 'flask', 'spring', 'express', 'sql', 'mongodb',
    'aws', 'docker', 'kubernetes', 'git', 'api', 'html', 'css'
  ];

  const foundKeywords = techKeywords.filter(keyword => jdLower.includes(keyword));
  const matchingKeywords = foundKeywords.filter(keyword => resumeLower.includes(keyword));

  if (foundKeywords.length === 0) {
    return 70; // Neutral score if no tech keywords in JD
  }

  const matchPercentage = (matchingKeywords.length / foundKeywords.length) * 100;
  return Math.max(30, Math.min(100, Math.round(matchPercentage)));
}

// Phase 2: Skills Score
function calculateSkillsScore(resumeText) {
  const resumeLower = resumeText.toLowerCase();
  let score = 50; // Base score

  // Programming languages
  const languages = ['python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'php', 'ruby'];
  const langCount = languages.filter(lang => resumeLower.includes(lang)).length;
  score += Math.min(20, langCount * 4);

  // Frameworks/Technologies
  const frameworks = ['react', 'angular', 'vue', 'django', 'flask', 'spring', 'express'];
  const frameworkCount = frameworks.filter(fw => resumeLower.includes(fw)).length;
  score += Math.min(20, frameworkCount * 4);

  // Tools/Platforms
  const tools = ['git', 'docker', 'aws', 'kubernetes', 'jenkins', 'jira'];
  const toolCount = tools.filter(tool => resumeLower.includes(tool)).length;
  score += Math.min(10, toolCount * 2);

  return Math.max(0, Math.min(100, score));
}

// Phase 2: Experience Score  
function calculateExperienceScore(resumeText) {
  const resumeLower = resumeText.toLowerCase();
  let score = 30; // Base score

  // Experience indicators
  const expIndicators = ['years', 'experience', 'worked', 'managed', 'led', 'developed'];
  const expCount = expIndicators.filter(indicator => resumeLower.includes(indicator)).length;
  score += Math.min(25, expCount * 4);

  // Quantified achievements
  const achievementPatterns = [
    /\d+%/, // percentages
    /\d+\s*(million|thousand|k|m)\b/, // numbers with scale
    /\$\d+/, // monetary amounts
    /\d+\s*(users|customers|projects|team|people)/ // quantities
  ];

  let quantifiedCount = 0;
  for (const pattern of achievementPatterns) {
    if (pattern.test(resumeLower)) quantifiedCount++;
  }
  score += Math.min(25, quantifiedCount * 8);

  // Achievement verbs
  const achievementVerbs = ['achieved', 'improved', 'increased', 'reduced', 'optimized', 'delivered'];
  const verbCount = achievementVerbs.filter(verb => resumeLower.includes(verb)).length;
  score += Math.min(20, verbCount * 4);

  return Math.max(0, Math.min(100, score));
}

// Phase 2: Projects Score
function calculateProjectsScore(resumeText) {
  const resumeLower = resumeText.toLowerCase();
  let score = 40; // Base score

  // Project indicators
  const projectIndicators = ['project', 'built', 'created', 'developed', 'designed', 'implemented'];
  const projectCount = projectIndicators.filter(indicator => resumeLower.includes(indicator)).length;
  score += Math.min(30, projectCount * 5);

  // Technical project terms
  const techTerms = ['github', 'repository', 'api', 'database', 'frontend', 'backend'];
  const techCount = techTerms.filter(term => resumeLower.includes(term)).length;
  score += Math.min(30, techCount * 6);

  return Math.max(0, Math.min(100, score));
}

// Phase 2: Education Score
function calculateEducationScore(resumeText) {
  const resumeLower = resumeText.toLowerCase();
  let score = 50; // Base score

  // Degree indicators
  const degrees = ['bachelor', 'master', 'phd', 'degree', 'university', 'college'];
  const degreeCount = degrees.filter(degree => resumeLower.includes(degree)).length;
  if (degreeCount > 0) score += Math.min(30, degreeCount * 10);

  // Relevant fields
  const relevantFields = ['computer science', 'software engineering', 'information technology'];
  const fieldCount = relevantFields.filter(field => resumeLower.includes(field)).length;
  if (fieldCount > 0) score += 20;

  return Math.max(0, Math.min(100, score));
}

// Main API handler
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: ERR.METHOD_NOT_ALLOWED });
  }

  try {
    // Parse the multipart/form-data request
    const form = new IncomingForm({ keepExtensions: true });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const fileArray = files.resume;
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

    // Get job description from form fields
    const jobDescriptionArray = fields.jobDescription;
    const jobDescription = Array.isArray(jobDescriptionArray) 
      ? jobDescriptionArray[0] || '' 
      : jobDescriptionArray || '';

    // Get job title from form fields
    const jobTitleArray = fields.jobTitle;
    const jobTitle = Array.isArray(jobTitleArray)
      ? jobTitleArray[0] || ''
      : jobTitleArray || '';

    if (!file) {
      return res.status(400).json({ error: ERR.NO_FILE });
    }

    if (file.size === 0) {
      return res.status(422).json({ error: ERR.EMPTY_FILE });
    }

    try {
      await fs.promises.access(file.filepath, fs.constants.R_OK);
    } catch {
      return res.status(422).json({ error: ERR.INACCESSIBLE });
    }

    // Extract text based on MIME type (same as Phase 1)
    const mime = file.mimetype;
    let extractedText = '';
    let pageCount = 1;
    let fileType = 'pdf';

    if (mime === 'application/pdf') {
      fileType = 'pdf';
      let result;
      try {
        result = await extractPdfText(file);
      } catch (err) {
        if (err._pdfKind === 'password') {
          return res.status(422).json({ error: ERR.PASSWORD_PROTECTED });
        }
        if (err._pdfKind === 'corrupted') {
          return res.status(422).json({ error: ERR.CORRUPTED });
        }
        console.error('[analyze.js] PDF extraction error:', err);
        return res.status(422).json({ error: ERR.CORRUPTED });
      }

      extractedText = result.text;
      pageCount = result.pageCount;

      if (!extractedText || extractedText.trim() === '') {
        return res.status(422).json({ error: ERR.IMAGE_PDF });
      }
    } else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      fileType = 'docx';
      const result = await extractDocxText(file);
      extractedText = result.text;
      pageCount = result.pageCount;
      if (!extractedText || extractedText.trim() === '') {
        return res.status(422).json({ error: ERR.EMPTY_DOCX });
      }
    } else {
      return res.status(415).json({ error: ERR.UNSUPPORTED_TYPE });
    }

    // Determine analysis version based on whether job description is provided
    const hasJobDescription = jobDescription && jobDescription.trim().length > 10;
    const analysisVersion = hasJobDescription ? 'v2' : 'v1';

    let response;

    if (analysisVersion === 'v2') {
      // Phase 2: Enhanced Analysis with Job Description
      
      // Calculate Phase 2 category scores
      const jdMatchScore = calculateJdMatchScore(extractedText, jobDescription);
      const skillsScore = calculateSkillsScore(extractedText);
      const experienceScore = calculateExperienceScore(extractedText);
      const projectsScore = calculateProjectsScore(extractedText);
      const educationScore = calculateEducationScore(extractedText);

      // Use Phase 1 engines for grammar and formatting
      const contentQuality = checkContentQuality(extractedText);
      const formatting = checkFormatting(extractedText);
      
      const grammarScore = contentQuality.score;
      const formattingScore = formatting.score;

      // Calculate weighted overall score using Phase 2 formula
      const overallScore = Math.round(
        jdMatchScore * WEIGHTS_V2.jd_match +
        skillsScore * WEIGHTS_V2.skills +
        experienceScore * WEIGHTS_V2.experience +
        projectsScore * WEIGHTS_V2.projects +
        educationScore * WEIGHTS_V2.education +
        grammarScore * WEIGHTS_V2.grammar +
        formattingScore * WEIGHTS_V2.formatting
      );

      // Generate Phase 2 recommendations
      const recommendations = [];
      if (jdMatchScore < 70) recommendations.push("Tailor your resume more closely to the job description");
      if (skillsScore < 70) recommendations.push("Highlight more relevant technical skills");
      if (experienceScore < 70) recommendations.push("Add quantified achievements to your experience");
      if (projectsScore < 60) recommendations.push("Include more detailed project descriptions");
      if (grammarScore < 80) recommendations.push("Review resume for grammar and clarity");
      if (formattingScore < 80) recommendations.push("Improve ATS-friendly formatting");

      // Combine issues from Phase 1 engines
      const allIssues = [
        ...contentQuality.issues,
        ...formatting.issues,
      ];

      response = {
        version: '2.0',
        score: overallScore,
        hasJobDescription: true,
        jobTitle: jobTitle || 'Position',
        
        // Phase 2 category scores
        categoryScores: {
          jdMatch: jdMatchScore,
          skills: skillsScore,
          experience: experienceScore,
          projects: projectsScore,
          education: educationScore,
          grammar: grammarScore,
          formatting: formattingScore,
        },
        
        // Phase 2 score weights for transparency
        scoreWeights: {
          jdMatch: Math.round(WEIGHTS_V2.jd_match * 100),
          skills: Math.round(WEIGHTS_V2.skills * 100),
          experience: Math.round(WEIGHTS_V2.experience * 100),
          projects: Math.round(WEIGHTS_V2.projects * 100),
          education: Math.round(WEIGHTS_V2.education * 100),
          grammar: Math.round(WEIGHTS_V2.grammar * 100),
          formatting: Math.round(WEIGHTS_V2.formatting * 100),
        },
        
        recommendations: recommendations,
        issues: allIssues,
        text: extractedText,
      };

    } else {
      // Phase 1: Legacy Analysis (backward compatibility)
      
      // Run all four Phase 1 check engines
      const parseability = checkParseability(extractedText, { pageCount, fileType });
      const structure = checkStructure(extractedText);
      const formatting = checkFormatting(extractedText);
      const contentQuality = checkContentQuality(extractedText);

      // Weighted overall score (Phase 1 formula)
      const overallScore = Math.round(
        parseability.score * WEIGHTS_V1.parseability +
        structure.score * WEIGHTS_V1.structure +
        formatting.score * WEIGHTS_V1.formatting +
        contentQuality.score * WEIGHTS_V1.contentQuality
      );

      // Merge all issue lists
      const allIssues = [
        ...parseability.issues,
        ...structure.issues,
        ...formatting.issues,
        ...contentQuality.issues,
      ];

      response = {
        version: '1.0',
        score: overallScore,
        parseabilityScore: parseability.score,
        structureScore: structure.score,
        formattingScore: formatting.score,
        contentQualityScore: contentQuality.score,
        issues: allIssues,
        text: extractedText,
        hasJobDescription: false,
      };
    }

    return res.status(200).json(response);

  } catch (err) {
    console.error('[analyze.js] Unhandled error:', err);

    // Handle PDF errors that escaped earlier
    if (err._pdfKind === 'password' || (err.message && (
      err.message.toLowerCase().includes('encrypted') ||
      err.message.toLowerCase().includes('password') ||
      err.message.toLowerCase().includes('pdfpassword')
    ))) {
      return res.status(422).json({ error: ERR.PASSWORD_PROTECTED });
    }

    if (err._pdfKind === 'corrupted' || (err.message && (
      err.message.toLowerCase().includes('bad xref') ||
      err.message.toLowerCase().includes('invalid pdf') ||
      err.message.toLowerCase().includes('malformed') ||
      err.message.toLowerCase().includes('unexpected eof')
    ))) {
      return res.status(422).json({ error: ERR.CORRUPTED });
    }

    if (!res.headersSent) {
      return res.status(500).json({ error: ERR.UNEXPECTED });
    }
  }
}