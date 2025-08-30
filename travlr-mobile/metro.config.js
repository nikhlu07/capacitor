const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Node.js polyfills for SignifyTS (custom crypto polyfill)
config.resolver.alias = {
  ...(config.resolver.alias || {}),
  'crypto': require.resolve('./src/crypto-polyfill.ts'),
  'stream': require.resolve('stream-browserify'),
  'buffer': require.resolve('buffer'),
  'process': require.resolve('process/browser'),
  'util': require.resolve('util'),
  'assert': require.resolve('assert'),
  'url': require.resolve('url'),
  'querystring': require.resolve('querystring-es3'),
};

// Add resolver configuration  
config.resolver.platforms = ['native', 'android', 'ios', 'web'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];

module.exports = config;
