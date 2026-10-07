/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-089947e59f664d87af4e61fa97456edd.r2.dev',
      },
    ],
  },
}

module.exports = nextConfig