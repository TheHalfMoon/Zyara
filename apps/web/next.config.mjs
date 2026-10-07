const mapRendererCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "child-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zyara/domain"],
  async headers() {
    return [
      {
        source: "/:locale/map",
        headers: [{ key: "Content-Security-Policy", value: mapRendererCsp }],
      },
    ];
  },
  webpack: (config) => {
    // Resolve TypeScript-style ".js" relative imports inside workspace packages.
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return config;
  },
};
export default nextConfig;