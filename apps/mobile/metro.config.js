// Learn more https://docs.expo.dev/guides/customizing-metro/
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Workspace packages export TS source written with NodeNext-style `./x.js` imports.
// Metro does not map them to `./x.ts`, so retry such imports without the extension.
const packagesDir = path.resolve(__dirname, '../../packages') + path.sep;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName.startsWith('.') &&
    moduleName.endsWith('.js') &&
    context.originModulePath.startsWith(packagesDir)
  ) {
    return context.resolveRequest(context, moduleName.slice(0, -'.js'.length), platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
