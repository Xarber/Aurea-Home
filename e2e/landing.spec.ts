// SPDX-License-Identifier: AGPL-3.0-only
import {test,expect} from '@playwright/test';
test.use({serviceWorkers:"block"});

test('hosted landing offers validated downloads and remembers entry',async({page,baseURL})=>{
  await page.setViewportSize({width:390,height:844});
  await page.route('https://aurea.xcenter.it/**', async route=>{
    const url=new URL(route.request().url());
    await route.fulfill({response:await route.fetch({url:baseURL+url.pathname+url.search})});
  });
  const name='Aurea-Remote-v2.1.0-main-f97f2ed-ios-unsigned.ipa';
  const tvApk='Aurea-Home-v2.1.0-android-universal-main-github-extended-f97f2ed.apk';
  const download='https://github.com/Xarber/Aurea-Home/releases/download/v2.1.0/'+name;
  await page.route('https://api.github.com/repos/Xarber/Aurea-Home/releases/latest',route=>route.fulfill({json:{
    tag_name:'v2.1.0',draft:false,prerelease:false,published_at:'2026-11-01',
    assets:[{name:tvApk,state:'uploaded',size:1048576,browser_download_url:'https://github.com/Xarber/Aurea-Home/releases/download/v2.1.0/'+tvApk},
      {name,state:'uploaded',size:1048576,browser_download_url:download},
      {name:'Aurea-Remote-v2.1.0-main-f97f2ed-android-phone-universal.apk',state:'uploaded',size:12,browser_download_url:'https://example.org/untrusted.apk'}],
  }}));
  await page.goto('https://aurea.xcenter.it/');
  await expect(page.getByRole('heading',{name:'A calmer home for your TV.'})).toBeVisible();
  await expect(page.getByRole('link',{name:/iPhone and iPad/})).toHaveAttribute('href',download);
  await expect(page.getByRole('link',{name:/Android phone/})).toHaveCount(0);
  const obtainium=page.getByRole('link',{name:/Add TV to Obtainium/});
  await expect(obtainium).toBeVisible();
  const deepLink=new URL((await obtainium.getAttribute('href'))!).searchParams.get('r')!;
  expect(JSON.parse(decodeURIComponent(deepLink.replace('obtainium://app/',''))).id).toBe('it.xarber.mitvhome');
  await expect(page.getByRole('link',{name:'Add to AltStore'})).toHaveAttribute('href',/altdirect\.app/);
  await page.getByRole('button',{name:'Open Web App'}).click();
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await page.getByRole('button',{name:'Get Started'}).click();
  await page.reload();
  await expect(page.getByRole('button',{name:'About Aurea'})).toBeVisible();
  await page.getByRole('button',{name:'About Aurea'}).click();
  await expect(page.getByRole('button',{name:'Open Web App'})).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('button',{name:'About Aurea'})).toBeVisible();
});

test('onboarding offers Back and Skip in a short viewport with enlarged text',async({page,baseURL})=>{
  await page.setViewportSize({width:640,height:340});
  await page.route('https://aurea.xcenter.it/**',async route=>{
    const url=new URL(route.request().url());
    await route.fulfill({response:await route.fetch({url:baseURL+url.pathname+url.search})});
  });
  await page.route('https://api.github.com/**',route=>route.fulfill({status:503}));
  await page.goto('https://aurea.xcenter.it/');
  await page.getByRole('button',{name:'Open Web App'}).click();
  await page.addStyleTag({content:'.aurea-tour p{font-size:1.5rem}'});
  await expect(page.getByRole('status',{name:''})).toHaveText('Step 1 of 2');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('status',{name:''})).toHaveText('Step 2 of 2');
  await page.getByRole('button',{name:'Back',exact:true}).click();
  await expect(page.getByRole('status',{name:''})).toHaveText('Step 1 of 2');
  await page.getByRole('button',{name:'Skip introduction'}).click();
  await expect(page.getByRole('button',{name:'About Aurea'})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'Skip introduction'})).toHaveCount(0);
});
