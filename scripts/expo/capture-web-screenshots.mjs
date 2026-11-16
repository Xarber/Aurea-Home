// SPDX-License-Identifier: AGPL-3.0-only
import {chromium} from '@playwright/test';
import {mkdir, readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const manifest = JSON.parse(await readFile(new URL('../../config/web-screenshots.json', import.meta.url)));
const [selection = 'all', output = 'build/web-screenshots'] = process.argv.slice(2);
const captures = manifest.filter(({id}) => selection === 'all' || id === selection);
if (!captures.length) throw new Error('Select all, home or remote.');
const browser = await chromium.launch({channel: process.env.CI ? 'chromium' : 'chrome'});
try {
  for (const {id, route, ready, width, height} of captures) {
    const page = await browser.newPage({viewport: {width, height}, reducedMotion: 'reduce', serviceWorkers: 'block'});
    try {
      await page.clock.setFixedTime(new Date(2026, 10, 16, 10, 9));
      await page.goto(new URL(route, process.env.DEMO_URL ?? 'http://127.0.0.1:8765').href);
      await page.locator(ready).first().waitFor();
      if (id === 'home') await page.getByText('AUREA HOME · WEB PREVIEW', {exact: true}).waitFor({state: 'hidden'});
      await mkdir(output, {recursive: true});
      await page.screenshot({path: resolve(output, id + '.png'), animations: 'disabled'});
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}
