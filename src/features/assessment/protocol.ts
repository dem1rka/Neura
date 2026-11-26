export type PatientSex = 'male' | 'female' | 'unspecified';
export type AQVersion = 'child' | 'adolescent' | 'adult';
export type GameKind = 'bubbles' | 'geode';
export type Answer = 0 | 1 | 2 | 3 | null;
export type Trial = {trial:number; left:number[]; right:number[]; choice:0|1; correct:boolean; rt:number; presentedAt:number[]; timingValid:boolean};
export type Touch = {t:number; x:number; y:number; targetX:number; targetY:number; lane:number; hit:boolean; duration:number; distance:number; pointer:string; cancelled:boolean};
export type RecordData = {
  sex?:PatientSex; schemaVersion:1; id:string; assessmentId:string; ageMonths:number; createdAt:string;
  kind:'game'|'questionnaire'; instrument:string; protocolVersion:string;
  status:'draft'|'completed'|'interrupted'; completedAt?:string;
  answers?:Answer[]; aqVersion?:AQVersion; noLearningDisability?:boolean;
  respondent?:'parent'|'self'; language?:'en'|'ru'|'kk'; answerLanguages?:('en'|'ru'|'kk'|null)[];
  trials?:Trial[]; touches?:Touch[]; durationMs?:number;
  device?:{width:number;height:number;pixelRatio:number;touchPoints:number};
};
export const sources = {
  aq:'https://pubmed.ncbi.nlm.nih.gov/22265366/',
  bubbles:'https://pmc.ncbi.nlm.nih.gov/articles/PMC9898502/',
  geode:'https://pmc.ncbi.nlm.nih.gov/articles/PMC13564830/',
  data:'https://zenodo.org/records/16998131',
  code:'https://zenodo.org/records/20545339',
};
export const aqPage = (v:AQVersion) => `https://www.autismresearchcentre.com/tests/autism-spectrum-quotient-10-items-aq-10-${v}/`;
export function versionForAge(months:number):AQVersion {
  return months < 144 ? 'child' : months < 192 ? 'adolescent' : 'adult';
}
export function eligibleGame(kind:GameKind, age:number) {
  return Number.isInteger(age) && (kind==='bubbles' ? age>=48 && age<132 : age>=132 && age<216);
}
// Original ARC English wording; no translated or rewritten questionnaire items.
// © SBC/CA/BA/ARC/Cambridge University 1/5/12. Non-profit research use.
export const aqQuestions:Record<AQVersion,string[]> = {
  child:[
    'S/he often notices small sounds when others do not',
    'S/he usually concentrates more on the whole picture, rather than the small details',
    'In a social group, s/he can easily keep track of several different people’s conversations',
    'S/he finds it easy to go back and forth between different activities',
    'S/he doesn’t know how to keep a conversation going with his/her peers',
    'S/he is good at social chit-chat',
    'When s/he is read a story, s/he finds it difficult to work out the character’s intentions or feelings',
    'When s/he was in preschool, s/he used to enjoy playing games involving pretending with other children',
    'S/he finds it easy to work out what someone is thinking or feeling just by looking at their face',
    'S/he finds it hard to make new friends',
  ],
  adolescent:[
    'S/he notices patterns in things all the time',
    'S/he usually concentrates more on the whole picture, rather than the small details',
    'In a social group, s/he can easily keep track of several different people’s conversations',
    'If there is an interruption, s/he can switch back to what s/he was doing very quickly',
    'S/he frequently finds that s/he doesn’t know how to keep a conversation going',
    'S/he is good at social chit-chat',
    'When s/he was younger, s/he used to enjoy playing games involving pretending with other children',
    'S/he finds it difficult to imagine what it would be like to be someone else',
    'S/he finds social situations easy',
    'S/he finds it hard to make new friends',
  ],
  adult:[
    'I often notice small sounds when others do not',
    'I usually concentrate more on the whole picture, rather than the small details',
    'I find it easy to do more than one thing at once',
    'If there is an interruption, I can switch back to what I was doing very quickly',
    'I find it easy to “read between the lines” when someone is talking to me',
    'I know how to tell if someone listening to me is getting bored',
    'When I’m reading a story I find it difficult to work out the characters’ intentions',
    'I like to collect information about categories of things (e.g. types of car, types of bird, types of train, types of plant etc)',
    'I find it easy to work out what someone is thinking or feeling just by looking at their face',
    'I find it difficult to work out people’s intentions',
  ],
};
export const aqOptions = ['Definitely Agree','Slightly Agree','Slightly Disagree','Definitely Disagree'];
const agree:Record<AQVersion,number[]>={child:[0,4,6,9],adolescent:[0,4,7,9],adult:[0,6,7,9]};
export function aqScore(version:AQVersion, answers:Answer[]) {
  if(answers.length!==10 || answers.some(a=>a===null || !Number.isInteger(a) || a<0 || a>3)) return null;
  return answers.reduce<number>((sum,a,i)=>sum+Number(agree[version].includes(i) ? a!<2 : a!>=2),0);
}
export function aqInterpretation(r:RecordData) {
  const score=r.aqVersion && r.answers ? aqScore(r.aqVersion,r.answers) : null;
  if(score===null)return 'Заполните все 10 пунктов. Пропуски не считаются нулевыми ответами.';
  if(!r.noLearningDisability || r.ageMonths<48 || r.ageMonths>=216 || r.aqVersion!==versionForAge(r.ageMonths))
    return 'Балл сохранён без автоматической интерпретации: применимость формы не подтверждена.';
  if(r.language&&r.language!=='en'||r.answerLanguages?.some(l=>l&&l!=='en'))return 'Балл переведённой анкеты сохранён для специалиста. Клиническая валидация перевода не подтверждена; автоматическая интерпретация порога отключена.';
  if(r.ageMonths>=192) return 'Сохранён балл взрослой формы. В этой версии для 16–17 лет интерпретацию выполняет специалист; детские пороги не применяются.';
  return score>=6 ? 'Достигнут порог 6: авторы предлагают рассмотреть направление на специализированную оценку. Это не диагноз.' : 'Порог 6 не достигнут. Это не исключает РАС; сохраняющиеся опасения стоит обсудить со специалистом.';
}
export const sum = (a:number[])=>a.reduce((n,x)=>n+x,0);
// Reimplementation of the released GEODE source's probability schedule, not a diagnostic model.
export function stimulus(trial:number, random= Math.random) {
  let p:number, q:number;
  if(trial<5){p=1;q=0;} else if(trial<10){p=.9;q=.1;}
  else if(random()<.5){[p,q]=random()<.5?[.7,.3]:[.6,.4];}
  else {p=random();q=random();}
  if(random()<.5)[p,q]=[q,p];
  const left=Array.from({length:10},()=>Number(random()<p));
  const right=Array.from({length:10},()=>Number(random()<q));
  return {left,right};
}
export function trialCorrect(left:number[],right:number[],choice:0|1) {
  const l=sum(left),r=sum(right); return choice===0 ? l>r : r>l;
}
export function gameSummary(r:RecordData) {
  if(r.instrument==='geode-neura'){
    const trials=(r.trials??[]).filter(x=>x.trial>10 && x.timingValid);
    const informative=trials.filter(x=>sum(x.left)!==sum(x.right));
    return [`Проб: ${r.trials?.length??0} / 200`, `После обучения, без нарушений времени: ${trials.length}`,
      `Верных выборов (без равных стимулов): ${informative.filter(x=>x.correct).length} / ${informative.length}`];
  }
  const touches=(r.touches??[]).filter(x=>!x.cancelled);
  return [`Касаний: ${touches.length}`,`Попаданий: ${touches.filter(x=>x.hit).length}`,`Время записи: ${((r.durationMs??0)/1000).toFixed(1)} с`,
    ...(touches.length<3?['Меньше трёх касаний: недостаточно данных для анализа моторики.']:[]),
    'Координаты записаны в единицах поля 800 × 440. Это не миллиметры и не нормы оригинального исследования.'];
}

