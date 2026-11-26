import {describe,it,expect} from 'vitest';
import {aqScore,aqInterpretation,eligibleGame,versionForAge,stimulus,trialCorrect,gameSummary} from '../src/features/assessment/protocol';
import type {RecordData} from '../src/features/assessment/protocol';
describe('AQ official keys and age boundaries',()=>{
 it('uses distinct keys for each form',()=>{
  expect(aqScore('child',[0,3,3,3,0,3,0,3,3,0])).toBe(10);
  expect(aqScore('adolescent',[0,3,3,3,0,3,3,0,3,0])).toBe(10);
  expect(aqScore('adult',[0,3,3,3,3,3,0,0,3,0])).toBe(10);
  expect(aqScore('child',Array(10).fill(0))).toBe(4);
  expect(aqScore('child',Array(10).fill(null))).toBeNull();
  expect(aqScore('child',[0])).toBeNull();
 });
 it('selects boundary forms and does not extrapolate the referral rule',()=>{
  expect(versionForAge(143)).toBe('child');expect(versionForAge(144)).toBe('adolescent');expect(versionForAge(192)).toBe('adult');
  const r={aqVersion:'child',answers:[0,3,3,3,0,3,0,3,3,0],ageMonths:96,noLearningDisability:true} as RecordData;
  expect(aqInterpretation(r)).toContain('Достигнут порог');
  expect(aqInterpretation({...r,noLearningDisability:false})).toContain('без автоматической');
  expect(aqInterpretation({...r,ageMonths:192,aqVersion:'adult'})).toContain('16–17');
 });
});
describe('game protocol',()=>{
 it('separates ages including overlap at eleven',()=>{
  expect(eligibleGame('bubbles',131)).toBe(true);expect(eligibleGame('bubbles',132)).toBe(false);
  expect(eligibleGame('geode',132)).toBe(true);expect(eligibleGame('geode',216)).toBe(false);
 });
 it('creates 10 bins, uses original unrewarded ties, excludes training and bad timing',()=>{
  for(let i=0;i<200;i++){const s=stimulus(i);expect(s.left).toHaveLength(10);expect(s.right).toHaveLength(10);expect([...s.left,...s.right].every(x=>x===0||x===1)).toBe(true);}
  expect(trialCorrect([1],[1],0)).toBe(false);expect(trialCorrect([1],[0],0)).toBe(true);
  const r={instrument:'geode-neura',trials:[{trial:1,timingValid:true,left:[1],right:[0],correct:true},{trial:11,timingValid:false,left:[1],right:[0],correct:true},{trial:12,timingValid:true,left:[1],right:[0],correct:true}]} as RecordData;
  expect(gameSummary(r)[1]).toContain(': 1');expect(gameSummary(r)[2]).toContain('1 / 1');
 });
});
