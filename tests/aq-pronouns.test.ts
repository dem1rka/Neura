import {it,expect} from 'vitest';
import {questionsFor} from '../src/features/assessment/aqLanguages';
it('adapts pronouns without changing forms or answer order',()=>{
 for(const version of ['child','adolescent','adult'] as const){
  expect(questionsFor('en',version,'female')).toHaveLength(10);
  expect(questionsFor('en',version,'female').join(' ')).not.toMatch(/S\/he|s\/he|his\/her/);
  expect(questionsFor('kk',version,'male')).toEqual(questionsFor('kk',version,'female'));
 }
 expect(questionsFor('en','child','female')[0]).toMatch(/^She/);
 expect(questionsFor('en','child','male')[0]).toMatch(/^He/);
 expect(questionsFor('en','child')[0]).toMatch(/^Your child/);
 expect(questionsFor('ru','adolescent','female')[3]).toBe('Если её прервали, она может очень быстро вернуться к своему занятию.');
 expect(questionsFor('ru','adult','female')[1]).toContain('сосредоточена');
});
