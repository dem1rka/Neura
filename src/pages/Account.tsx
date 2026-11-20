import { useT, localeTag } from '../i18n';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import '../styles/account.css';
import { Assign, FamilyHome, InviteForm } from './Family';
import '../styles/cabinet.css';
import { CabinetHero, AdminPanel, SpecialistAccess, roleNames, type Role } from './Cabinet';
import { activeParticipant, selectParticipant, service } from '../services/storage';
import { loadRecords } from '../features/screening/io';

type Participant = { id: string; label: string; owned:boolean };
type Observation = { id: string; kind: string; instrument_key: string; status: string; started_at: string };
import { api } from '../services/accountApi';
import SrsDemo from './SrsDemo';
import { LayoutDashboard, ClipboardList, Gamepad2, Scan } from 'lucide-react';
const tools = [
  {url:'/dashboard', label:'Обзор', Icon:LayoutDashboard},
  {url:'/questionnaire', label:'Анкеты', Icon:ClipboardList},
  {url:'/game', label:'Приключение Айко', Icon:Gamepad2},
  {url:'/mri', label:'Просмотр МРТ', Icon:Scan},
];
export default function Account() {
  const t = useT();
  const { area } = useParams();
  const [user, setUser] = useState<{ id:string; email: string; role: Role } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState(activeParticipant);
  const [records, setRecords] = useState<Observation[]>([]);
  const [detail, setDetail] = useState<unknown>(null);
  const [localRecordId, setLocalRecordId] = useState('');
  const localRecords = user ? loadRecords().filter(record => !record.demo) : [];
  const refresh = async () => {
    const next = await api<{id:string;email:string;role:Role;scope?:string}>('/auth/me');
    if(next.scope){location.replace('/assignments/'+next.scope);return;}
    setUser(next); if (next.role !== 'admin' && next.role !== 'family') setParticipants(await api<Participant[]>('/participants'));
  };
  useEffect(() => { refresh().catch(() => {}).finally(() => setLoading(false)); }, []);
  useEffect(() => {
    let active = true; setRecords([]); setDetail(null);
    if (selected) api<Observation[]>(`/participants/${selected}/observations`).then(v => { if (active) setRecords(v); })
      .catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [selected]);
  async function run(work: () => Promise<void>) {
    setBusy(true); setMessage('');
    try { await work(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Ошибка'); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    void run(async () => {
      await api('/auth/login', {email:data.get('email'),password:data.get('password')});
      await selectParticipant('');setSelected('');form.reset();await refresh();
    });
  }
  if (loading) return <section className="auth-loading" role="status"><span className="auth-spinner" />{t("Проверяем сессию…")} </section>;
  if (!user) return <section className="auth-page" aria-label={t("Личный кабинет")}>
    <aside className="auth-story">
      <span className="auth-eyebrow"><span />{t("ПРОСТРАНСТВО ЗАБОТЫ")} </span>
      <div className="auth-story-copy"><h1>{t("Большая забота.")} <br /><em>{t("Маленькие шаги.")} </em></h1>
        <p>{t("Наблюдайте, замечайте изменения")} <br />{t("и сохраняйте важные моменты в Neura.")} </p></div>
      <div className="auth-art" aria-hidden="true">
        <div className="auth-orbit auth-orbit-one" /><div className="auth-orbit auth-orbit-two" /><div className="auth-orbit auth-orbit-three" />
        <div className="auth-core"><Sparkles strokeWidth={1} size={54} /></div>
        <span className="auth-art-dot auth-dot-one" /><span className="auth-art-dot auth-dot-two" />
        <span className="auth-art-label">{t("КАЖДЫЙ ШАГ ИМЕЕТ ЗНАЧЕНИЕ")} </span>
      </div>
    </aside>
    <div className="auth-form-panel">
      <div className="auth-form-wrap">
        <div className="auth-form-icon"><LockKeyhole size={23} strokeWidth={1.5} /></div>
        <span className="auth-eyebrow auth-form-eyebrow">{t("ВАШЕ ПРОСТРАНСТВО В NEURA")} </span>
        <h2>{t("С возвращением")}</h2>
        <p className="auth-subtitle">{t("Войдите, чтобы продолжить работу с наблюдениями и результатами.")}</p>
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            <label className="auth-label" htmlFor="auth-email">{t("Электронная почта")} </label>
            <div className="auth-input-wrap"><Mail size={18} strokeWidth={1.5} /><input id="auth-email" name="email" type="email" placeholder="you@example.com" required maxLength={254} autoComplete="username" autoCapitalize="none" spellCheck={false} /></div>
            <label className="auth-label" htmlFor="auth-password">{t("Пароль")} </label>
            <div className="auth-input-wrap"><LockKeyhole size={18} strokeWidth={1.5} /><input id="auth-password" name="password" type={showPassword ? 'text' : 'password'} placeholder={t("Введите пароль")} required minLength={12} maxLength={128} autoComplete="current-password" aria-describedby="auth-password-hint" /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t("Скрыть пароль") : t("Показать пароль")} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
            <small id="auth-password-hint" className="auth-hint">{t("От 12 до 128 символов")} </small>
            {message && <div className="auth-message" role="status">{t(message)}</div>}
            <button className="auth-submit" type="submit" aria-busy={busy}><span>{busy ? t("Подождите…") : t("Войти в кабинет")}</span>{busy ? <span className="auth-spinner" /> : <ArrowRight size={20} />}</button>
          <details><summary>{t("Восстановление доступа")}</summary><p>{t("Запросите у администратора личную ссылку для восстановления доступа.")}</p></details></fieldset>
        </form>
      </div>
      <span className="auth-panel-footer">{t("С вниманием к каждому наблюдению.")} </span>
    </div>
  </section>;
  if (area !== user.role) return <Navigate to={`/account/${user.role}`} replace />;
  const logout = () => void run(async () => {
    await selectParticipant(''); await api('/auth/logout-all', {}); setUser(null);
    setParticipants([]); setSelected(''); setRecords([]); setDetail(null);
  });
  return <section className={`cabinet cabinet-${user.role}`}>
    <CabinetHero role={user.role} email={user.email} logout={logout} busy={busy}/>
    {message && <p className="cabinet-notice" role="status">{t(message)}</p>}
    <nav className="cabinet-tools" aria-label={t("Анализы")}>
      {tools.map(({url,label,Icon})=>
        <Link key={url} to={url}><span className="cabinet-tile-icon"><Icon size={21} aria-hidden/></span>
          <strong>{t(label)}</strong><ArrowUpRight className="cabinet-tile-arrow" size={15} aria-hidden/></Link>)}
    </nav>
    {['specialist','admin'].includes(user.role) && <SrsDemo/>}
    {user.role === 'family' ? <FamilyHome/> : user.role === 'admin' ? <AdminPanel self={user.id}/> : <>
      <section className="cabinet-panel">
      <h2>{t("Карточки участников")} </h2>
      <form onSubmit={e => { e.preventDefault(); const form = e.currentTarget; const data = new FormData(form);
        void run(async () => { const p = await api<Participant>('/participants', { label: data.get('label') });
          await refresh(); setSelected(p.id); form.reset(); }); }}>
        <label>{t("Код или псевдоним")} <input name="label" required maxLength={120} placeholder={t("Участник 001")} /></label>
        <button className="button" disabled={busy}>{t("Создать карточку")} </button>
      </form>
      <label>{t("Выбранная карточка")} <select value={selected} onChange={e => setSelected(e.target.value)}>
        <option value="">{t("Выберите участника")} </option>
        {participants.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select></label>
      {activeParticipant() && <p role="status">{t("Активная карточка")}: {participants.find(p => p.id === activeParticipant())?.label || activeParticipant()}</p>}
      {selected && <>
        {user.role === "specialist" && participants.find(p=>p.id===selected)?.owned && <><InviteForm key={selected} child={selected}/><Assign id={selected}/></>}
        {participants.find(p => p.id === selected)?.owned && <SpecialistAccess key={selected} id={selected}/>}
        <button className="button" disabled={busy} onClick={() => void run(async () => {
          await selectParticipant(selected); setMessage("Изменения в играх, анкетах и истории МРТ сохраняются в выбранную карточку.");
        })}>{t("Работать с этой карточкой")}</button>
        {activeParticipant() === selected && <>
        <h2>{t("Сохранение результатов")} </h2>
        {(['game', 'questionnaire'] as const).map(kind => <button key={kind} className="button secondary" disabled={busy}
          onClick={() => void run(async () => {
            const payload = kind === 'game' ? service.game() : service.questionnaire();
            if (!payload || !Object.keys(payload.answers).length) throw new Error("Нет локальных ответов для сохранения");
            await api(`/participants/${selected}/observations`, { kind, instrument_key: kind === 'game' ? 'neura-game' : 'teacher',
              instrument_version: '1', payload, status: payload.completedAt ? 'completed' : 'draft' });
            setRecords(await api<Observation[]>(`/participants/${selected}/observations`)); setMessage("Сохранено в базе");
          })}>{kind === 'game' ? t("Сохранить последнюю игру") : t("Сохранить анкету педагога")}</button>)}
        <form onSubmit={event => { event.preventDefault(); void run(async () => {
          const payload = localRecords.find(record => record.id === localRecordId);
          if (!payload) throw new Error("Выберите локальное наблюдение");
          await api(`/participants/${selected}/observations`, { kind: 'questionnaire', instrument_key: 'screening',
            instrument_version: '1', language: payload.language, age_months: payload.ageMonths, payload, status: 'completed' });
          setRecords(await api<Observation[]>(`/participants/${selected}/observations`)); setMessage("Анкета сохранена в выбранную карточку");
        }); }}>
          <label>{t("Локальная анкета")} <select required value={localRecordId} onChange={e => setLocalRecordId(e.target.value)}>
            <option value="">{t("Выберите наблюдение")} </option>
            {localRecords.map(record => <option key={record.id} value={record.id}>{record.id} · {record.date}</option>)}
          </select></label>
          <button className="button secondary" disabled={busy || !localRecordId}>{t("Сохранить выбранную анкету")} </button>
        </form>
        </>}
        <h2>{t("История в базе")} </h2>
        {records.length === 0 ? <p>{t("Пока нет сохранённых наблюдений.")} </p> : <ul>{records.map(record => <li key={record.id}>
          <button disabled={busy} onClick={() => void run(async () => setDetail(await api(`/observations/${record.id}`)))}>
            {record.instrument_key} · {new Date(record.started_at).toLocaleString(localeTag())} · {record.status}
          </button>
        </li>)}</ul>}
        {detail !== null && <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(detail, null, 2)}</pre>}
      </>}
      </section>
    </>}
  </section>;
}
