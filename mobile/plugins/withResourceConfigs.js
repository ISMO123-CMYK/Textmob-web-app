const { withAppBuildGradle } = require('@expo/config-plugins');

// Keep only English string resources. AndroidX / Play Services / Firebase ship
// ~80 locales, which is most of resources.arsc (~1.9 MB). The app is
// English-only (no i18n layer in src/), so every other locale is dead weight.
module.exports = function withResourceConfigs(config) {
  return withAppBuildGradle(config, (config) => {
    const src = config.modResults.contents;
    if (src.includes('resourceConfigurations')) return config;
    const patched = src.replace(
      /defaultConfig\s*\{/,
      'defaultConfig {\n    resourceConfigurations += ["en"]'
    );
    if (patched !== src) config.modResults.contents = patched;
    return config;
  });
};
