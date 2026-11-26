import { useEffect, useState, type FormEvent } from 'react';
import { Heart, Stethoscope, ShieldCheck, LogOut, UsersRound, KeyRound } from 'lucide-react';
import { useT } from '../i18n';
import { InviteForm } from './Family';
import { api } from '../services/accountApi';

export const roleNames = { family:'Семья', patient:'Пациент', specialist:'Специалист', admin:'Администратор' };
export type Role = keyof typeof roleNames;
type AccountRow = {id:string;email:string;role:Role;disabled_at:string|null};
const titles = {family:'Семейный кабинет',patient:'Мои наблюдения', specialist:'Кабинет специалиста', admin:'Управление аккаунтами'};
const icons = {family:Heart,patient:Heart, specialist:Stethoscope, admin:ShieldCheck};

export function CabinetHero({role,email,logout,busy}:{role:Role;email:string;logout:()=>void;busy:boolean}) {
  const Icon = icons[role], t=useT();
  return <header className="cabinet-hero"><div>
    <div className="cabinet-role"><Icon size={18}/>{t(roleNames[role])}</div>
    <h1>{t(titles[role])}</h1><p>{email}</p>
  </div><button disabled={busy} onClick={logout}><LogOut size={16}/>{t("Выйти на всех устройствах")}</button></header>;
}
export function SpecialistAccess({id}:{id:string}) {
  const t=useT(), [message,setMessage]=useState(''), [busy,setBusy]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f=e.currentTarget, email=new FormData(f).get('email');
    const grant=((e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement)?.value!=='revoke';
    setBusy(true);
    try {await api(`/participants/${id}/specialist`,{email,grant});setMessage(grant?'Доступ выдан':'Доступ отозван');f.reset();}
    catch(err){setMessage((err as Error).message);} finally{setBusy(false);}
  }
  return <details className="cabinet-access"><summary><KeyRound size={16}/>{t('Доступ специалиста')}</summary>
    <form onSubmit={submit}><label>Email <input name="email" type="email" required/></label>
    <button className="button" disabled={busy} value="grant">{t('Выдать доступ')}</button>
    <button className="button secondary" disabled={busy} value="revoke">{t('Отозвать')}</button></form>
    {message && <p role="status">{t(message)}</p>}</details>;
}
export function AdminPanel({self}:{self:string}) {
  const t=useT(), [rows,setRows]=useState<AccountRow[]>([]), [error,setError]=useState(''), [busy,setBusy]=useState(false);
  const [resetLink,setResetLink]=useState('');
  async function refresh(){setRows(await api<AccountRow[]>('/admin/users'));}
  useEffect(()=>{const update=()=>{void refresh().catch(err=>setError(err.message));};update();window.addEventListener('neura-account-created',update);return()=>window.removeEventListener('neura-account-created',update);},[]);
  async function change(work:()=>Promise<void>){setBusy(true);setError('');try{await work();await refresh();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <div className="cabinet-admin">
    <InviteForm/>
    <section className="cabinet-panel"><div className="cabinet-heading"><UsersRound/><h2>{t('Аккаунты')}</h2><span>{rows.length}</span></div>
    {resetLink && <label>{t("Восстановление доступа")}<input readOnly value={resetLink} onFocus={e=>e.target.select()}/></label>}
    {error && <p role="alert">{t(error)}</p>}
    <ul className="cabinet-users">{rows.map(r=><li key={r.id}><div><strong>{r.email}</strong><small>{t(roleNames[r.role])} · {t(r.disabled_at?'Заблокирован':'Активен')}</small></div>
      {r.role!=='admin' && !r.disabled_at && <button className="button secondary" disabled={busy} onClick={()=>void change(async()=>{const res=await api<{token:string}>('/recovery/issue',{id:r.id});setResetLink(location.origin+'/recover#'+res.token);})}>{t('Восстановление доступа')}</button>}
      {r.role!=='admin' && r.id!==self && <button disabled={busy} className="button secondary" onClick={()=>void change(async()=>{await api(`/admin/users/${r.id}/status`,{disabled:!r.disabled_at});})}>{t(r.disabled_at?'Разблокировать':'Заблокировать')}</button>}</li>)}</ul>
    </section></div>;
}

export function CreateAccount({child}:{child?:string}){
 const t=useT(),[role,setRole]=useState<'specialist'|'patient'|'family'>(child?'family':'patient'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [created,setCreated]=useState<{email:string;password:string;role:Role}|null>(null);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=e.currentTarget,email=new FormData(form).get('email');setBusy(true);setError('');setCreated(null);
  try{setCreated(await api('/accounts',{email,role,...(child?{child}:{})}));form.reset();window.dispatchEvent(new Event('neura-account-created'));}
  catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <section className="cabinet-panel"><h2>{t(child?'Создать аккаунт семьи для ребёнка':'Создать аккаунт напрямую')}</h2>
 <form onSubmit={submit}><label>Email<input name="email" type="email" autoComplete="off" required maxLength={254}/></label>
 {!child&&<label>{t('Тип аккаунта')}<select value={role} onChange={e=>setRole(e.target.value as typeof role)}>{(['specialist','patient','family'] as const).map(r=><option key={r} value={r}>{t(roleNames[r])}</option>)}</select></label>}
 <button className="button" disabled={busy}>{t(busy?'Создаём…':'Создать аккаунт')}</button></form>
 {error&&<p role="alert">{t(error)}</p>}
 {created&&<div role="status"><p>{t('Аккаунт создан. Передайте данные для входа пользователю. Пароль показывается только сейчас.')}</p><label>Email<input readOnly value={created.email}/></label><label>{t('Пароль')}<input readOnly autoComplete="off" value={created.password} onFocus={e=>e.target.select()}/></label><p>{t(roleNames[created.role])}</p><button className="button secondary" onClick={()=>setCreated(null)}>{t('Скрыть данные для входа')}</button></div>}
 {!child&&role==='family'&&<p>{t('Для связи с ребёнком создайте семейный аккаунт из выбранной карточки участника или отправьте приглашение существующей семье.')}</p>}
 </section>;
}
