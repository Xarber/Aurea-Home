// SPDX-License-Identifier: AGPL-3.0-only
import {test,expect} from '@playwright/test';
import {currentRelease} from '../src/releases/history';
test.use({serviceWorkers:'block'});

test('historical notes are directly addressable and keep publication provenance',async({page})=>{
  await page.goto('/?changelog=1.5.0');
  const panel=page.locator('#demo-panel-content');
  await expect(panel.getByRole('heading',{name:/1\.5\.0.*Beta/})).toBeVisible();
  await expect(panel.getByText('Fixes & Improvements',{exact:true})).toBeVisible();
  await expect(panel.getByRole('heading',{name:new RegExp(currentRelease.version.replaceAll('.','\\.'))})).toHaveCount(0);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  await expect(page).not.toHaveURL(/changelog=/);
  await page.goto('/?changelog=1.7.4');
  await expect(panel.getByRole('heading',{name:/1\.7\.4.*Reconstructed history/})).toBeVisible();
});

test('returning web user dismisses the bounded summary once per version',async({page,baseURL})=>{
  await page.route('https://aurea.xcenter.it/**',async route=>{
    const url=new URL(route.request().url());
    await route.fulfill({response:await route.fetch({url:baseURL+url.pathname+url.search})});
  });
  await page.addInitScript(()=>{
    if (localStorage.getItem('release-test-seeded')) return;
    localStorage.setItem('release-test-seeded','1');
    localStorage.setItem('aurea-web-entered','1');
    localStorage.setItem('aurea-web-introduction','1');
    localStorage.setItem('aurea.release.acknowledged','2.1.0');
  });
  await page.goto('https://aurea.xcenter.it/');
  await expect(page.getByRole('button',{name:`Full changelog ${currentRelease.version}`,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('aurea.release.acknowledged'))).toBe('2.1.0');
  await page.getByRole('button',{name:`Full changelog ${currentRelease.version}`,exact:true}).click();
  await expect(page).toHaveURL(`https://aurea.xcenter.it/?changelog=${currentRelease.version}`);
  expect(await page.evaluate(()=>localStorage.getItem('aurea.release.acknowledged'))).toBe(currentRelease.version);
  await page.goto('https://aurea.xcenter.it/');
  await expect(page.getByRole('button',{name:'About Aurea'})).toBeVisible();
  await expect(page.getByRole('button',{name:`Full changelog ${currentRelease.version}`,exact:true})).toHaveCount(0);
});
