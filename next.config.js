/** @type {import('next').NextConfig} */ // Touched to force reload
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        serverActions: {
            bodySizeLimit: '10mb',
        },
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
}

module.exports = nextConfig
