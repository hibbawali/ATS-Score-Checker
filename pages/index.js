// pages/index.js
//
// Root page — redirects to /upload immediately.
// This keeps the app entry point clean without a separate landing page.

import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  // Redirect to the upload page as soon as the component mounts
  useEffect(() => {
    router.replace('/upload');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <p className="text-gray-400 text-sm">Redirecting…</p>
    </div>
  );
}
