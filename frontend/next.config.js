/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable strict mode for better React practices
  reactStrictMode: true,
  
  // Server-side rendering enabled for dynamic routes
  
  // PWA configuration will be added later
  // using next-pwa package
  
  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'ConsultaMed',
  },
  
  // Image optimization for server-side rendering
  images: {
    domains: [],
  },
  
  // Redirect root to dashboard when authenticated
  async redirects() {
    return [];
  },
};

module.exports = nextConfig;
