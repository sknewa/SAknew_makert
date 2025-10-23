/**
 * Babel configuration for Expo React Native project
 * @param {Object} api - Babel API object
 * @returns {Object} Babel configuration
 */
module.exports = function(api) {
  api.cache(true);
  
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['@babel/plugin-transform-private-methods', { loose: true }],
    ],
  };
};