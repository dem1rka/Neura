import { expect, test } from './workspace';
for(const width of [1440,390])test(`all redesigned routes fit at ${width}px`,async({page,workspace})=>{
 await page.setViewportSize({width,height:1000});
 await page.emulateMedia({reducedMotion:'reduce'});
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  localStorage.setItem('neura.preferences.v1',JSON.stringify({language:'ru',theme:'light'}));
 });
 await page.goto('/');
 workspace.questionnaire={answers:{},completedAt:'2026-10-30T10:00:00Z'};

 for(const route of ['/','/dashboard','/game','/game/report','/questionnaire','/questionnaire/teacher','/questionnaire/report','/mri','/about']){
  await page.goto(route);await expect(page.locator('h1').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route).toBe(true);
  await expect(page.getByRole('button',{name:'Меню',exact:true})).toBeVisible();
  if(route==='/'||route==='/game/report'||route==='/mri')await page.screenshot({path:`test-results/lab-${route.replaceAll('/','')||'home'}-${width}.png`,fullPage:route!=='/'});
 }
 expect(errors).toEqual([]);
});
test('menu supports navigation, Escape, dark theme and reduced motion',async({page,workspace})=>{
 await page.goto('/');
 const menu=page.getByRole('button',{name:'Меню',exact:true});await menu.click();
 await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();await expect(menu).toBeFocused();
 await menu.click();await page.getByRole('dialog').locator('a[href="/dashboard"]').click();await expect(page).toHaveURL(/dashboard$/);await expect(page.getByRole('dialog')).not.toBeVisible();
 await page.getByRole('button',{name:'Тёмная тема',exact:true}).first().click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/');
 expect(await page.locator('.lab-hero-copy').evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 await page.screenshot({path:'test-results/lab-dark.png'});
});
