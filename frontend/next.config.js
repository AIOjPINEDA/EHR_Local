/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode for better React practices
  reactStrictMode: true,
  
  // Output configuration for Render deployment
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  
  // PWA configuration will be added later
  // using next-pwa package
  
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'ConsultaMed',
  },
  
  // Optimize images - disable for static export
  images: {
    unoptimized: true,
    domains: [],
  },
  
  // Redirect root to dashboard when authenticated
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
