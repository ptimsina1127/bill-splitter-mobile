const { withMainApplication } = require('@expo/config-plugins');

module.exports = function fixBundlePathPlugin(config) {
  return withMainApplication(config, (config) => {
    config.modResults.contents = config.modResults.contents
      .replace(
        /\.expo\/\.virtual-metro-entry/,
        'index.android'
      );
    return config;
  });
};
