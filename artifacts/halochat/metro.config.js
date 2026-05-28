const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");
const fs = require("fs");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch the full workspace so Metro can access files in the pnpm store
config.watchFolders = [workspaceRoot];

// Resolve packages from both node_modules locations
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Resolve pnpm symlinks to their real paths so Metro doesn't need to follow symlinks
const pnpmPackages = ["expo-notifications", "expo-secure-store", "expo-auth-session", "expo-web-browser"];
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
