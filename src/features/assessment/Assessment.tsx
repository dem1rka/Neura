import {api} from '../../services/accountApi';
import {usePreferences,useT} from '../../i18n';
import {questionsFor,optionsFor} from './aqLanguages';
import {useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {Heading} from '../../components/UI';
import {read,write} from '../../services/storage';
import {aqInterpretation,aqOptions,aqPage,aqQuestions,aqScore,eligibleGame,gameMetrics,shortGeodeVersion,instrumentLabel,sources,versionForAge} from './protocol';
import type {Answer,GameKind,RecordData,PatientSex} from './protocol';
import {BubbleGame,GeodeGame} from './Games';
import './assessment.css';
export type AssessmentState={schemaVersion:1;assessmentId:string;ageMonths:number;sex?:PatientSex;records:RecordData[]};
export const assessmentKey='research-assessments-v1';
export function initialState():AssessmentState{return {schemaVersion:1,assessmentId:crypto.randomUUID(),ageMonths:0,records:[]};}
export default function Assessment({kind,initial,save,assigned=false}: {
 kind:'game'|'questionnaire';initial?:AssessmentState;save?:(state:AssessmentState)=>Promise<boolean>;assigned?:boolean;
}){
 const {language}=usePreferences(),t=useT();
 const [state,setState]=useState<AssessmentState>(()=>initial??read(assessmentKey,initialState()));
 const saveQueue=useRef<Promise<unknown>>(Promise.resolve());
 const [record,setRecord]=useState<RecordData|null>(()=>state.records.find(r=>r.assessmentId===state.assessmentId&&r.kind===kind&&r.status==='draft')??null);
 const [params]=useSearchParams();
 const [playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [message,setMessage]=useState(''),[submitted,setSubmitted]=useState<RecordData|null>(()=>state.records.find(r=>r.kind===kind&&r.id===params.get('record'))??(assigned?[...state.records].reverse().find(r=>r.kind===kind&&r.status==='completed')??null:null));
 const [years,setYears]=useState(state.ageMonths?String(Math.floor(state.ageMonths/12)):'');
 const [sex,setSex]=useState<PatientSex>(state.sex??'unspecified');
 const [geodeMode,setGeodeMode]=useState<'short'|'full'>('short');
 const [applicable,setApplicable]=useState(false),[english,setEnglish]=useState(false);
 const age=Number(years)*12,version=versionForAge(age),game:GameKind=age<132?'bubbles':'geode';
 const history=state.records.filter(r=>r.kind===kind);
 async function persist(next:AssessmentState){
  setBusy(true);
  const operation=saveQueue.current.then(async()=>{setError('');try{
   const ok=save?await save(next):await write(assessmentKey,next);
   if(!ok)throw new Error('Не удалось сохранить результат. Повторите сохранение.');
   setState(next);return true;
  }catch(e){setError((e as Error).message);return false;}});
  saveQueue.current=operation;
  const ok=await operation;if(saveQueue.current===operation)setBusy(false);return ok;
 }
 async function store(r:RecordData){const next={...state,sex:r.sex??sex,assessmentId:r.assessmentId,ageMonths:r.ageMonths,records:[...state.records.filter(x=>x.id!==r.id),r]};
  const ok=await persist(next);if(ok)setMessage(r.status==='completed'?'Результат сохранён':'Запись сохранена');return ok;}
 async function begin(){if(!Number.isInteger(Number(years))||age<48||age>=216)return;
  if(kind==='questionnaire'&&(!applicable||!english))return;
  if(kind==='game'&&!eligibleGame(game,age))return;
  if(state.records.length>=100){setError('Сохранено 100 записей. Выгрузите данные и выберите другую карточку участника.');return;}
  const r:RecordData={sex,schemaVersion:1,id:crypto.randomUUID(),assessmentId:state.assessmentId,ageMonths:age,createdAt:new Date().toISOString(),
   kind,instrument:kind==='game'?`${game}-neura`:`aq10-${version}`,protocolVersion:kind==='game'?(game==='geode'&&geodeMode==='short'?shortGeodeVersion:'neura-2026-11-v1'):'neura-aq10-i18n-v1',status:'draft',
   ...(kind==='questionnaire'?{answers:Array<Answer>(10).fill(null),aqVersion:version,noLearningDisability:applicable,respondent:version==='adult'?'self' as const:'parent' as const,language,answerLanguages:Array(10).fill(null)}:{} )};
  if(await store(r)){setRecord(r);setSubmitted(null);if(kind==='game')setPlaying(true);}
 }
 function exportData(data:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download='neura-assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 async function finish(r:RecordData){setPlaying(false);setRecord(r);setSubmitted(r);if(await store(r))setRecord(null);}
 const validAge=years!==''&&Number.isInteger(Number(years))&&age>=48&&age<216;
 if(playing&&record)return <div className="assessment">{error&&<p role="alert" className="protocol-error">{error}</p>}{record.instrument==='bubbles-neura'?<BubbleGame record={record} onFinish={r=>void finish(r)}/>:<GeodeGame record={record} onFinish={r=>void finish(r)} onCheckpoint={r=>void store(r)}/>}</div>;
 return <div className="assessment">
  <Heading eyebrow="МЕТОДИКИ И ИССЛЕДОВАНИЯ" title={kind==='game'?'Игра для наблюдения':'Анкета AQ-10'} description={kind==='game'?'Два задания для разных возрастов. Сохраняем действия и время, чтобы специалист мог изучить выполнение.':'Анкета Autism Research Centre на русском, казахском и английском языках.'}/>
  {!assigned&&<nav className="assessment-nav"><Link to="/game">Игры</Link><Link to="/questionnaire">Анкета</Link><Link to="/evidence">Научная основа</Link></nav>}
  {error&&<p role="alert" className="protocol-error">{error}</p>}{message&&<p role="status">{message}</p>}
  {submitted&&<Result record={submitted} exportData={exportData}/>}
  {submitted&&!record&&!assigned&&<button className="button secondary" onClick={()=>setSubmitted(null)}>Вернуться к заданиям</button>}
  {submitted&&record&&<button className="button" disabled={busy} onClick={()=>void finish(record)}>Повторить сохранение</button>}
  {record?.kind==='questionnaire'&&record.status==='draft'?<section className="protocol-card">
   <h2>AQ-10 · {record.aqVersion}</h2><label className="age-label">{t('Пол пациента')}<select value={record?.sex??sex} onChange={e=>{const value=e.target.value as PatientSex;setSex(value);if(record)setRecord({...record,sex:value});}}><option value="unspecified">{t('Не указан')}</option><option value="male">{t('Мужской')}</option><option value="female">{t('Женский')}</option></select></label><p>{t('Ответьте на все 10 вопросов. Язык анкеты следует языку сайта.')}</p>
   {language!=='en'&&<p className="protocol-note">{t('Перевод Neura. Клиническая валидация перевода пока не подтверждена.')}</p>}<form className="aq-form" onSubmit={e=>{e.preventDefault();if(aqScore(record.aqVersion!,record.answers!)!==null)void finish({...record,status:'completed',completedAt:new Date().toISOString()});}}>
    {questionsFor(language,record.aqVersion!,record.sex??sex).map((q,i)=><fieldset key={i} lang={language}><legend>{i+1}. {q}</legend><div className="aq-options">{optionsFor(language).map((label,j)=><label key={label}><input type="radio" name={`aq-${i}`} value={j} checked={record.answers?.[i]===j} onChange={()=>{const a=[...record.answers!];a[i]=j as Answer;const langs=record.answerLanguages??record.answers!.map(v=>v===null?null:record.language??'en');setRecord({...record,answers:a,language,protocolVersion:'neura-aq10-i18n-v1',answerLanguages:langs.map((v,k)=>k===i?language:v)});}} required/>{label}</label>)}</div></fieldset>)}
    <div className="protocol-actions"><button className="button" disabled={busy||aqScore(record.aqVersion!,record.answers!)===null}>{t('Завершить анкету')}</button><button type="button" disabled={busy} onClick={()=>void store(record)}>{t('Сохранить черновик')}</button></div>
   </form><p className="protocol-note">© SBC/CA/BA/ARC/Cambridge University 1/5/12. Некоммерческое исследовательское использование. <a href={aqPage(record.aqVersion!)} target="_blank" rel="noreferrer">Оригинал и условия</a>.</p>
  </section>:!submitted&&(!assigned||!history.some(r=>r.status==='completed'))&&!record&&<section className="protocol-card setup-card">
   <div><span className="protocol-tag">{kind==='game'?'ПОДГОТОВКА К ИГРЕ':'ПЕРЕД ЗАПОЛНЕНИЕМ'}</span><h2>{kind==='game'?'Выберите возраст участника':'Подберём возрастную форму'}</h2>
   <label className="age-label">Полных лет<input type="number" min="4" max="17" step="1" value={years} disabled={assigned||state.records.some(r=>r.assessmentId===state.assessmentId)} onChange={e=>setYears(e.target.value)}/></label>
   <label className="age-label">{t('Пол пациента')}<select value={sex} onChange={e=>{const value=e.target.value as PatientSex;setSex(value);}}><option value="unspecified">{t('Не указан')}</option><option value="male">{t('Мужской')}</option><option value="female">{t('Женский')}</option></select></label>
   {!validAge&&<p>Доступный возраст: 4–17 лет.</p>}
   {validAge&&kind==='game'&&<><h3>{game==='bubbles'?'Пузырьки · 4–10 лет':'GEODE · 11–17 лет'}</h3><p>{game==='bubbles'?'Два пробных попадания, затем 20 секунд записи касаний. Лучше использовать планшет. Мышь сохраняется как отдельный способ ввода.':'В обоих режимах первые 10 проб — обучение. Если выйти раньше, запись будет отмечена как незавершённая.'}</p>
    {game==='geode'&&<label className="age-label">Режим игры<select value={geodeMode} onChange={e=>setGeodeMode(e.target.value==='full'?'full':'short')}><option value="short">Короткий · 40 проб</option><option value="full">Полный · 200 проб</option></select></label>}
    <p>{game==='bubbles'?'Взрослый может показать игру перед началом. Во время записи ребёнок действует самостоятельно.':'Нажимайте на компас и попробуйте понять, как собирать камни. В игре есть краткие вспышки.'}</p>
    <p className="protocol-note">Версия Neura по исследовательскому протоколу. Её клиническая точность не установлена. При переключении вкладки запись прерывается.</p></>}
   {validAge&&kind==='questionnaire'&&<><h3>AQ-10 {version==='child'?'Child · 4–11 лет':version==='adolescent'?'Adolescent · 12–15 лет':'Adult · самостоятельное заполнение'}</h3>
    <p>{version==='adult'?'Для 16–17 лет сохраняем балл взрослой формы для рассмотрения специалистом, без автоматического вывода.':'Анкету заполняет родитель. При 6 баллах и выше авторы рекомендуют рассмотреть направление на обследование.'}</p>
    <label className="protocol-check"><input type="checkbox" checked={applicable} onChange={e=>setApplicable(e.target.checked)}/>У участника нет интеллектуальных нарушений — условие применимости оригинального бланка.</label>
    <label className="protocol-check"><input type="checkbox" checked={english} onChange={e=>setEnglish(e.target.checked)}/>{t('Я понимаю вопросы на выбранном языке.')}</label>
    <p className="protocol-note">Если условия не подходят, специалист должен подобрать другую методику. Произвольный перевод не заменяет проверенную языковую версию.</p></>}
   <button className="button" disabled={busy||!validAge||(kind==='questionnaire'&&(!applicable||!english))} onClick={()=>void begin()}>{kind==='game'?'Начать игру':t('Начать анкету')}</button>
   </div><aside><h3>Что будет в результате</h3><p>{kind==='game'?'Число выполненных проб или касаний, время и исходные события.':'Ответы на 10 пунктов, сумма баллов и пояснение к результату.'}</p><p>Игра и анкета связаны одним обследованием, но их показатели не складываются в общий «балл РАС».</p><a href={kind==='game'?sources[game]:sources.aq} target="_blank" rel="noreferrer">Исследование методики</a></aside>
  </section>}
  {record?.kind==='game'&&record.status==='draft'&&!submitted&&<section className="protocol-card"><h2>Незавершённая игра</h2><p>Запись была прервана. Начнём новую попытку, чтобы не смешивать разные сеансы.</p><button disabled={busy} onClick={async()=>{if(await store({...record,status:'interrupted'}))setRecord(null);}}>Сохранить как прерванную</button></section>}
  {!assigned&&<div className="protocol-actions"><button disabled={busy||!!record} onClick={async()=>{const next={...state,assessmentId:crypto.randomUUID(),ageMonths:0};if(await persist(next)){setYears('');setSubmitted(null);}}}>Новое обследование</button><button onClick={()=>exportData(state)}>Скачать данные обследований</button></div>}
  {history.some(r=>r.id!==submitted?.id)&&<section className="protocol-card"><h2>Сохранённые записи</h2>{[...history].reverse().filter(r=>r.id!==submitted?.id).map(r=><details key={r.id}><summary>{instrumentLabel(r)} · {new Date(r.createdAt).toLocaleDateString('ru-RU')} · {r.status==='completed'?'Завершено':r.status==='draft'?'Черновик':'Прервано'}</summary><Result record={r} exportData={exportData}/>{r.status==='draft'&&r.kind==='questionnaire'&&!(assigned&&history.some(x=>x.status==='completed'))&&<button onClick={()=>{setRecord(r);setSubmitted(null);}}>Продолжить анкету</button>}</details>)}</section>}
 </div>;
}
export function Result({record:r,exportData=downloadRecord}:{record:RecordData;exportData?:(data:unknown)=>void}){
 const [prediction,setPrediction]=useState<{available?:boolean;percentile?:number;reason?:string;description?:string}|null>(null),[predicting,setPredicting]=useState(false),[predictionError,setPredictionError]=useState('');
 const score=r.aqVersion&&r.answers?aqScore(r.aqVersion,r.answers):null;
 const status=r.status==='completed'?'Завершено':r.status==='draft'?'Черновик':'Прервано';
 return <section className="protocol-result" aria-label={'Результат: '+instrumentLabel(r)}>
  <header className="result-header"><div><span className="protocol-tag">РЕЗУЛЬТАТ НАБЛЮДЕНИЯ</span><h2>{instrumentLabel(r)}</h2><p className="result-meta">{Math.floor(r.ageMonths/12)} лет · {new Date(r.createdAt).toLocaleString('ru-RU',{dateStyle:'medium',timeStyle:'short'})}</p></div><span className={'result-status '+r.status}>{status}</span></header>
  {r.kind==='questionnaire'?<div className="result-interpretation"><div><span className="result-label">Сумма баллов</span><strong className="protocol-score">{score??'—'} / 10</strong></div><p>{r.status==='completed'?aqInterpretation(r):'Анкета ещё не завершена. Итоговая интерпретация появится после ответа на все 10 вопросов.'}</p></div>:<>
   <dl className="result-metrics">{gameMetrics(r).map(m=><div key={m.label}><dt>{m.label}</dt><dd>{m.value}</dd><p>{m.note}</p></div>)}</dl>
   {r.status!=='completed'&&<p className="result-notice">Сеанс не завершён. Сохранены только выполненные действия; это не результат полного протокола.</p>}
   {r.instrument==='bubbles-neura'&&(r.touches??[]).filter(t=>!t.cancelled).length<3&&<p className="result-notice">Меньше трёх касаний: недостаточно данных для анализа моторики.</p>}
   <p className="result-explanation">Это показатели выполнения задания. По ним не рассчитаны диагноз или вероятность РАС.</p>
  </>}
  <details className="result-details"><summary>Подробности записи и протокола</summary><dl><dt>Методика</dt><dd>{r.protocolVersion}</dd><dt>Обследование</dt><dd>{r.assessmentId}</dd><dt>Запись</dt><dd>{r.id}</dd></dl>{r.instrument==='bubbles-neura'&&<p>Координаты в единицах поля 800 × 440, без миллиметровой калибровки. Способ ввода сохранён для каждого касания.</p>}</details>
  {r.status==='completed'&&r.protocolVersion===shortGeodeVersion&&<p className="result-explanation">Для короткого режима доступны показатели игры. Сравнение с моделью доступно в полном режиме.</p>}
  {r.status==='completed'&&r.protocolVersion!==shortGeodeVersion&&<div className="result-notice"><button disabled={predicting} onClick={async()=>{setPredicting(true);setPredictionError('');try{setPrediction(await api('/research/predict',{schemaVersion:1,assessmentId:r.assessmentId,ageMonths:r.ageMonths,records:[r]}));}catch(e){setPredictionError((e as Error).message);}finally{setPredicting(false);}}}>{predicting?'Анализируем…':'Сравнить с выборкой модели'}</button>{prediction&&<p>{prediction.available?`Перцентиль необычности профиля: ${prediction.percentile}. ${prediction.description}`:prediction.reason}</p>}{predictionError&&<p role="alert">{predictionError}</p>}</div>}<footer className="result-footer"><button className="button secondary" onClick={()=>exportData(r)}>Скачать запись JSON</button><Link to="/evidence">Научная основа методики</Link></footer>
 </section>;
}
function downloadRecord(data:unknown){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='neura-assessment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
