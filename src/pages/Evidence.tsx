import { BookOpen, Download, ExternalLink } from 'lucide-react';
import { Card, Heading } from '../components/UI';
import { useT } from '../i18n';
import '../styles/evidence.css';

const papers = [
  {
    id: 's41398-024-03024-5', doi: '10.1038/s41398-024-03024-5',
    title: 'The diagnosis of ASD with MRI: a systematic review and meta-analysis',
    authors: 'Schielen S. J. C., Pilmeyer J., Aldenkamp A. P., Zinger S.',
    journal: 'Translational Psychiatry · 2024 · 14:318',
    kind: 'Систематический обзор и метаанализ',
    summary: 'Обзор объединяет 134 исследования и 159 экспериментов по распознаванию РАС на основе МРТ. Оценочное число уникальных участников — 4 982; выборки отдельных работ пересекаются.',
    result: 'Чувствительность — 76,0% (95% ДИ: 74,1–77,8); специфичность — 75,7% (95% ДИ: 74,0–77,4); AUC — 0,823.',
    limit: 'Авторы отмечают неоднородность исследований и неопределённость переноса результатов на новые выборки. Эти показатели не являются точностью Neura.',
    license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  {
    id: 's12880-026-02514-w', doi: '10.1186/s12880-026-02514-w',
    title: 'Construction of a small-sample brain imaging data augmentation and explainable diagnostic model for autism based on generative adversarial networks',
    authors: 'WeiWei Xu', journal: 'BMC Medical Imaging · 2026 · 26:436',
    kind: 'Исследование модели на данных ABIDE I/II',
    summary: 'Исследование объединяет структурную МРТ и функциональную связность rs-fMRI, коррекцию различий между центрами ComBat, аугментацию cGAN и объяснимое глубокое обучение.',
    result: 'В стратифицированной пятикратной перекрёстной проверке AUC составила 0,871 ± 0,016, сбалансированная точность — 0,797 ± 0,012. При исключении одного центра (LOSO) AUC — 0,783 ± 0,041.',
    limit: 'Результаты относятся к модели авторов и условиям их эксперимента. Снижение AUC при проверке на другом центре показывает важность внешней проверки; работа не подтверждает валидацию нашей реализации.',
    license: 'CC BY-NC-ND 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-nc-nd/4.0/',
  },
];

export default function Evidence() {
  const t = useT();
  return <div className="evidence-page">
    <Heading eyebrow={t('НАУЧНАЯ ОСНОВА')} title={t('Исследования, на которые мы опираемся')} description={t('МРТ и машинное обучение — изучаемые научные подходы к исследованию РАС. Здесь собраны публикации, результаты и границы их применимости к Neura.')} />
    <Card className="evidence-intro"><BookOpen size={28} aria-hidden="true"/><h2>{t('Научно обоснованное направление исследования')}</h2><p>{t('Использование структурной и функциональной МРТ, данных ABIDE и вычислительного анализа имеет научную основу. Представленные статьи обосновывают выбор этого исследовательского направления. Проверка конкретного метода зависит от данных, протокола и независимой оценки.')}</p></Card>
    <Card><h2>{t('Как это связано с Neura')}</h2><dl className="evidence-scope">
      <div><dt>{t('МРТ и ABIDE')}</dt><dd>{t('В Neura доступны просмотр структурных и функциональных NIfTI-снимков и работа с данными ABIDE. Публикации показывают, как такие данные применяются в исследовательских моделях РАС.')}</dd></div>
      <div><dt>{t('Модель машинного обучения')}</dt><dd>{t('Просмотр снимков не равнозначен автоматическому анализу. Модель из статьи Xu в Neura не реализована и не валидирована; опубликованные метрики нельзя переносить на платформу.')}</dd></div>
      <div><dt>{t('Игра и анкеты')}</dt><dd>{t('Эти две статьи посвящены МРТ. Они не подтверждают валидность игровых сценариев, авторских вопросов или правил скрининга Neura. Для них требуется отдельное обоснование.')}</dd></div>
    </dl></Card>
    <h2>{t('Публикации и полные тексты')}</h2>
    {papers.map((p, i) => <Card key={p.id} className="evidence-paper">
      <div className="eyebrow">0{i + 1} / {t(p.kind)}</div><h2 lang="en">{p.title}</h2>
      <p className="evidence-meta">{p.authors}<br/>{p.journal}</p>
      <p>{t(p.summary)}</p><div className="evidence-result"><strong>{t('Результаты исследования')}</strong><p>{t(p.result)}</p></div><p>{t(p.limit)}</p>
      <div className="evidence-actions"><a className="button" href={`/api/materials/papers/${p.id}.pdf`} target="_blank" rel="noreferrer">{t('Открыть статью')} <ExternalLink size={16}/></a><a className="button secondary" href={`/api/materials/papers/${p.id}.pdf`} download>{t('Скачать PDF')} <Download size={16}/></a><a href={`https://doi.org/${p.doi}`} target="_blank" rel="noreferrer">DOI: {p.doi}</a></div>
      <p className="evidence-meta">{t('Оригинальный PDF без изменений. Лицензия:')} <a href={p.licenseUrl} target="_blank" rel="noreferrer">{p.license}</a>.</p>
    </Card>)}
    <Card><h2>{t('Что необходимо для подтверждения нашего метода')}</h2><p>{t('Для заявления о проверенной точности Neura необходимы собственный протокол исследования, независимая тестовая выборка, оценка чувствительности и специфичности и проверка воспроизводимости. До этого платформа остаётся исследовательским прототипом и не ставит диагноз РАС.')}</p></Card>
  </div>;
}
