/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  reactStrictMode: true,
  // Prevent pdf-parse and formidable from being bundled by webpack —
  // they must run as native Node.js modules on the server.
  serverExternalPackages: ['pdf-parse', 'formidable'],
};

export default nextConfig;
