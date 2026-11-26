import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ArrowUpRight, Gamepad2, ClipboardList } from 'lucide-react';
import { api } from '../services/accountApi';
import { useT } from '../i18n';
import { PreferencesControls } from '../components/PreferencesControls';
import { openAnalysisWorkspace } from '../services/storage';
import '../styles/family.css';
import {instrumentLabel} from '../features/assessment/protocol';
import Assessment, {Result, type AssessmentState} from '../features/assessment/Assessment';

type Progress={answers:number[];revision:number;completed_at:string|null};
type Task={id:string;version?:string;research?:AssessmentState;kind:'game'|'questionnaire';assignment_attempts:Progress|null};
type Child={id:string;label:string;assessments:{id:string;assignments:Task[]}[]};
const title={game:'Исследовательская игра',questionnaire:'Анкета AQ-10'};
function Notice({text}:{text:string}){const t=useT();return text?<p role="status" className="family-notice">{t(text)}</p>:null;}

export function PrivatePage({children}:{children:ReactNode}){
 const {pathname}=useLocation(),t=useT();
 const [result,setResult]=useState(''),[scope,setScope]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
   let live=true;
   setResult('');
   api<{id:string;scope?:string;role?:string}>('/auth/me').then(async user=>{
     if(!live)return;
     if(user.scope && pathname!=='/assignments/'+user.scope){
       setScope(user.scope);setResult('child');return;
     }
     if(user.role==='family'&&/^\/(?:legacy\/)?(?:game|questionnaire)(?:\/|$)/.test(pathname)){setResult('family-module');return;}
     if(!pathname.startsWith('/assignments/')) await openAnalysisWorkspace(user.id);
     if(live)setResult('ready');
   }).catch(e=>{if(live)setResult(e.status===401?'guest':'error')});
   return()=>{live=false};
 },[pathname,retry]);
 if(!result)return <p role="status">{t('Проверяем сессию…')}</p>;
 if(result==='guest')return <Navigate replace to="/account"/>;
 if(result==='child')return <Navigate replace to={'/assignments/'+scope}/>;
 if(result==='family-module')return <FamilyModule kind={pathname.includes('questionnaire')?'questionnaire':'game'}/>;
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
 return <section className="family-box"><h3>{t('Новое обследование')}</h3><form onSubmit={async e=>{e.preventDefault();const form=new FormData(e.currentTarget);const ageMonths=Number(form.get('age'))*12;const kinds=form.getAll('kind');if(!kinds.length){setMsg('Выберите задание');return}setBusy(true);
 try{await api('/children/'+id+'/assessments',{kinds,ageMonths,sex:form.get('sex')});setMsg('Назначение сохранено');setRefresh(n=>n+1)}catch(e){setMsg((e as Error).message)}finally{setBusy(false)}}}>
 <label>Полных лет<input name="age" type="number" min="4" max="17" step="1" required/></label><label>{t('Пол пациента')}<select name="sex"><option value="unspecified">{t('Не указан')}</option><option value="male">{t('Мужской')}</option><option value="female">{t('Женский')}</option></select></label>
 {(['questionnaire','game'] as const).map(k=><label key={k}><input name="kind" type="checkbox" defaultChecked value={k}/>{t(title[k])}</label>)}
 <button disabled={busy}>{t('Назначить')}</button></form>{list.map(a=><div key={a.id}>{a.assignments.map(task=><p key={task.id}>{t(title[task.kind])} · {task.version==='research-v1'?(task.assignment_attempts?.completed_at?'Завершено':'В процессе'):'Прежняя версия · требуется обновление'}</p>)}{a.assignments.flatMap(task=>task.research?.records??[]).map(r=><details key={r.id}><summary>{instrumentLabel(r)} · {r.status==='completed'?'Завершено':r.status==='draft'?'Черновик':'Прервано'}</summary><Result record={r}/></details>)}</div>)}<Notice text={msg}/></section>;
}

