// saknew_frontend/babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Remove the 'module:react-native-dotenv' plugin entirely
    plugins: [], // Keep this empty if you don't have other plugins
  };
};