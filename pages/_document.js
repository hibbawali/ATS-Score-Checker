import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* ── Page title & description ── */}
        <meta name="application-name" content="ResumeScore" />
        <meta name="description"
          content="Instantly check how well ATS systems can read your resume. Get a score, detailed issues, and actionable improvement tips." />

        {/* ── Favicon — SVG (modern browsers) ── */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

        {/* ── Fallback ICO for older browsers ── */}
        <link rel="shortcut icon" href="/favicon.ico" />

        {/* ── Apple touch icon ── */}
        <link rel="apple-touch-icon" href="/favicon.svg" />

        {/* ── Theme colour — matches the app gradient start ── */}
        <meta name="theme-color" content="#667eea" />

        {/* ── Open Graph (looks good when shared on Slack / LinkedIn) ── */}
        <meta property="og:type"        content="website" />
        <meta property="og:site_name"   content="ResumeScore" />
        <meta property="og:title"       content="ResumeScore — Free ATS Resume Checker" />
        <meta property="og:description" content="Upload your resume and instantly see how ATS systems read it. Get a detailed score and improvement tips." />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
