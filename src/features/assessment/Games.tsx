import {useEffect,useRef,useState} from 'react';
import type {RecordData,Touch,Trial} from './protocol';
import {stimulus,trialCorrect} from './protocol';
type Props={record:RecordData; onFinish:(r:RecordData)=>void;onCheckpoint?:(r:RecordData)=>void};
export function GeodeGame({record,onFinish,onCheckpoint}:Props){
 const [phase,setPhase]=useState<'ready'|'cue'|'choice'|'feedback'>('ready');
 const [flash,setFlash]=useState([false,false]),[count,setCount]=useState(0),[reward,setReward]=useState(false);
 const rows=useRef<Trial[]>([]),current=useRef(stimulus(0)),shown=useRef<number[]>([]),decisionAt=useRef(0);
 const frame=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),ended=useRef(false),phaseRef=useRef(phase);
 const finish=useRef(onFinish);finish.current=onFinish;const checkpoint=useRef(onCheckpoint);checkpoint.current=onCheckpoint;
 function stop(completed=false){if(ended.current)return;ended.current=true;cancelAnimationFrame(frame.current);clearTimeout(timer.current);
  finish.current({...record,trials:rows.current,status:completed?'completed':'interrupted',...(completed?{completedAt:new Date().toISOString()}:{} )});}
 useEffect(()=>{const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);
  return()=>{document.removeEventListener('visibilitychange',hidden);cancelAnimationFrame(frame.current);clearTimeout(timer.current);};},[]);
 function change(p:typeof phase){phaseRef.current=p;setPhase(p);}
 function begin(){if(phaseRef.current!=='ready'||ended.current)return;current.current=stimulus(rows.current.length);shown.current=[];change('cue');
  const start=performance.now();let previous=-1;
  const tick=(now:number)=>{const elapsed=now-start,index=Math.floor(elapsed/260);
   if(index>=10){setFlash([false,false]);decisionAt.current=now;change('choice');return;}
   if(index!==previous){shown.current[index]=elapsed;previous=index;}
   const visible=elapsed-index*260<30;
   setFlash([visible&&!!current.current.left[index],visible&&!!current.current.right[index]]);
   frame.current=requestAnimationFrame(tick);
  };frame.current=requestAnimationFrame(tick);
 }
 function choose(choice:0|1){if(phaseRef.current!=='choice'||ended.current)return;change('feedback');
  const correct=trialCorrect(current.current.left,current.current.right,choice);
  const presentedAt=Array.from({length:10},(_,i)=>shown.current[i]??-1);
  rows.current=[...rows.current,{trial:rows.current.length+1,...current.current,choice,correct,rt:performance.now()-decisionAt.current,presentedAt,
   timingValid:presentedAt.every((t,i)=>t>=i*260 && t-i*260<30)}];
  if(rows.current.length%10===0&&rows.current.length<200)checkpoint.current?.({...record,trials:rows.current});
  setReward(correct);setCount(rows.current.length);
  timer.current=setTimeout(()=>{if(rows.current.length===200)stop(true);else change('ready');},correct?700:1200);
 }
 return <section className="protocol-game geode-game" aria-label="Игра GEODE">
  <div className="game-top"><span>GEODE · Экспедиция</span><span>Проба {Math.min(count+1,200)} / 200</span></div>
  <div className="gem-map" aria-label="Прогресс игры">{Array.from({length:10},(_,i)=><i key={i} data-done={count>=20*(i+1)}>{i+1}</i>)}</div>
  <p className="game-prompt" aria-live="polite">{phase==='ready'?'Нажми на компас, чтобы продолжить':phase==='cue'?'Смотри на камни':phase==='choice'?'Выбери сторону':reward?'Камень найден!':'Попробуем ещё'}</p>
  <div className="gem-field">
   <button aria-label="Левая сторона" disabled={phase!=='choice'} className={'gem-side '+(flash[0]?'lit':'')} onClick={()=>choose(0)}><span>◆</span></button>
   <button className="compass" aria-label="Начать пробу" disabled={phase!=='ready'} onClick={begin}>✦</button>
   <button aria-label="Правая сторона" disabled={phase!=='choice'} className={'gem-side '+(flash[1]?'lit':'')} onClick={()=>choose(1)}><span>◆</span></button>
  </div>
  <div className="game-bottom"><span>Камней собрано: {rows.current.filter(x=>x.correct).length}</span><button onClick={()=>stop()}>Завершить раньше</button></div>
 </section>;
}

