import type { NextConfig } from "next";
import { REPO_BASE_PATH } from "./lib/basePath";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? REPO_BASE_PATH : "";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath,
};

export default nextConfig;
