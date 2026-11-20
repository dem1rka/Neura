import {useT,localeTag} from '../../i18n';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { read, write, service } from '../../services/storage';
import type { GameSession, GameAnswer } from '../../types';
import { party, support, finalItems, type Action } from './party';
import './game.css';
import './party.css';

type Save = {
 session: GameSession; step: number; revealed: boolean; phase: 'emotion'|'action';
 choice: number|null; emotionChoice?: number; history: NonNullable<GameAnswer['history']>;
 actions: string[]; x: number; y: number; help: number; seconds: number; note: string;
};
const chapterState = () => ({revealed:false,phase:'emotion' as const,choice:null,emotionChoice:undefined,history:[],actions:[],x:49,y:84,help:0,seconds:0,note:''});
const fresh = (): Save => ({session:{id:crypto.randomUUID(),startedAt:new Date().toISOString(),answers:[],mode:'party'},step:0,...chapterState()});
const key = 'party-scenario-v1';
export default function Game(){
 const t=useT();
 const [save,setSave]=useState<Save|null>(()=>read(key,null));
 const [paused,setPaused]=useState(false);
 const [message,setMessage]=useState('');
 const world=useRef<HTMLDivElement>(null);
 const chapter=party[save?.step??0];
 const complete=!!save?.session.completedAt;
 const second=save?.step===3&&save.phase==='action';
 const options=save?.step===7?finalItems:second?support:chapter.options;
 const canContinue=save?.choice!==null&&save?.choice!==undefined;
 useEffect(()=>{if(save)write(key,save);},[save]);
 useEffect(()=>{
  if(!save||paused||complete)return;
  const timer=window.setInterval(()=>{if(!document.hidden)setSave(s=>s?{...s,seconds:s.seconds+1}:s);},1000);
  return()=>clearInterval(timer);
 },[!!save,paused,complete]);
 function begin(){const s=fresh();setSave(s);service.saveGame(s.session);setMessage('');setPaused(false);}
 function reveal(){if(!save||paused)return;setSave({...save,revealed:true});setMessage(chapter.reveal);world.current?.focus();}
 function act(index:number){
  if(!save||paused||!save.revealed)return;
  const o=options[index];
  if(save.step===7){
   if(save.actions.includes(o.label))return;
   setSave({...save,actions:[...save.actions,o.label],x:o.x<50?o.x+10:o.x-10,y:Math.min(92,o.y+22)});
  }else{
   setSave({...save,choice:index,x:o.x<50?o.x+10:o.x-10,y:Math.min(92,o.y+22),history:[...save.history,{phase:second?'Поддержка':save.step===3?'Эмоция':'Выбор',choice:index,seconds:save.seconds}]});
  }
  setMessage(o.result);world.current?.focus();
 }
 function next(finalChoice?:number){
  if(!save||paused||(!canContinue&&save.step!==7))return;
  if(save.step===3&&!second){setSave({...save,emotionChoice:save.choice!,choice:null,phase:'action'});setMessage('Айко хочет помочь Эмили. Разыграй, как он поступит.');return;}
  const changes=save.history.reduce((n,event,i,all)=>{const prev=all.slice(0,i).filter(x=>x.phase===event.phase).at(-1);return n+Number(!!prev&&prev.choice!==event.choice);},0);
  const answer:GameAnswer={situationId:save.step,choice:finalChoice??save.choice!,emotionChoice:save.emotionChoice,seconds:save.seconds,help:save.help,changes,history:save.history,actions:save.actions,note:save.note};
  const session:GameSession={...save.session,answers:[...save.session.answers,answer],...(save.step===7?{completedAt:new Date().toISOString()}:{})};
  service.saveGame(session);setSave({session,step:Math.min(save.step+1,7),...chapterState()});setMessage('');
 }
 function finish(){if(!save)return;const order=finalItems.map(i=>i.label);const exact=save.actions.length===3&&save.actions.every((a,i)=>a===order[i]);next(exact?0:save.actions.length===1&&save.actions[0]===order[0]?1:save.actions.length===0?2:4);}
 function repeat(){if(!save||paused)return;setSave({...save,help:save.help+1});setMessage('repeat');}
 if(!save)return <div className="island-intro party-intro"><span className="island-tag">{t("ИНТЕРАКТИВНАЯ ИСТОРИЯ · 7–8 ЛЕТ")}</span><div className="intro-island" aria-hidden="true">🎈 🎁 <b>🤖</b> 🎨 🎉</div><h1>{t("Приключение Айко")}<br/><em>{t("Готовим праздник!")}</em></h1><p>{t("«Привет! Меня зовут Айко! Сегодня я готовлю праздник для своих друзей. Но у меня много дел, и мне нужна твоя помощь».")}</p><button className="button" onClick={begin}>{t("Начать приключение →")}</button><div className="island-features"><span>{t("8 ситуаций · 10–15 минут")}</span><span>{t("Нажимай, двигайся, перетаскивай")}</span><span>{t("Без баллов и проигрыша")}</span></div><small>{t("Можно менять решение и делать перерывы. Прогресс сохраняется в карточке.")}</small><details className="party-adult"><summary>{t("Для сопровождающего взрослого")}</summary><p>{t("Игра по сценарию «Приключение Айко». Фиксируются действия, выборы, время, изменения решения, повторения инструкции и порядок выполнения финальных дел. Это игровое наблюдение, а не диагностический тест на РАС. Ответы не подтверждают и не исключают наличие аутизма.")}</p></details></div>;
 if(complete)return <div className="island-intro party-intro"><div className="final-lighthouse">🎈 🤖 🎉</div><span className="island-tag">{t("ВОСЕМЬ СИТУАЦИЙ ПОЗАДИ")}</span><h1>{t("Приключение завершено!")}</h1><p>{t("«Спасибо за помощь! Теперь праздник может начаться!»")}</p><div className="party-friends" aria-hidden="true">👦 🧒 👧 🧑 👦</div><div className="actions"><Link className="button" to="/game/report">{t("Результаты наблюдения")}</Link><button className="button secondary" onClick={begin}>{t("Играть снова")}</button></div><small>{t("Новая игра заменит текущий отчёт в карточке.")}</small></div>;
 const emotion=save.step===2||(save.step===3&&!second);
 const selected=save.choice===null?null:options[save.choice];
 const status=message||(save.revealed?(selected?.result||chapter.reveal):chapter.story);
 const items:Action[]=save.revealed?options:[{label:chapter.trigger,icon:chapter.triggerIcon,x:50,y:54,result:chapter.reveal}];
 const indoor=[1,2,3,6,7].includes(save.step)||(save.step===4&&save.choice===0);
 return <div className="island-game party-game"><header className="island-header"><Link to="/dashboard">{t("← К платформе")}</Link><span>{t("ПРИКЛЮЧЕНИЕ АЙКО / ГОТОВИМ ПРАЗДНИК")}</span><button onClick={()=>setPaused(!paused)}>{t(paused?'Продолжить':'Пауза')}</button></header>
 <div className="island-layout"><section className="island-stage"><div className="island-stage-heading"><div><span className="island-tag">{t('Ситуация')} {save.step+1} / 8 · {t(chapter.place)}</span><h1>{t(chapter.title)}</h1></div><span className="firefly-count">{save.step+1} / 8</span></div>
 <div ref={world} tabIndex={0} role="group" aria-label={t("Игровая сцена")} className={'island-world party-world '+(indoor?'indoors':'outdoors')+(save.step===4&&save.revealed&&save.choice!==0?' raining':'')}
 onKeyDown={e=>{
  if(paused||e.target!==e.currentTarget)return;
  const dirs:Record<string,number[]>={ArrowLeft:[-4,0],KeyA:[-4,0],ArrowRight:[4,0],KeyD:[4,0],ArrowUp:[0,-4],KeyW:[0,-4],ArrowDown:[0,4],KeyS:[0,4]};const dir=dirs[e.code];
  if(dir){e.preventDefault();setSave({...save,x:Math.max(6,Math.min(94,save.x+dir[0])),y:Math.max(24,Math.min(90,save.y+dir[1]))});}
  if(e.code==='Space'||e.code==='KeyE'){e.preventDefault();const near=items.map((o,i)=>({o,i,d:Math.hypot(o.x-save.x,o.y-save.y)})).sort((a,b)=>a.d-b.d)[0];if(near&&near.d<28){if(save.revealed)act(near.i);else reveal();}else setMessage('Подойди ближе к предмету или нажми на него.');}
 }} onClick={e=>{if(paused||e.target!==e.currentTarget)return;const r=e.currentTarget.getBoundingClientRect();setSave({...save,x:Math.max(6,Math.min(94,(e.clientX-r.left)/r.width*100)),y:Math.max(24,Math.min(90,(e.clientY-r.top)/r.height*100))});}}
 onDragOver={e=>{if(!paused)e.preventDefault();}} onDrop={e=>{e.preventDefault();if(paused)return;const value=e.dataTransfer.getData('application/aiko-action');if(value!==''&&/^\d+$/.test(value)&&options[Number(value)])act(Number(value));}}>
 <div className="island-ground"/><div className="island-path"/><div className="party-bunting" aria-hidden="true">▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼</div><div className="party-window" aria-hidden="true">{save.step===4&&save.revealed?'🌧️':'☀️'}</div>
 <div className="party-cast" aria-hidden="true">{save.step===0?'⚽ 🧒 🎨':save.step===1?'👦 🚗 👧':save.step===2?(save.revealed?'🧸 😊':'🎁'):save.step===3?(second&&save.choice===0?'👧 🖼️':'👧 💔'):save.step===4?'🎈 ⚽ 🎵':save.step===5?'★ ★ ★':save.step===6?(save.choice===0||save.choice===1?'👦 🎁':'👦 🎀'):'🎂 🎈'}</div>
 {save.step===7&&save.revealed&&<div className="party-table" aria-label={t("Праздничный стол")}>{save.actions.includes(finalItems[0].label)?'🎁':'▧'} {save.actions.includes(finalItems[1].label)?'💌':''}{save.actions.includes(finalItems[2].label)&&<span>👦 👧 🧒</span>}</div>}
 {save.step===5&&save.revealed&&<div className="rule-banner">{t("Было: красные → Теперь: синие")}</div>}
 {items.map((o,i)=>{const done=save.step===7&&save.actions.includes(o.label);const chosen=save.revealed&&save.choice===i;return <button key={save.step+'-'+save.phase+'-'+o.label} className={'island-object party-object '+(chosen?'chosen ':'')+(done?'done':'')} style={{left:o.x+'%',top:o.y+'%'}} disabled={paused||done} draggable={save.revealed&&!paused&&!done} onDragStart={e=>e.dataTransfer.setData('application/aiko-action',String(i))} onClick={e=>{e.stopPropagation();if(save.revealed)act(i);else reveal();}} aria-label={t(o.label)} aria-pressed={save.revealed&&save.step!==7?chosen:undefined}><span className={'object-art '+(save.step===5&&save.revealed?'star star-'+i:'')}>{save.step===5&&save.revealed?'★':done?'✓':o.icon}</span><span className="object-label">{t(o.label)}</span></button>;})}
 <div className="aiko-player" style={{left:save.x+'%',top:save.y+'%'}} aria-label={t("Айко")}><div className="aiko-antenna"/><div className="aiko-head"><i/><i/></div><div className="aiko-body">♥</div><div className="aiko-feet"/><span>{t("АЙКО")}</span>{selected&&<b className="aiko-reaction">{save.step===5?'🧺 '+selected.icon:emotion?selected.icon:save.step===1&&save.choice===1?'🚗':save.step===6&&(save.choice===0||save.choice===1)?'🎁':selected.icon}</b>}</div>
 {paused&&<div className="island-overlay"><span>☁</span><h2>{t("Отдохнём?")}</h2><p>{t("Прогресс сохранён. Продолжим, когда захочешь.")}</p><button className="button" onClick={()=>setPaused(false)}>{t("Продолжить игру")}</button></div>}</div>
 <div className="island-controls"><span>{t("Стрелки / WASD · E — действие")}</span><span>{t("Или нажимай на предметы. Можно перетаскивать их в сцену.")}</span></div>
 <div className="island-dialogue" role="status"><span aria-hidden="true">🤖</span><div><strong>{t("Айко")}</strong><p>{message==='repeat'?[chapter.story,...(save.revealed?[second?'Айко хочет помочь Эмили. Что можно сделать?':chapter.reveal]:[])].map(v=>t(v)).join(' '):t(status)}</p></div></div>
 <div className="party-next">{save.revealed&&save.step!==7&&<><small>{t("Можно попробовать другой вариант перед продолжением.")}</small><button className="button" disabled={!canContinue||paused} onClick={()=>next()}>{t(save.step===3&&!second?'Теперь поможем Эмили':'Продолжить историю')} →</button></>}{save.step===7&&save.revealed&&<><button className="button secondary" disabled={paused} onClick={()=>next(3)}>{t("Не знаю, с чего начать")}</button><button className="button" disabled={paused} onClick={finish}>{t("Начать праздник →")}</button></>}</div>
 </section><aside className="island-journal"><span className="island-tag">{t("ГОТОВИМ ПРАЗДНИК")}</span><h2>{t(second?'Помощь Эмили':save.revealed?'Твой ход':'Посмотри вокруг')}</h2><p>{t(save.revealed?(second?'Айко хочет помочь Эмили. Что можно сделать?':chapter.prompt):chapter.story)}</p>{save.step===7&&<ol className="party-todo">{finalItems.map(o=><li key={t(o.label)}>{t(o.label)}{save.actions.includes(o.label)?' ✓':''}</li>)}</ol>}
 <button className="island-hint" disabled={paused} onClick={repeat}>{t("↻ Повторить инструкцию")}</button>
 {save.revealed&&<label className="party-note">{t(save.step===4&&save.choice===2?'Твой другой вариант (по желанию)':'Хочешь объяснить своё решение?')}<textarea disabled={paused} value={save.note} maxLength={1000} onChange={e=>setSave({...save,note:e.target.value})} placeholder={t("Можно рассказать взрослому или записать здесь")}/></label>}
 {save.step===3&&second&&<button className="island-hint" disabled={paused} onClick={()=>{setSave({...save,phase:'emotion',choice:save.emotionChoice??null});setMessage('Можно изменить предположение об эмоции Эмили.');}}>{t("Вернуться к эмоции Эмили")}</button>}
 <div className="island-route">{party.map((p,i)=><span key={t(p.title)} title={t(p.title)} className={i===save.step?'current':i<save.step?'visited':''}>{i+1}</span>)}</div><small>{t("Нет оценок. Можно подумать, изменить решение или сделать перерыв.")}</small></aside></div></div>;
}

