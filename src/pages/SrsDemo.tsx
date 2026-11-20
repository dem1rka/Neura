import { useState } from 'react';
import { localeTag, useT } from '../i18n';
import { api } from '../services/accountApi';

const scales = {
  srs_awareness_raw: 'Замечает ли ребёнок жесты и выражения лица?',
  srs_cognition_raw: 'Как ребёнок понимает смысл этих сигналов?',
  srs_communication_raw: 'Как ребёнок поддерживает общение?',
  srs_motivation_raw: 'Как ребёнок проявляет интерес к общению?',
  srs_mannerisms_raw: 'Как часто повторяются одни и те же действия?',
};
type Result = {profile: Record<string,number>; research_score: number; threshold: number; above_threshold: boolean};

export default function SrsDemo() {
  const t = useT();
  const [profile,setProfile] = useState('A');
  const [result,setResult] = useState<Result|null>(null);
  const [busy,setBusy] = useState(false);
  const [failed,setFailed] = useState(false);
  const format = new Intl.NumberFormat(localeTag(), {minimumFractionDigits:3, maximumFractionDigits:3});
  async function calculate() {
    setBusy(true); setFailed(false); setResult(null);
    try { setResult(await api<Result>('/research/srs-demo/'+profile)); }
    catch { setFailed(true); }
    finally { setBusy(false); }
  }
  return <section className="cabinet-panel srs-demo">
    <h2>{t('Демонстрация модели SRS')}</h2>
    <p>{t('Выберите вымышленный профиль и сравните результат с порогом модели ABIDE II. Балл предназначен для исследования и не выражает вероятность диагноза у ребёнка.')}</p>
    <form onSubmit={e => {e.preventDefault(); void calculate();}}>
      <label>{t('Учебный профиль')}
        <select value={profile} disabled={busy} onChange={e => {setProfile(e.target.value); setResult(null); setFailed(false);}}>
          {['A','B','C'].map(p=><option key={p}>{p}</option>)}
        </select>
      </label>
      <button className="button" disabled={busy}>{t(busy?'Вычисляем…':'Рассчитать балл')}</button>
    </form>
    <div role="status" aria-live="polite">
      {failed && <p>{t('Не удалось получить результат модели. Попробуйте ещё раз.')}</p>}
      {result && <div className="srs-results">
        <div className="srs-reading">
          <h3>{t('Результат профиля {profile}', {profile})}</h3>
          <p>{t(result.above_threshold
            ? 'Модель отнесла этот пример к группе участников с РАС в исследовании.'
            : 'Модель отнесла этот пример к группе сравнения — участникам исследования без РАС.')}</p>
          <div className="srs-key"><span><i className="srs-dot"/>{t('Балл модели')} <b>{format.format(result.research_score)}</b></span>
            <span><i className="srs-dash"/>{t('Порог')} <b>{format.format(result.threshold)}</b></span></div>
          <div className="srs-track" aria-hidden="true"><i style={{left:result.research_score*100+'%'}}/><b style={{left:result.threshold*100+'%'}}/></div>
          <div className="srs-ends" aria-hidden="true"><span>0</span><span>1</span></div>
          <p>{t('Точка показывает итог по пяти шкалам. На пунктирной отметке модель меняет группу. Это балл от 0 до 1, а не процент риска.')}</p>
        </div>
        <div className="srs-inputs">
          <h3>{t('Из чего сложился результат')}</h3>
          <p>{t('Справа — суммы баллов за ответы по каждой теме. У тем разные шкалы: 10 баллов по общению не означают «10 из 10».')}</p>
          <dl>{Object.entries(scales).map(([field,label])=><div key={field}><dt>{t(label)}</dt><dd>{result.profile[field]}</dd></div>)}</dl>
        </div>
      </div>}
    </div>
  </section>;
}
