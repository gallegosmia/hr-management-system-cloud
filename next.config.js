/** @type {import('next').NextConfig} */ // Touched to force reload
const withPWA = require('@ducanh2912/next-pwa').default({
    dest: 'public',
    cacheOnFrontEndNav: true,
    aggressiveFrontEndNavCaching: true,
    reloadOnOnline: true,
    swcMinify: true,
    disable: process.env.NODE_ENV === 'development',
    workboxOptions: {
        disableDevLogs: true,
    },
});
const enableChromeDevtoolsManifest =
    process.env.ENABLE_CHROME_DEVTOOLS_MANIFEST === 'true';

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
    async headers() {
        if (!enableChromeDevtoolsManifest) {
            return [];
        }

        return [
            {
                source: '/.well-known/appspecific/com.chrome.devtools.json',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Content-Type', value: 'application/json' },
                ],
            },
            {
                source: '/api/devtools',
                headers: [
                    { key: 'Access-Control-Allow-Origin', value: '*' },
                    { key: 'Content-Type', value: 'application/json' },
                ],
            }
        ];
    },
    async rewrites() {
        if (!enableChromeDevtoolsManifest) {
            return {
                beforeFiles: [],
            };
        }

        return {
            beforeFiles: [
                {
                    source: '/.well-known/appspecific/com.chrome.devtools.json',
                    destination: '/api/devtools',
                },
            ]
        };
    },
}

module.exports = withPWA(nextConfig);
