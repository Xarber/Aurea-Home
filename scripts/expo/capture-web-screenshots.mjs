// SPDX-License-Identifier: AGPL-3.0-only
import {chromium} from '@playwright/test';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const manifest = JSON.parse(await readFile(new URL('../../config/web-screenshots.json', import.meta.url)));
const [selection = 'all', output = 'build/web-screenshots'] = process.argv.slice(2);
const captures = manifest.filter(({id}) => selection === 'all' || id === selection);
if (!captures.length) throw new Error('Select all, home or remote.');
const base = process.env.DEMO_URL ?? 'http://127.0.0.1:8765';
const releaseResponse = await fetch(new URL('/release.json', base));
if (!releaseResponse.ok) throw new Error('The export must provide release.json.');
const {version, commit} = await releaseResponse.json();
const screenshots = [];
const browser = await chromium.launch({channel: process.env.CI ? 'chromium' : 'chrome'});
try {
  for (const {id, route, ready, width, height, platform, deviceClass, captureKind} of captures) {
    const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce', serviceWorkers: 'block'});
    try {
      await page.clock.setFixedTime(new Date(2026, 10, 16, 10, 9));
      await page.goto(new URL(route, base).href);
      await page.locator(ready).first().waitFor();
      if (id === 'home') await page.getByText('AUREA HOME · WEB PREVIEW', {exact: true}).waitFor({state: 'hidden'});
      await mkdir(output, {recursive: true});
      const filename = id + '.png';
      const image = await page.screenshot({path: resolve(output, filename), animations: 'disabled'});
      screenshots.push({id, route, width, height, filename, platform, deviceClass, captureKind, version, sourceCommit:commit, captureDate:new Date().toISOString().slice(0,10), sha256:createHash('sha256').update(image).digest('hex')});
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

await writeFile(resolve(output, 'capture-receipt.json'), JSON.stringify({version,commit,screenshots},null,2)+'\n');