export function FamilyHome(){
 const t=useT(),[children,setChildren]=useState<Child[]|null>(null),[id,setId]=useState(''),[msg,setMsg]=useState('');
 useEffect(()=>{api<Child[]>('/family/children').then(setChildren).catch(e=>setMsg(e.message));},[]);
 const child=children?.find(c=>c.id===id)??children?.[0],tasks=child?.assessments.flatMap(a=>a.assignments)??[];
 return <div className="family-box"><h2>{t('Мои дети')}</h2><div className="family-tabs">
 {children?.map(c=><button key={c.id} aria-pressed={c.id===child?.id} onClick={()=>setId(c.id)}>{c.label}</button>)}</div>
 {child&&<h3>{t('Задания')} · {child.label}</h3>}{children&&!tasks.length&&<p>{t('Назначений пока нет')}</p>}
 {tasks.map(a=><Link className="family-row" key={a.id} to={'/assignments/'+a.id}>{a.kind==='game'?<Gamepad2/>:<ClipboardList/>}<span><strong>{t(title[a.kind])}</strong><small>{t(a.version!=='research-v1'?'Обновить задание':a.assignment_attempts?.completed_at?'Завершено':a.assignment_attempts?'Продолжить':'Начать')}</small></span><ArrowUpRight/></Link>)}<Notice text={msg}/></div>;
}
export function Assignment(){
 const {id}=useParams(),t=useT(),[task,setTask]=useState<(Task&{child_mode:boolean;assessments:{participants:{label:string}}})|null>(null),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 const [age,setAge]=useState('');
 useEffect(()=>{let live=true;api<NonNullable<typeof task>>('/assignments/'+id).then(v=>{if(live)setTask(v)}).catch(e=>{if(live)setMsg(e.message)});return()=>{live=false}},[id]);
 const done=!!task?.assignment_attempts?.completed_at,isGame=task?.kind==='game';
 async function enter(){if(!task||busy)return;setBusy(true);try{await api('/assignments/'+id+'/enter',{});localStorage.setItem('neura.session-change',String(Date.now()));location.reload()}catch(e){setMsg((e as Error).message);setBusy(false)}}
 async function leave(){await api('/auth/logout',{});location.replace('/account')}
 async function upgrade(e:FormEvent){e.preventDefault();setBusy(true);setMsg('');try{await api('/assignments/'+id+'/upgrade',{ageMonths:Number(age)*12});setTask(await api('/assignments/'+id));}catch(e){setMsg((e as Error).message);}finally{setBusy(false);}}
 return <main className="family-shell assignment-shell"><div className="family-top">{task?.child_mode?<button onClick={()=>void leave().catch(e=>setMsg(e.message))}>{t('Вход для родителя')}</button>:<Link to="/account">{t('Личный кабинет')}</Link>}<PreferencesControls/></div>
 {!task&&!msg&&<p role="status">Загружаем задание…</p>}
 {task&&<section className="family-box child-task"><small>{task.assessments.participants.label} · {t(title[task.kind])}</small>
 {task.version!=='research-v1'?<><h1>Обновление методики</h1><p>Это назначение создано для прежнего модуля. Для перехода к текущим играм и AQ-10 укажите возраст участника. Обновятся игра и анкета этого обследования; старые ответы сохранятся отдельно.</p>{task.child_mode?<p>Для обновления войдите в кабинет родителя.</p>:<form onSubmit={upgrade}><label>Полных лет<input type="number" min="4" max="17" step="1" required value={age} onChange={e=>setAge(e.target.value)}/></label><button disabled={busy}>Обновить задания</button></form>}</>
 :!task.research?<p role="alert">Не найдены параметры обследования. Обратитесь к назначившему задание специалисту.</p>
 :isGame&&!task.child_mode&&!done?<><h1>{task.research.ageMonths<132?'Пузырьки · 4–10 лет':'GEODE · 11–17 лет'}</h1><p>Та же методика, что и в разделе «Игры». Возраст назначен специалистом: {Math.floor(task.research.ageMonths/12)} лет.</p><p>{t('После игры для открытия семейного кабинета потребуется пароль родителя.')}</p><button disabled={busy} onClick={()=>void enter()}>{t('Начать игру')}</button></>
 :<Assessment key={task.id+task.version} kind={task.kind} initial={task.research} assigned save={async state=>{await api('/assignments/'+id+'/research',state);return true;}}/>}
 </section>}<Notice text={msg}/></main>;
}

function FamilyModule({kind}:{kind:'game'|'questionnaire'}) {
 const [children,setChildren]=useState<Child[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;api<Child[]>('/family/children').then(data=>{if(live)setChildren(data)}).catch(e=>{if(live)setError(e.message)});return()=>{live=false}},[]);
 const tasks=children?.flatMap(child=>{const task=child.assessments.flatMap(a=>a.assignments).find(a=>a.kind===kind);return task?[{child,task}]:[]})??[];
 if(tasks.length===1)return <Navigate replace to={'/assignments/'+tasks[0].task.id}/>;
 return <section className="family-box"><h1>{title[kind]}</h1>{error?<p role="alert">{error}</p>:!children?<p role="status">Загружаем назначения…</p>:tasks.length?<><p>Выберите участника. Здесь открываются те же назначения, что и в личном кабинете.</p>{tasks.map(({child,task})=><Link className="family-row" key={task.id} to={'/assignments/'+task.id}>{child.label}<ArrowUpRight/></Link>)}</>:<p>Назначений пока нет. Попросите специалиста назначить обследование.</p>}<Link to="/account">Личный кабинет</Link></section>;
}
