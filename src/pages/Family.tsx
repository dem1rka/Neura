import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ArrowUpRight, Check, Circle, Gamepad2, ClipboardList, Leaf } from 'lucide-react';
import { api } from '../services/accountApi';
import { useT } from '../i18n';
import { PreferencesControls } from '../components/PreferencesControls';
import { openAnalysisWorkspace } from '../services/storage';
import '../styles/family.css';

type Progress={answers:number[];revision:number;completed_at:string|null};
type Task={id:string;kind:'game'|'questionnaire';assignment_attempts:Progress|null};
type Child={id:string;label:string;assessments:{id:string;assignments:Task[]}[]};
const title={game:'Игра с Айко',questionnaire:'Анкета для родителя'};
function Notice({text}:{text:string}){const t=useT();return text?<p role="status" className="family-notice">{t(text)}</p>:null;}

export function PrivatePage({children}:{children:ReactNode}){
 const {pathname}=useLocation(),t=useT();
 const [result,setResult]=useState(''),[scope,setScope]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
   let live=true;
   setResult('');
   api<{id:string;scope?:string}>('/auth/me').then(async user=>{
     if(!live)return;
     if(user.scope && pathname!=='/assignments/'+user.scope){
       setScope(user.scope);setResult('child');return;
     }
     if(!pathname.startsWith('/assignments/')) await openAnalysisWorkspace(user.id);
     if(live)setResult('ready');
   }).catch(e=>{if(live)setResult(e.status===401?'guest':'error')});
   return()=>{live=false};
 },[pathname,retry]);
 if(!result)return <p role="status">{t('Проверяем сессию…')}</p>;
 if(result==='guest')return <Navigate replace to="/account"/>;
 if(result==='child')return <Navigate replace to={'/assignments/'+scope}/>;
 if(result==='error')return <div role="alert">{t('Не удалось открыть карточку участника')} <button onClick={()=>setRetry(n=>n+1)}>{t('Повторить')}</button></div>;
 return <>{children}</>;
}

export function InviteForm({child}:{child?:string}){
 const t=useT(),[role,setRole]=useState('specialist'),[url,setUrl]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 async function issue(e:FormEvent<HTMLFormElement>){e.preventDefault();const email=new FormData(e.currentTarget).get('email');setBusy(true);setMsg('');setUrl('');
 try{const r=await api<{token:string}>('/invitations',{email,role:child?'family':role,child});setUrl(location.origin+'/invite#'+r.token);}
 catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}
 return <section className="family-box"><h3>{t(child?'Пригласить семью':'Приглашение в Neura')}</h3><form onSubmit={issue}>
 {!child&&<label>{t('Тип аккаунта')}<select value={role} onChange={e=>setRole(e.target.value)}><option value="specialist">{t('Специалист')}</option><option value="patient">{t('Пациент')}</option></select></label>}
 <label>Email<input required name="email" type="email"/></label><button disabled={busy}>{t('Создать приглашение')}</button></form>
 {url&&<label>{t('Личная ссылка · действует 48 часов')}<input readOnly value={url} onFocus={e=>e.target.select()}/></label>}<Notice text={msg}/></section>;
}

export function AcceptInvite({recovery=false}:{recovery?:boolean}){
 const t=useT(),[msg,setMsg]=useState(''),[done,setDone]=useState(false),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);try{
 await api(recovery?'/recovery/accept':'/invitations/accept',{token:location.hash.slice(1),password:new FormData(e.currentTarget).get('password')});
 history.replaceState(null,'',recovery?'/recover':'/invite');setDone(true);
 }catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}
 return <main className="family-shell"><PreferencesControls/><section className="family-box"><h1>{t(recovery?'Восстановление доступа':'Приглашение в Neura')}</h1>
 {done?<Link to="/account">{t('Войти в кабинет')}</Link>:<form onSubmit={submit}><p>{recovery?t('Сохранить пароль'):t('Для нового аккаунта придумайте пароль. Для добавления ребёнка в существующий кабинет введите текущий пароль.')}</p>
 <label>{t('Пароль')}<input name="password" type="password" minLength={12} maxLength={128} required/></label><button disabled={busy}>{t(recovery?'Сохранить пароль':'Принять приглашение')}</button></form>}
 <Notice text={msg}/></section></main>;
}

export function Assign({id}:{id:string}){
 const t=useT(),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const [list,setList]=useState<{id:string;assignments:Task[]}[]>([]),[refresh,setRefresh]=useState(0);
 useEffect(()=>{let live=true;api<typeof list>('/children/'+id+'/assessments').then(r=>{if(live)setList(r)}).catch(e=>{if(live)setMsg(e.message)});return()=>{live=false}},[id,refresh]);
 return <section className="family-box"><h3>{t('Новое обследование')}</h3><form onSubmit={async e=>{e.preventDefault();const kinds=new FormData(e.currentTarget).getAll('kind');if(!kinds.length){setMsg('Выберите задание');return}setBusy(true);
 try{await api('/children/'+id+'/assessments',{kinds});setMsg('Назначение сохранено');setRefresh(n=>n+1)}catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}}>
 {(['questionnaire','game'] as const).map(k=><label key={k}><input name="kind" type="checkbox" defaultChecked value={k}/>{t(title[k])}</label>)}
 <button disabled={busy}>{t('Назначить')}</button></form>{list.map(a=><div key={a.id}>{a.assignments.map(task=><p key={task.id}>{t(title[task.kind])} · {task.assignment_attempts?.revision??0}/3</p>)}</div>)}<Notice text={msg}/></section>;
}

