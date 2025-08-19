import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",              
        destination: `${process.env.NEXT_PUBLIC_API_SERVER_URL}/api/:path*`, 
        
      },
    ];
  },
};

export default nextConfig;
