// pages/api/parse.js
//
// Next.js API route that receives a resume file upload (multipart/form-data),
// extracts plain text from PDF or DOCX files, runs all four check engines,
// and returns { score, issues, text, category scores } as JSON.
//
// Libraries used:
//   formidable v3  — multipart/form-data parsing
//   pdf-parse      — text extraction from PDF files
//   mammoth        — text extraction from DOCX files

const { IncomingForm } = require('formidable');
const fs       = require('fs');
const mammoth  = require('mammoth');

const { checkParseability }   = require('../../lib/parseabilityCheck');
const { checkStructure }      = require('../../lib/structureCheck');
const { checkFormatting }     = require('../../lib/formattingCheck');
const { checkContentQuality } = require('../../lib/contentQualityCheck');

// Disable Next.js default body parser so formidable can read the raw stream
export const config = {
  api: { bodyParser: false },
};

// ---------------------------------------------------------------------------
// Score weights — must sum to 1.0
//   Parseability  25% — can the ATS extract text at all?
//   Structure     25% — are sections, contact info, dates present?
//   Formatting    25% — does the layout extract cleanly?
//   ContentQuality 25% — are bullet points strong and quantified?
// ---------------------------------------------------------------------------
const WEIGHTS = {
  parseability:   0.25,
  structure:      0.25,
  formatting:     0.25,
  contentQuality: 0.25,
};

// Distinct error messages
const ERR = {
  METHOD_NOT_ALLOWED: 'Method not allowed',
  NO_FILE:            'No file uploaded',
  EMPTY_FILE:         'The uploaded file is empty.',
  INACCESSIBLE:       'The uploaded file could not be accessed.',
  PASSWORD_PROTECTED: 'This PDF is password-protected. Please remove the password and try again.',
  CORRUPTED:          'The file could not be parsed. It may be corrupted.',
  IMAGE_PDF:          'No text could be extracted from this PDF. It may be a scanned image. Please provide a text-based PDF.',
  EMPTY_DOCX:         'No text could be extracted from this DOCX file. The document appears to have no readable text content.',
  UNSUPPORTED_TYPE:   'Unsupported file type. Only PDF and DOCX files are accepted.',
  UNEXPECTED:         'An unexpected error occurred while processing the file.',
};

// ---------------------------------------------------------------------------
// PDF error classification
// pdf-parse throws a variety of error messages depending on the issue.
// We classify them here before propagating so the handler can respond
// with the correct specific message rather than a generic 500.
// ---------------------------------------------------------------------------

// Returns 'password' | 'corrupted' | 'unknown'
function classifyPdfError(err) {
  const msg = (err && err.message) ? err.message.toLowerCase() : '';
  const name = (err && err.name)    ? err.name.toLowerCase()    : '';

  // Password / encryption indicators
  if (
    msg.includes('encrypted')          ||
    msg.includes('password')           ||
    msg.includes('pdfpassword')        ||
    name.includes('pdfpassword')       ||
    msg.includes('cannot read encrypt')||
    msg.includes('requires a password')
  ) return 'password';

  // Corruption / structural damage indicators
  if (
    msg.includes('bad xref')           ||
    msg.includes('invalid pdf')        ||
    msg.includes('stream must have data') ||
    msg.includes('unexpected eof')     ||
    msg.includes('unexpectedeof')      ||
    msg.includes('end of file')        ||
    msg.includes('malformed')          ||
    msg.includes('invalid object')     ||
    msg.includes('invalid stream')     ||
    msg.includes('cannot read property') ||
    name.includes('rangeerror')        ||
    msg.includes('offset')             ||
    (err instanceof RangeError)
  ) return 'corrupted';

  return 'unknown';
}

// Extracts text from a PDF buffer using pdf-parse.
// Imported dynamically to avoid Vercel serverless startup issues with pdf-parse.
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

