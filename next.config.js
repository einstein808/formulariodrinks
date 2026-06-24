/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['react-icons', 'recharts']
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.gabryelamaro.com',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/portfolio',
        destination: '/',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
