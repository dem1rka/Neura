import {test,expect} from './workspace';
const id='11111111-1111-4111-8111-111111111111',assessmentId='22222222-2222-4222-8222-222222222222';
for(const kind of ['game','questionnaire'] as const)test(`family menu and cabinet open the same ${kind} assignment`,async({page})=>{
 await page.route('**/api/auth/me',r=>r.fulfill({json:{id:'fixture',role:'family'}}));
 await page.route('**/api/family/children',r=>r.fulfill({json:[{id:'child',label:'Участник',assessments:[{id:assessmentId,assignments:[{id,kind,version:'research-v1',assignment_attempts:null}]}]}]}));
 await page.route(`**/api/assignments/${id}`,r=>r.fulfill({json:{id,kind,version:'research-v1',child_mode:false,assignment_attempts:null,assessments:{participants:{label:'Участник'}},research:{schemaVersion:1,assessmentId,ageMonths:156,records:[]}}}));
 await page.goto('/account/family');await page.locator('.family-row').click();await expect(page).toHaveURL(new RegExp('/assignments/'+id+'$'));
 await expect(page.locator('.child-task h1')).toBeVisible();const title=await page.locator('.child-task h1').textContent();await page.goto('/');await page.getByRole('button',{name:'Меню',exact:true}).click();await page.getByRole('dialog').locator(`a[href="/${kind}"]`).click();
 await expect(page).toHaveURL(new RegExp('/assignments/'+id+'$'));await expect(page.locator('h1')).toHaveText(title!);
});
test('old assignment upgrades instead of launching a different questionnaire',async({page})=>{
 let upgraded=false;
 await page.route('**/api/auth/me',r=>r.fulfill({json:{id:'fixture',role:'family'}}));
 await page.route(`**/api/assignments/${id}`,r=>r.fulfill({json:{id,kind:'questionnaire',version:upgraded?'research-v1':'1',child_mode:false,assignment_attempts:null,assessments:{participants:{label:'Участник'}},research:upgraded?{schemaVersion:1,assessmentId,ageMonths:96,records:[]}:null}}));
 await page.route(`**/api/assignments/${id}/upgrade`,r=>{expect(r.request().postDataJSON()).toEqual({ageMonths:96});upgraded=true;return r.fulfill({json:{ok:true}})});
 await page.goto('/assignments/'+id);await expect(page.getByRole('heading',{name:'Обновление методики'})).toBeVisible();await page.getByLabel('Полных лет').fill('8');await page.getByRole('button',{name:'Обновить задания'}).click();await expect(page.getByRole('heading',{name:'Анкета AQ-10',exact:true})).toBeVisible();await expect(page.getByLabel('Полных лет')).toBeDisabled();
});
test('draft resumes after reload with saved answers',async({page,workspace})=>{
 workspace['research-assessments-v1']={schemaVersion:1,assessmentId,ageMonths:96,records:[{schemaVersion:1,id,assessmentId,ageMonths:96,createdAt:'2026-11-24T10:00:00Z',kind:'questionnaire',instrument:'aq10-child',aqVersion:'child',answers:[0,...Array(9).fill(null)],status:'draft',protocolVersion:'ARC-2012-English-v1'}]};
 await page.goto('/questionnaire');await expect(page.locator('input[name="aq-0"]').first()).toBeChecked();await page.reload();await expect(page.locator('input[name="aq-0"]').first()).toBeChecked();await expect(page.getByRole('button',{name:'Начать анкету',exact:true})).toHaveCount(0);
});
for(const width of [390,1440])test(`result has one readable report and source links at ${width}px`,async({page,workspace})=>{
 workspace['research-assessments-v1']={schemaVersion:1,assessmentId,ageMonths:156,records:[{schemaVersion:1,id,assessmentId,ageMonths:156,createdAt:'2026-11-24T10:00:00Z',kind:'game',instrument:'geode-neura',status:'interrupted',protocolVersion:'neura-2026-11-v1',trials:[]}]};
 await page.setViewportSize({width,height:1000});await page.goto('/game/report?record='+id);
 await expect(page.locator('.protocol-result')).toHaveCount(1);await expect(page.getByText('Прервано',{exact:true})).toBeVisible();await expect(page.getByText('Пока нет подходящих проб после обучения')).toBeVisible();await expect(page.getByLabel('Полных лет')).toHaveCount(0);
 for(const theme of ['light','dark']){if(width<700)await page.getByRole('button',{name:'Меню',exact:true}).click();await page.getByRole('button',{name:theme==='light'?'Светлая тема':'Тёмная тема',exact:true}).first().click();if(width<700)await page.keyboard.press('Escape');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`test-results/result-${width}-${theme}.png`,fullPage:true});}
 await page.goto('/evidence');for(const anchor of ['aq-10','bubbles','geode']){await expect(page.locator('#'+anchor+' a.button')).toHaveAttribute('href',/^https:/);await expect(page.locator('#'+anchor+' a.button')).not.toHaveAttribute('href',/\.pdf$/);}
 await page.screenshot({path:`test-results/evidence-${width}.png`,fullPage:true});
});
test('retired routes use current modules',async({page})=>{
 for(const path of ['/legacy/game','/legacy/game/report','/questionnaire/teacher','/legacy/questionnaire','/questionnaire/report']){
  await page.goto(path);await expect(page.getByRole('heading',{name:path.includes('game')?'Игра для наблюдения':'Анкета AQ-10',exact:true})).toBeVisible();await expect(page.locator('.assessment')).toBeVisible();
 }
});

test('AQ-10 results offer model comparison only for the child form', async ({page, workspace}) => {
 const record = {schemaVersion:1, id, assessmentId, ageMonths:144, createdAt:'2026-11-24T10:00:00Z',
  completedAt:'2026-11-24T10:05:00Z', kind:'questionnaire', instrument:'aq10-adolescent', aqVersion:'adolescent',
  answers:[0,2,0,0,0,0,0,0,0,0], respondent:'parent', language:'ru', protocolVersion:'neura-aq10-i18n-v1', status:'completed'};
 const state = {schemaVersion:1, assessmentId, ageMonths:144, records:[record]};
 workspace['research-assessments-v1'] = state;
 let requests = 0;
 await page.route('**/api/research/predict', route => {
  requests++;
  expect(route.request().postDataJSON().records[0].instrument).toBe('aq10-child');
  return route.fulfill({json:{available:true, percentile:42}});
 });
 await page.goto('/questionnaire/report?record='+id);
 const compare = page.getByRole('button', {name:'Сравнить с выборкой модели'});
 await expect(page.getByText('Модель AQ-10 поддерживает только детскую форму (4–11 лет).')).toBeVisible();
 await expect(page.locator('.protocol-score')).toHaveText('5 / 10');
 await expect(compare).toHaveCount(0);
 expect(requests).toBe(0);

 const child = {...record, ageMonths:132, instrument:'aq10-child', aqVersion:'child'};
 workspace['research-assessments-v1'] = {...state, ageMonths:132, records:[child]};
 await page.reload();
 await compare.click();
 await expect(page.getByText('Перцентиль необычности профиля: 42.')).toBeVisible();
 expect(requests).toBe(1);
});
