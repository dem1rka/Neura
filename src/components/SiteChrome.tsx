import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowUpRight, Command, Menu, X } from 'lucide-react';
import { PreferencesControls } from './PreferencesControls';
import { useT } from '../i18n';
export function Logo(){const t=useT();return <Link className="logo lab-logo" to="/" aria-label={t("Neura — главная")}><span className="logo-icon"><Command size={23}/></span><span>NEURA<span className="logo-dot">.</span></span></Link>;}
export function SiteHeader(){
 const t=useT();const {pathname}=useLocation();const [open,setOpen]=useState(false);const [scrolled,setScrolled]=useState(false);const dialog=useRef<HTMLDialogElement>(null);const toggle=useRef<HTMLButtonElement>(null);
 const links=[['/','Главная'],['/account','Личный кабинет'],['/dashboard','Обзор'],['/game','Игры для наблюдения'],['/questionnaire','Анкета AQ-10'],['/mri','Просмотр МРТ'],['/evidence','Научная основа'],['/about','О проекте']];
 useEffect(()=>{const update=()=>setScrolled(window.scrollY>100);update();window.addEventListener('scroll',update,{passive:true});return()=>window.removeEventListener('scroll',update);},[]);
 useEffect(()=>{setOpen(false);},[pathname]);
 useEffect(()=>{const d=dialog.current;if(!d)return;if(open){d.showModal();const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;d.close();};}else d.close();},[open]);
 return <><header className={'lab-header '+(scrolled?'scrolled':'')}><Logo/><Link className="lab-wordmark" to="/">NEURA <span>RESEARCH SPACE</span></Link><div className="lab-header-tools"><div className="lab-desktop-preferences"><PreferencesControls/></div><button ref={toggle} className="lab-menu-toggle" aria-label={t('Меню')} aria-expanded={open} aria-controls="lab-menu" onClick={()=>setOpen(true)}><Menu size={23}/></button></div></header>
 <dialog ref={dialog} id="lab-menu" className="lab-menu" onCancel={()=>setOpen(false)} onClick={e=>{if(e.target===e.currentTarget)setOpen(false);}} aria-label={t('Меню')}><div className="lab-menu-panel"><div className="lab-menu-top"><span>NEURA / EXPLORE</span><button className="lab-menu-toggle" aria-label={t('Закрыть меню')} onClick={()=>setOpen(false)}><X/></button></div><nav>{links.map(([to,label],i)=><NavLink end={to==='/'} key={to} to={to} onClick={()=>setOpen(false)}><small>0{i+1}</small><span>{t(label)}</span><ArrowUpRight size={24}/></NavLink>)}</nav><div className="lab-menu-bottom"><PreferencesControls/><p>{t('Большая забота.')} {t('Маленькие шаги.')}</p></div></div></dialog></>;
}
export function SiteFooter(){const t=useT();return <footer className="lab-footer"><div><Logo/><p>{t('Технологии с вниманием к ребёнку')}</p></div><nav><Link to="/dashboard">{t('Открыть платформу')} ↗</Link><Link to="/evidence">{t('Научная основа')} ↗</Link><Link to="/about">{t('О проекте')} ↗</Link></nav><span>NEURA · RESEARCH & OBSERVATION</span></footer>;}
export function PageMotion(){
 const {pathname}=useLocation();
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('lab-visible');observer.unobserve(entry.target);}}),{threshold:0.08});
  const seen=new WeakSet<Element>();
  const scan=()=>document.querySelectorAll('.landing-section,.lab-section,.card,.page-heading,.welcome-banner,.island-intro').forEach(el=>{if(seen.has(el)||el.closest('.mri-viewport'))return;seen.add(el);el.classList.add('lab-reveal');observer.observe(el);});
  scan();const mutations=new MutationObserver(scan);mutations.observe(document.getElementById('root')!,{childList:true,subtree:true});
  return()=>{observer.disconnect();mutations.disconnect();document.querySelectorAll('.lab-reveal').forEach(el=>el.classList.remove('lab-reveal','lab-visible'));};
 },[pathname]);
 return null;
}
