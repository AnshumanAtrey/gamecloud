/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' makes the Docker image tiny; Vercel ignores it and uses its own adapter.
  output: 'standalone',
  reactStrictMode: true,
};

export default nextConfig;
