import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/Ludiq" : "";

const nextConfig: NextConfig = {
  // Static export only for GitHub Pages; local/Vercel need API routes (Privy profile).
  ...(isGitHubPages ? { output: "export" as const } : {}),
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  webpack: (config) => {
    // Privy optionally imports these; we don't use Stripe crypto or Farcaster Solana.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@stripe/crypto": false,
      "@farcaster/mini-app-solana": false,
    };
    return config;
  },
};

export default nextConfig;
