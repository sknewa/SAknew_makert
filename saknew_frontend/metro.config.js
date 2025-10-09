const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Fix for PlatformConstants TurboModule issue
config.resolver.platforms = ['ios', 'android', 'native', 'web'];
config.resolver.unstable_enableSymlinks = false;

module.exports = config;