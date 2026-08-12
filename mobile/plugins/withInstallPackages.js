const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withInstallPackages(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const permissions = manifest.manifest['uses-permission'] || [];
    const hasPermission = permissions.some(
      (p) => p.$?.['android:name'] === 'android.permission.REQUEST_INSTALL_PACKAGES'
    );
    if (!hasPermission) {
      permissions.push({ $: { 'android:name': 'android.permission.REQUEST_INSTALL_PACKAGES' } });
      manifest.manifest['uses-permission'] = permissions;
    }
    return config;
  });
};