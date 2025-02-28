/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Expose environment variables to the browser
  env: {
    POLYGON_API_KEY: process.env.POLYGON_API_KEY,
    ALPHA_VANTAGE_API_KEY: process.env.ALPHA_VANTAGE_API_KEY,
    FINNHUB_API_KEY: process.env.FINNHUB_API_KEY,
  },
  // Disable server-side WebSocket for development
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false, 
        tls: false,
        fs: false,
      };
    }
    return config;
  },
}

module.exports = nextConfig 