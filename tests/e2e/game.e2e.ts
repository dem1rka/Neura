import { test, expect } from './workspace';
import { party, support, finalItems } from '../../src/features/game/party';
async function start(page: import('@playwright/test').Page){await page.goto('/game');await page.getByRole('button',{name:'Начать приключение',exact:false}).click();}
async function reveal(page:import('@playwright/test').Page,i:number){await page.getByRole('button',{name:party[i].trigger,exact:true}).click();}
test('PDF scenario: eight situations, both Emily questions, changes, save, sequence and report',async({page,workspace})=>{
 await start(page);
 const world=page.getByRole('group',{name:'Игровая сцена'});
 await world.focus();const player=page.getByLabel('Айко',{exact:true});const before=await player.getAttribute('style');await page.keyboard.press('ArrowLeft');await expect(player).not.toHaveAttribute('style',before!);
 await reveal(page,0);
 await page.getByRole('button',{name:party[0].options[1].label,exact:true}).click();
 await page.getByRole('button',{name:party[0].options[0].label,exact:true}).click();
 await page.getByRole('button',{name:'Повторить инструкцию',exact:false}).click();
 await page.reload();await expect(page.getByRole('button',{name:party[0].options[0].label,exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'Пауза',exact:true}).click();await expect(page.getByRole('button',{name:'Продолжить историю',exact:false})).toBeDisabled();await page.getByRole('button',{name:'Продолжить игру',exact:true}).click();
 await page.getByRole('button',{name:'Продолжить историю',exact:false}).click();
 for(let i=1;i<7;i++){
  await expect(page.getByRole('heading',{name:party[i].title,exact:true})).toBeVisible();await reveal(page,i);
  await page.getByRole('button',{name:party[i].options[i===5?1:0].label,exact:true}).click();
  if(i===3){await page.getByRole('button',{name:'Теперь поможем Эмили',exact:false}).click();await page.reload();await page.getByRole('button',{name:support[2].label,exact:true}).click();}
  await page.getByRole('button',{name:'Продолжить историю',exact:false}).click();
 }
 await reveal(page,7);
 for(const o of finalItems)await page.getByRole('button',{name:o.label,exact:true}).click();
 await page.getByRole('button',{name:'Начать праздник',exact:false}).click();
 await expect(page.getByRole('heading',{name:'Приключение завершено!'})).toBeVisible();
 await page.getByRole('link',{name:'Результаты наблюдения'}).click();
 await expect(page.locator('tbody tr')).toHaveCount(8);
 await expect(page.getByText('Выполнено 3 из 3 действий.',{exact:true})).toBeVisible();
 const session=workspace.game;
 expect(session.mode).toBe('party');expect(session.answers[0].changes).toBe(1);expect(session.answers[0].help).toBe(1);expect(session.answers[3].emotionChoice).toBe(0);expect(session.answers[3].choice).toBe(2);expect(session.answers[5].choice).toBe(1);expect(session.answers[7].choice).toBe(0);
});
test('mobile, all alternatives can continue; final incomplete order remains observable',async({page,workspace})=>{
 await page.setViewportSize({width:390,height:844});await start(page);
 for(let i=0;i<7;i++){
  await reveal(page,i);
  for(const o of party[i].options){await page.getByRole('button',{name:o.label,exact:true}).click();await expect(page.getByRole('button',{name:i===3?'Теперь поможем Эмили':'Продолжить историю',exact:false})).toBeEnabled();}
  if(i===0){expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/party-mobile.png',fullPage:true});}
  if(i===3){await page.getByRole('button',{name:'Теперь поможем Эмили',exact:false}).click();for(const o of support)await page.getByRole('button',{name:o.label,exact:true}).click();}
  await page.getByRole('button',{name:'Продолжить историю',exact:false}).click();
 }
 await reveal(page,7);await page.getByRole('button',{name:finalItems[1].label,exact:true}).click();await page.getByRole('button',{name:'Начать праздник',exact:false}).click();
 const session=workspace.game;expect(session.answers[7].choice).toBe(4);expect(session.answers[7].actions).toEqual([finalItems[1].label]);
});

test('desktop drag performs an action and scene has no runtime errors',async({page,workspace})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await start(page);await reveal(page,0);
 await page.getByRole('button',{name:party[0].options[2].label,exact:true}).dragTo(page.getByRole('group',{name:'Игровая сцена'}));
 await expect(page.getByRole('button',{name:party[0].options[2].label,exact:true})).toHaveAttribute('aria-pressed','true');
 await page.screenshot({path:'test-results/party-desktop.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('Russian keyboard layout uses physical WASD and E keys',async({page,workspace})=>{
 await start(page);
 const world=page.getByRole('group',{name:'Игровая сцена'});
 const player=page.getByLabel('Айко',{exact:true});
 await world.focus();
 for(const [key,code,left,top] of [
  ['ц','KeyW',49,80],['ф','KeyA',45,80],['ы','KeyS',45,84],['в','KeyD',49,84],
 ] as const){
  await world.dispatchEvent('keydown',{key,code,bubbles:true});
  const position=await player.evaluate(el=>({left:(el as HTMLElement).style.left,top:(el as HTMLElement).style.top}));
  expect(position).toEqual({left:left+'%',top:top+'%'});
 }
 await world.dispatchEvent('keydown',{key:'ц',code:'KeyW',bubbles:true});
 await world.dispatchEvent('keydown',{key:'у',code:'KeyE',bubbles:true});
 await expect(page.getByRole('button',{name:party[0].options[0].label,exact:true})).toBeVisible();
});

test('active game changes language without resetting the scene',async({page})=>{
 await start(page); await reveal(page,0);
 const lang=page.locator('.language-control select:visible');
 await lang.selectOption('en');await expect(page.getByRole('button',{name:'Walk past',exact:true})).toBeVisible();
 await lang.selectOption('kk');await expect(page.getByRole('button',{name:'Жанынан өтіп кету',exact:true})).toBeVisible();
 await lang.selectOption('ru');await expect(page.getByRole('button',{name:'Пройти мимо',exact:true})).toBeVisible();
});
