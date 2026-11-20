import assert from 'node:assert/strict';
import { test } from 'node:test';
import { transform } from '../server/ml-features.mjs';

test('separates instruments, omits identifying fields and keeps missing answers', () => {
  const users = {email:'demo.family@neura.example'};
  const base = {users, participants:{users}, participant_id:'sensitive-uuid'};
  const answers = Object.fromEntries(Array.from({length:10}, (_,i) => [i, i%5]));
  const questionnaire = { ...base, instrument_key:'questionnaire', payload:{ value:{ answers, completedAt:'done' } } };
  const game = { ...base, instrument_key:'game', payload:{ value:{ completedAt:'done', mode:'party',
    answers:Array.from({length:8}, (_,i) => ({ situationId:i, choice:0, changes:1,
      help:0, seconds:10, emotionChoice:2, note:'private-note' })) } } };
  const assignment = {answers:[0,1,2], completed_at:'done', assignments:{kind:'game',version:'1',
    assessments:{id:'visit-id', child_id:base.participant_id, participants:{users}, users}}};
  const {rows,counts} = transform([game, questionnaire, {...game,payload:{}},
    {...questionnaire,payload:{value:{completedAt:'done',answers:{}}}}], [assignment], () => 'pseudonym');
  assert.deepEqual(counts,{incomplete:1,invalid:1});
  assert.equal(rows.length,3);
  assert.ok(rows.every(r => r.source === 'local_demo' && r.diagnosis === null));
  assert.equal(rows.find(r => r.instrument === 'workspace-questionnaire-v1').features.q4, null);
  const telemetry = rows.find(r => r.instrument === 'workspace-party-v1').features;
  assert.deepEqual([telemetry.seconds,telemetry.emotion3,telemetry.changes],[80,2,8]);
  assert.equal(rows.find(r => r.instrument === 'family-game-v1').assessment,'pseudonym');
  assert.doesNotMatch(JSON.stringify(rows), /sensitive-uuid|private-note|@neura|visit-id/);
});
