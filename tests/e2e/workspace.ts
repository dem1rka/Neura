import {resolve} from 'node:path';
import { test as base, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
export { expect, type Page };
export const test=base.extend<{workspace:Record<string,any>}>({
 workspace:async({},use)=>{await use({});},
 page:async({page,workspace},use)=>{
   await page.addInitScript(()=>sessionStorage.setItem('neura.activeParticipant','fixture'));
   await page.route('**/api/auth/me',r=>r.fulfill({json:{role:'specialist',id:'fixture',email:'test@example.invalid'}}));
   await page.route('**/api/participants/fixture/workspace',async r=>{
     if(r.request().method()==='POST'){const {key,value}=r.request().postDataJSON();workspace[key]=value;}
     await r.fulfill({json:{user:'fixture',values:workspace}});
   });
   await page.route('**/api/materials/demo/*',async r=>{const name=new URL(r.request().url()).pathname.split('/').pop();
     if(!['mprage.nii.gz','nyu-rest-demo.nii.gz'].includes(name!)) throw Error('Unexpected fixture');
     await r.fulfill({contentType:'application/octet-stream',body:await readFile(resolve(process.env.NEURA_DEMO_DIR!,name!))});
   });
   await use(page);
 }
});
