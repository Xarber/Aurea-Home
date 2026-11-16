// SPDX-License-Identifier: AGPL-3.0-only
export const repository = 'https://github.com/Xarber/Aurea-Home';
export const latestRelease = 'https://api.github.com/repos/Xarber/Aurea-Home/releases/latest';
const formats = [
  ['Android TV', 'APK', /^Aurea-Home-.+-android-universal-.+\.apk$/],
  ['Android phone', 'APK', /^Aurea-Remote-.+-android-phone-universal\.apk$/],
  ['iPhone and iPad', 'Unsigned IPA', /^Aurea-Remote-.+-ios-unsigned\.ipa$/],
] as const;

export function downloads(value: unknown) {
  if (!value || typeof value !== 'object') return [];
  const release = value as Record<string, unknown>;
  const tag = release.tag_name;
  if (typeof tag !== 'string' || !/^v\d+\.\d+\.\d+$/.test(tag) ||
      release.draft !== false || release.prerelease !== false ||
      typeof release.published_at !== 'string' || !Array.isArray(release.assets)) return [];
  return formats.flatMap(([platform, format, pattern]) => {
    const asset = release.assets instanceof Array && release.assets.find(item =>
      typeof item?.name === 'string' && item.name.includes(tag + '-') &&
      pattern.test(item.name) && item.state === 'uploaded' &&
      Number.isSafeInteger(item.size) && item.size > 0 &&
      item.browser_download_url === repository + '/releases/download/' + tag + '/' + item.name);
    return asset ? [{platform, format, version: tag, url: String(asset.browser_download_url), size: Number(asset.size)}] : [];
  });
}
