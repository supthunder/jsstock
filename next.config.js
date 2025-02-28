/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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