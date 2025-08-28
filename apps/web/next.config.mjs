/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Handle sql.js on server side
      config.externals = config.externals || [];
      config.externals.push({
        'sql.js': 'commonjs sql.js',
      });
    }
    return config;
  },
};

export default nextConfig;
