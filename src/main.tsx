import { useT, localeTag, applyAppearance } from "./i18n";
import React, { lazy, Suspense, useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import AppLayout from "./layouts/AppLayout";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Account from "./pages/Account";
import About from "./pages/About";
import Evidence from "./pages/Evidence";
import Game from "./features/game/Game";
import GameReport from "./features/game/GameReport";
import Questionnaire from "./features/questionnaire/Questionnaire";
import QuestionnaireReport from "./features/questionnaire/QuestionnaireReport";
import Screening from "./features/screening/Screening";
import { Empty } from "./components/UI";
import "./styles/index.css";
import { PageMotion } from "./components/SiteChrome";
import { PrivatePage, Assignment, AcceptInvite } from "./pages/Family";
import { Navigate, Outlet } from "react-router-dom";
applyAppearance();
window.addEventListener('storage', e=>{if(e.key==='neura.session-change')location.reload();});
const MRI = lazy(() => import("./features/mri/MRI"));
function App() {
  const t = useT();
  const { pathname, hash } = useLocation();
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  useEffect(() => {
    const handler = () => setStorageError(true);
    window.addEventListener("neura-storage-error", handler);
    return () => window.removeEventListener("neura-storage-error", handler);
  }, []);
  return (
    <>
      <PageMotion />
      {storageError && (
        <div role="alert" className="storage-alert">
          {t(
            "Не удалось сохранить изменения. Проверьте подключение и доступ к записи.",
          )}
          <button
            onClick={() => setStorageError(false)}
            aria-label={t("Закрыть уведомление")}
          >
            ×
          </button>
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing/>}/>
        <Route path="/recover" element={<AcceptInvite key={hash} recovery/>}/>
        <Route path="/invite" element={<AcceptInvite key={hash}/>}/>
        <Route path="/assignments/:id" element={<PrivatePage key={pathname}><Assignment key={pathname}/></PrivatePage>}/>
        <Route element={<AppLayout />}>
          <Route path="/about" element={<About />} />
          <Route path="/evidence" element={<Evidence />} />
          <Route path="/account/:area?" element={<Account />} />
          <Route element={<PrivatePage key={pathname}><Outlet/></PrivatePage>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/game" element={<Game />} />
          <Route path="/game/report" element={<GameReport />} />
          <Route path="/questionnaire" element={<Screening />} />
          <Route path="/questionnaire/teacher" element={<Questionnaire />} />
          <Route
            path="/questionnaire/report"
            element={<QuestionnaireReport />}
          />
          <Route
            path="/mri"
            element={
              <Suspense
                fallback={
                  <div className="loading" role="status">
                    {t("Загружаем инструменты визуализации")}
                  </div>
                }
              >
                <MRI />
              </Suspense>
            }
          />
          <Route
            path="*"
            element={
              <Empty
                title={t("Страница не найдена")}
                text={t("Вернитесь в рабочее пространство.")}
                to="/dashboard"
                label={t("На главную")}
              />
            }
          />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
function renderApp() {
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
}
renderApp();
import "./styles/preferences.css";
import "./styles/research.css";