// Extracts raw text from a DOCX file using mammoth
async function extractDocxText(file) {
  const result = await mammoth.extractRawText({ path: file.filepath });
  return { text: result.value, pageCount: 1 };
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: ERR.METHOD_NOT_ALLOWED });
  }

  try {
    // Parse the multipart/form-data request
    const form = new IncomingForm({ keepExtensions: true });

    const [, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve([fields, files]);
      });
    });

    const fileArray = files.resume;
    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;

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

    // Extract text based on MIME type
    const mime = file.mimetype;
    let extractedText = '';
    let pageCount = 1;
    let fileType  = 'pdf';

    if (mime === 'application/pdf') {
      fileType = 'pdf';
      let result;
      try {
        result = await extractPdfText(file);
      } catch (err) {
        // Use the pre-classified kind attached by extractPdfText
        if (err._pdfKind === 'password') {
          return res.status(422).json({ error: ERR.PASSWORD_PROTECTED });
        }
        if (err._pdfKind === 'corrupted') {
          return res.status(422).json({ error: ERR.CORRUPTED });
        }
        // Unknown pdf-parse error — still a 422 (unprocessable) not a 500
        console.error('[parse.js] PDF extraction error:', err);
        return res.status(422).json({ error: ERR.CORRUPTED });
      }

      extractedText = result.text;
      pageCount     = result.pageCount;

      // Whitespace-only output = image/scanned PDF with no real text layer
      if (!extractedText || extractedText.trim() === '') {
        return res.status(422).json({ error: ERR.IMAGE_PDF });
      }
    } else if (
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      fileType = 'docx';
      const result = await extractDocxText(file);
      extractedText = result.text;
      pageCount     = result.pageCount;
      if (!extractedText || extractedText.trim() === '') {
        return res.status(422).json({ error: ERR.EMPTY_DOCX });
      }
    } else {
      return res.status(415).json({ error: ERR.UNSUPPORTED_TYPE });
    }

    // Run all four check engines
    const parseability    = checkParseability(extractedText, { pageCount, fileType });
    const structure       = checkStructure(extractedText);
    const formatting      = checkFormatting(extractedText);
    const contentQuality  = checkContentQuality(extractedText);

    // Weighted overall score (equal 25% each), rounded to nearest integer
    const overallScore = Math.round(
      parseability.score   * WEIGHTS.parseability   +
      structure.score      * WEIGHTS.structure      +
      formatting.score     * WEIGHTS.formatting     +
      contentQuality.score * WEIGHTS.contentQuality
    );

    // Merge all issue lists — order: Parseability → Structure → Formatting → Content
    const allIssues = [
      ...parseability.issues,
      ...structure.issues,
      ...formatting.issues,
      ...contentQuality.issues,
    ];

    return res.status(200).json({
      score:                overallScore,
      parseabilityScore:    parseability.score,
      structureScore:       structure.score,
      formattingScore:      formatting.score,
      contentQualityScore:  contentQuality.score,
      issues:               allIssues,
      text:                 extractedText,
    });

  } catch (err) {
    // Safety net for anything not already caught above (e.g. formidable parse errors,
    // unexpected check-engine crashes, etc.)
    console.error('[parse.js] Unhandled error:', err);

    // If a PDF error somehow escaped the inner try/catch, classify it now
    if (err._pdfKind === 'password' || (err.message && (
      err.message.toLowerCase().includes('encrypted') ||
      err.message.toLowerCase().includes('password')  ||
      err.message.toLowerCase().includes('pdfpassword')
    ))) {
      return res.status(422).json({ error: ERR.PASSWORD_PROTECTED });
    }

    if (err._pdfKind === 'corrupted' || (err.message && (
      err.message.toLowerCase().includes('bad xref')    ||
      err.message.toLowerCase().includes('invalid pdf') ||
      err.message.toLowerCase().includes('malformed')   ||
      err.message.toLowerCase().includes('unexpected eof')
    ))) {
      return res.status(422).json({ error: ERR.CORRUPTED });
    }

    if (!res.headersSent) {
      return res.status(500).json({ error: ERR.UNEXPECTED });
    }
  }
}
