module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Fix for TurboModule compatibility
      ['@babel/plugin-transform-private-methods', { loose: true }],
    ],
  };
};