export function BubbleGame({record,onFinish}:Props){
 const canvas=useRef<HTMLCanvasElement>(null),finish=useRef(onFinish);finish.current=onFinish;
 const [training,setTraining]=useState(true),[remaining,setRemaining]=useState(20);
 useEffect(()=>{
  const el=canvas.current!,ctx=el.getContext('2d')!;
  let raf=0,ended=false,trainingHits=0,start=0,previous=performance.now();
  const touches:Touch[]=[];let active:({id:number;row:Touch;lastX:number;lastY:number})|null=null;
  const width=800,height=440,radius=38;
  const bubbles=Array.from({length:5},(_,i)=>({x:80+i*160,y:height+radius+i*70}));
  function stop(completed:boolean){if(ended)return;ended=true;cancelAnimationFrame(raf);
   if(active){active.row.cancelled=true;active.row.duration=performance.now()-start-active.row.t;touches.push(active.row);active=null;}
   finish.current({...record,touches,durationMs:start?Math.min(20000,performance.now()-start):0,
    device:{width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height,pixelRatio:devicePixelRatio,touchPoints:navigator.maxTouchPoints},
    status:completed?'completed':'interrupted',...(completed?{completedAt:new Date().toISOString()}:{} )});
  }
  const draw=(now:number)=>{if(ended)return;const dt=Math.min(now-previous,100);previous=now;
   if(start){setRemaining(Math.max(0,Math.ceil((20000-now+start)/1000)));if(now-start>=20000){stop(true);return;}}
   ctx.clearRect(0,0,width,height);
   for(let i=0;i<5;i++){const b=bubbles[i];b.y-=dt*.07;if(b.y < -radius)b.y=height+radius;
    ctx.beginPath();ctx.arc(b.x,b.y,radius,0,Math.PI*2);ctx.fillStyle=['#9cead0','#a7ccff','#d1bcff','#ffc59a','#f5b7d2'][i];ctx.fill();
    ctx.strokeStyle='#ffffffb0';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle='#ffffffcc';ctx.beginPath();ctx.arc(b.x-12,b.y-12,7,0,Math.PI*2);ctx.fill();
   }raf=requestAnimationFrame(draw);
  };
  function pos(e:PointerEvent){const box=el.getBoundingClientRect();return {x:(e.clientX-box.left)/box.width*width,y:(e.clientY-box.top)/box.height*height};}
  function down(e:PointerEvent){if(ended||active||e.button!==0)return;e.preventDefault();el.setPointerCapture(e.pointerId);
   const p=pos(e),now=performance.now();const distances=bubbles.map(b=>Math.hypot(p.x-b.x,p.y-b.y));
   const lane=distances.indexOf(Math.min(...distances)),b=bubbles[lane],hit=distances[lane]<=radius;
   const row:Touch={t:start?now-start:0,...p,targetX:b.x,targetY:b.y,lane,hit,duration:0,distance:0,pointer:e.pointerType,cancelled:false};
   active={id:e.pointerId,row,lastX:p.x,lastY:p.y};
   if(hit)b.y=height+radius;
  }
  function move(e:PointerEvent){if(!active||active.id!==e.pointerId)return;const p=pos(e);active.row.distance+=Math.hypot(p.x-active.lastX,p.y-active.lastY);active.lastX=p.x;active.lastY=p.y;}
  function up(e:PointerEvent){if(!active||active.id!==e.pointerId||ended)return;move(e);active.row.cancelled=e.type==='pointercancel';
   if(start){active.row.duration=performance.now()-start-active.row.t;touches.push(active.row);}
   else if(active.row.hit&&!active.row.cancelled){trainingHits++;if(trainingHits>=2){start=performance.now();setTraining(false);}}
   active=null;
  }
  const hidden=()=>{if(document.hidden)stop(false);};
  const interrupt=()=>stop(false);
  el.addEventListener('pointerdown',down);el.addEventListener('pointermove',move);el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  document.addEventListener('visibilitychange',hidden);el.addEventListener('neura-stop',interrupt);
  raf=requestAnimationFrame(draw);
  return()=>{ended=true;cancelAnimationFrame(raf);el.removeEventListener('pointerdown',down);el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',up);el.removeEventListener('pointercancel',up);document.removeEventListener('visibilitychange',hidden);el.removeEventListener('neura-stop',interrupt);};
 },[]);
 return <section className="protocol-game"><div className="game-top"><span>Пузырьки</span><span>{training?'Знакомство с игрой':`${remaining} с`}</span></div>
  <p className="game-prompt">{training?'Лопни два пузырька, чтобы начать':'Продолжай лопать пузырьки'}</p>
  <canvas ref={canvas} width={800} height={440} aria-label="Поле с движущимися пузырьками"/>
  <div className="game-bottom"><span>{training?'Пробные касания не входят в результат':'Записываем касания'}</span><button onClick={()=>canvas.current?.dispatchEvent(new Event('neura-stop'))}>Завершить раньше</button></div>
 </section>;
}
