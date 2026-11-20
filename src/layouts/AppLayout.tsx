import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { SiteHeader, SiteFooter } from '../components/SiteChrome';
import { useT } from "../i18n";
import { PreferencesControls } from '../components/PreferencesControls';
export { Logo } from '../components/SiteChrome';
export default function AppLayout(){
 const t=useT();const {pathname}=useLocation();const reduce=useReducedMotion();
 if(pathname==='/account/family'||pathname==='/account')return <div className="family-frame"><header className="family-top"><Link to="/"><b>Neura</b></Link><nav><Link to="/evidence">{t("Научная основа")}</Link> · <Link to="/about">{t("О проекте")}</Link></nav><PreferencesControls/></header><main><Outlet/></main></div>;
 return <div className="app-shell lab-shell"><SiteHeader/><div className="app-main"><main className={'lab-main route-'+pathname.split('/')[1]}><motion.div key={pathname} initial={reduce?false:{opacity:0,y:14}} animate={{opacity:1,y:0}} transition={{duration:.55,ease:[.22,1,.36,1]}}><Outlet/></motion.div></main></div><SiteFooter/></div>;
}
