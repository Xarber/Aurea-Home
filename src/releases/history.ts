// SPDX-License-Identifier: AGPL-3.0-only
import history from '../../assets/release-history.json';

export const releases = history.releases;
export const currentRelease = releases[0]!;
export type Release = typeof releases[number];

export function releaseFor(version: string | null | undefined) {
  return releases.find(release => release.version === version);
}

export function announcementFor(current: string, seen: string) {
  const release = releaseFor(current);
  const previous = releaseFor(seen);
  return release?.features.length && current !== seen && (!previous || previous.code < release.code)
    ? release
    : undefined;
}

export function releaseChanges(release: Release, full: boolean, since?: string) {
  const rows = release.features.map(feature => ({...feature}));
  if (!full && since) {
    const previous = releaseFor(since);
    if (previous) {
      for (const candidate of releases) {
        if (candidate.code >= release.code || candidate.code <= previous.code) continue;
        for (const feature of candidate.features) {
          if (!rows.some(row => row.label.en === feature.label.en)) rows.push(feature);
        }
        if (rows.length >= 3) break;
      }
    }
  }
  if (release.fixes.en && (full || rows.length < 3)) rows.push({
    icon: 'history',
    label: {en:'Fixes & Improvements',it:'Correzioni e miglioramenti'},
    detail: release.fixes,
  });
  return full ? rows : rows.slice(0,3);
}