export function FamilyHome(){
 const t=useT(),[children,setChildren]=useState<Child[]|null>(null),[id,setId]=useState(''),[msg,setMsg]=useState('');
 useEffect(()=>{api<Child[]>('/family/children').then(setChildren).catch(e=>setMsg(e.message));},[]);
 const child=children?.find(c=>c.id===id)??children?.[0],tasks=child?.assessments.flatMap(a=>a.assignments)??[];
 return <div className="family-box"><h2>{t('Мои дети')}</h2><div className="family-tabs">
 {children?.map(c=><button key={c.id} aria-pressed={c.id===child?.id} onClick={()=>setId(c.id)}>{c.label}</button>)}</div>
 {child&&<h3>{t('Задания')} · {child.label}</h3>}{children&&!tasks.length&&<p>{t('Назначений пока нет')}</p>}
 {tasks.map(a=><Link className="family-row" key={a.id} to={'/assignments/'+a.id}>{a.kind==='game'?<Gamepad2/>:<ClipboardList/>}<span><strong>{t(title[a.kind])}</strong><small>{t(a.assignment_attempts?.completed_at?'Завершено':a.assignment_attempts?'Продолжить':'Начать')}</small></span><ArrowUpRight/></Link>)}<Notice text={msg}/></div>;
}
const game=[
 ['Айко пришёл на праздник. Как он поздоровается?','Помашет рукой','Скажет «привет»','Подойдёт позже'],
 ['Друг уронил карандаши. Что сделает Айко?','Поможет собрать','Позовёт взрослого','Спросит друга'],
 ['Пора выбрать занятие. Что выберет Айко?','Рисовать','Собрать конструктор','Поиграть вместе']
];
const questions=['Ребёнок сам начинает общение?','Ребёнок просит о помощи во время игры?','Ребёнок присоединяется к совместной игре?'];
export function Assignment(){
 const {id}=useParams(),t=useT(),[task,setTask]=useState<(Task&{child_mode:boolean;assessments:{participants:{label:string}}})|null>(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let live=true;api<NonNullable<typeof task>>('/assignments/'+id).then(v=>{if(live)setTask(v)}).catch(e=>{if(live)setMsg(e.message)});return()=>{live=false}},[id]);
 const attempt=task?.assignment_attempts,step=attempt?.revision??0,done=!!attempt?.completed_at,isGame=task?.kind==='game';
 async function answer(index:number){if(!task||busy)return;setBusy(true);setMsg('');try{
 const data=await api<Progress>('/assignments/'+id+'/steps',{revision:step,answer:index});setTask({...task,assignment_attempts:data});
 }catch(e){setMsg((e as Error).message);try{setTask(await api('/assignments/'+id))}catch{/* keep current answer for retry */}}finally{setBusy(false)}}
 async function enter(){if(!task||busy)return;setBusy(true);try{await api('/assignments/'+id+'/enter',{});localStorage.setItem('neura.session-change',String(Date.now()));location.reload()}catch(e){setMsg((e as Error).message);setBusy(false)}}
 async function leave(){await api('/auth/logout',{});location.replace('/account')}
 return <main className="family-shell"><div className="family-top">{task?.child_mode?<button onClick={()=>void leave().catch(e=>setMsg(e.message))}>{t('Вход для родителя')}</button>:<Link to="/account">{t('Личный кабинет')}</Link>}<PreferencesControls/></div>
 {task&&<section className="family-box child-task"><small>{task.assessments.participants.label} · {t(title[task.kind])}</small>
 {done?<><Check/><h1>{t('Задание завершено')}</h1><p>{t('Ответы отправлены специалисту.')}</p>{!task.child_mode&&<Link to="/account">{t('Мои дети')}</Link>}</>:isGame&&!task.child_mode?<><h1>{t('Детский режим')}</h1><p>{t('После игры для открытия семейного кабинета потребуется пароль родителя.')}</p><button disabled={busy} onClick={()=>void enter()}>{t('Начать игру')}</button></>:<>
 <div className="family-progress" aria-label={step+1+' / 3'}>{[0,1,2].map(i=><i key={i} data-active={i<=step}/>)}</div>
 <div key={step} className="task-step">{isGame?<Leaf/>:<Circle/>}<h1>{t(isGame?game[step][0]:questions[step])}</h1>
 <div className="answer-grid">{(isGame?game[step].slice(1):['Часто','Иногда','Пока не наблюдали']).map((a,i)=><button disabled={busy} key={a} onClick={()=>void answer(i)}>{t(a)}</button>)}</div></div></>}
 </section>}<Notice text={msg}/></main>;
}
