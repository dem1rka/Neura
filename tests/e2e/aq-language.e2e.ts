import {test,expect} from './workspace';
test('questionnaire follows site language without losing answers',async({page,workspace})=>{
 await page.goto('/questionnaire');await page.getByLabel('Полных лет').fill('8');await page.getByLabel('У участника нет интеллектуальных').check();await page.getByLabel('Я понимаю вопросы').check();await page.getByRole('button',{name:'Начать анкету',exact:true}).click();
 await expect(page.locator('legend').first()).toContainText('Ребёнок');await page.locator('input[name="aq-0"]').first().check();
 await page.getByLabel('Язык интерфейса').first().selectOption('kk');await expect(page.locator('legend').first()).toContainText('Бала');await expect(page.locator('input[name="aq-0"]').first()).toBeChecked();
 await page.locator('.preferences-controls select').first().selectOption('en');await expect(page.locator('legend').first()).toContainText('S/he');await expect(page.locator('input[name="aq-0"]').first()).toBeChecked();
 for(let i=1;i<10;i++)await page.locator(`input[name="aq-${i}"]`).first().check();await page.getByRole('button',{name:'Complete questionnaire'}).click();await expect(page.locator('.protocol-score')).toHaveText('4 / 10');expect(workspace['research-assessments-v1'].records[0].answerLanguages).toEqual(['ru',...Array(9).fill('en')]);
});