export function instrumentLabel(r:Pick<RecordData,'instrument'>) {
 return ({'bubbles-neura':'Пузырьки','geode-neura':'GEODE · Экспедиция','aq10-child':'AQ-10 · Детская форма','aq10-adolescent':'AQ-10 · Подростковая форма','aq10-adult':'AQ-10 · Взрослая форма'})[r.instrument]??r.instrument;
}
export function gameMetrics(r:RecordData) {
 if(r.instrument==='geode-neura') {
  const trials=r.trials??[],valid=trials.filter(t=>t.trial>10&&t.timingValid);
  const informative=valid.filter(t=>sum(t.left)!==sum(t.right));
  return [
   {label:'Выполнено проб',value:`${trials.length} / 200`,note:'Первые 10 проб — обучение'},
   {label:'Пригодно для анализа',value:String(valid.length),note:'После обучения, с корректным временем предъявления'},
   {label:'Верных выборов',value:informative.length?`${informative.filter(t=>t.correct).length} / ${informative.length}`:'—',note:informative.length?'Без проб с равным числом вспышек':'Пока нет подходящих проб после обучения'},
  ];
 }
 const touches=(r.touches??[]).filter(t=>!t.cancelled);
 return [
  {label:'Касаний',value:String(touches.length),note:'Без отменённых касаний'},
  {label:'Попаданий',value:String(touches.filter(t=>t.hit).length),note:'В пределах пузырька в момент касания'},
  {label:'Время записи',value:`${((r.durationMs??0)/1000).toFixed(1)} с`,note:'Основная часть, без обучения'},
 ];
}
