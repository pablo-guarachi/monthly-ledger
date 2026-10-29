// Config plugin: sign release builds with the local keystore described in
// signing/keystore.properties (gitignored). Without that file the release
// build stays debug-signed, so a clean checkout still compiles.
const { withAppBuildGradle } = require('expo/config-plugins');

const SIGNING_CONFIG = `
        release {
            def keystoreProps = new Properties()
            def keystoreFile = rootProject.file('../signing/keystore.properties')
            if (keystoreFile.exists()) {
                keystoreFile.withInputStream { keystoreProps.load(it) }
                storeFile rootProject.file('../' + keystoreProps['storeFile'])
                storePassword keystoreProps['storePassword']
                keyAlias keystoreProps['keyAlias']
                keyPassword keystoreProps['keyPassword']
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes('keystoreProps')) return cfg; // already applied

    const debugBlock = /signingConfigs\s*\{\s*debug\s*\{[^}]*\}/;
    if (!debugBlock.test(gradle)) throw new Error('withReleaseSigning: signingConfigs.debug block not found');
    gradle = gradle.replace(debugBlock, (m) => m + SIGNING_CONFIG);

    gradle = gradle.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
      (m, head) =>
        `${head}signingConfig rootProject.file('../signing/keystore.properties').exists() ? signingConfigs.release : signingConfigs.debug`,
    );
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
