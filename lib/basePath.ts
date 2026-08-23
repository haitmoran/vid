/**
 * GitHub Pages serves a project site from `/<repo>`, so the repository name is
 * baked into every absolute asset URL. Keeping it in one place means renaming
 * the repository is a single-line change instead of a hunt through the app,
 * the layout, the static routes and the Next.js config.
 */
export const REPO_BASE_PATH = "/k";

/** Empty for local development and any host that serves from the domain root. */
export const basePath =
  process.env.GITHUB_PAGES === "true" ? REPO_BASE_PATH : "";
