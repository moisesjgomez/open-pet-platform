import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // For Azure Static Web Apps, we need to use static export
  // Comment out 'output' and 'images.unoptimized' if deploying to Vercel or platforms with full Next.js support
  output: 'export',
  
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com', // Allowing our mock images
      },
      {
        protocol: 'http',
        hostname: 'www.petharbor.com',
      },
      {
        protocol: 'https',
        hostname: 'www.petharbor.com',
      },
      {
        protocol: 'https',
        hostname: 'petharbor.com',
      },
    ],
  },
  trailingSlash: true, // Helps with routing on static hosts
};

export default nextConfig;
