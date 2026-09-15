/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zyara/domain"],
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
