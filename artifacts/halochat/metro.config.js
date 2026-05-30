const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const pnpmStore = path.resolve(workspaceRoot, "node_modules/.pnpm");

const config = getDefaultConfig(projectRoot);

// Watch workspace + pnpm store so Metro can read files resolved via symlinks
config.watchFolders = [workspaceRoot, pnpmStore];

// Resolve packages from both node_modules locations
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Resolve pnpm symlinks to their real paths so Metro doesn't need to follow symlinks
const pnpmPackages = [
  "expo-notifications",
  "expo-secure-store",
  "expo-auth-session",
  "expo-web-browser",
  "expo-apple-authentication",
];
config.resolver.extraNodeModules = pnpmPackages.reduce((acc, pkg) => {
  const symlink = path.resolve(projectRoot, "node_modules", pkg);
  try {
    acc[pkg] = fs.realpathSync(symlink);
  } catch {
    // package not installed, skip
  }
  return acc;
}, {});

module.exports = config;
