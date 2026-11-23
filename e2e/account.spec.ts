// SPDX-License-Identifier: AGPL-3.0-only
import {test, expect} from '@playwright/test';

test.use({serviceWorkers:'block'});

test('hosted remote restores account settings and finds only approved TV fixtures',async({page,baseURL})=>{
 const origin='https://aurea.xcenter.it';
 const peer='11111111-2222-4333-8444-555555555555';
 await page.route(origin+'/**',async route=>{
  const {pathname,search}=new URL(route.request().url());
  if(pathname==='/account/session')return route.fulfill({json:{available:true,signedIn:true,name:'Test account'}});
  if(pathname==='/account/preferences')return route.fulfill({json:{revision:'1',preferences:{schema:1,view:'full',touchpad:true}}});
  if(pathname==='/account/invitations')return route.fulfill({json:{televisions:[{peer,label:'Approved TV'}]}});
  if(pathname.startsWith('/account/'))return route.fulfill({status:404});
  return route.fulfill({response:await route.fetch({url:new URL(pathname+search,baseURL).href})});
 });
 await page.goto(origin+'/?remote=1');
 await page.locator('[data-nav="phone-settings"]').click();
 await expect(page.getByText('X-Center ID',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Load settings backup'}).click();
 await expect(page.getByText('Saved layout full · Touchpad on')).toBeVisible();
 await page.getByRole('button',{name:'Restore saved settings'}).click();
 await expect(page.getByText('Settings restored on this device.')).toBeVisible();
 await page.getByRole('button',{name:'Find approved TVs'}).click();
 await expect(page.getByRole('button',{name:'Approved TV',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('aurea-remote-layout-v1')??'null'))).toMatchObject({view:'full',touchpad:true});
});
