// SPDX-License-Identifier: AGPL-3.0-only
module.exports = process.env.AUREA_TARGET === 'remote' ? {} : {
  dependencies: {'react-native-webrtc': {platforms: {android: null, ios: null}}},
  project: {android: {sourceDir: __dirname, appName: 'app', packageName: 'io.github.jqssun.airplay'}},
};
