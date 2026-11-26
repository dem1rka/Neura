export function Scene({compact=false}:{compact?:boolean}) {
 return <svg className={'scene '+(compact?'compact':'')} viewBox="0 0 700 330" role="img" aria-label="Пузырьки и драгоценные камни — задания для наблюдения">
 <rect x="25" y="20" width="650" height="290" rx="48" fill="#e5f2ed"/>
 <g fill="#9bd6cd" stroke="#387e78" strokeWidth="3"><circle cx="140" cy="115" r="40"/><circle cx="245" cy="200" r="55"/><circle cx="315" cy="90" r="26"/></g>
 <g fill="#789bc7" stroke="#365a86" strokeWidth="3"><path d="m465 70 65 85-65 100-65-100Z"/><path d="m585 180 35 45-35 50-35-50Z"/></g>
 <path d="m465 70 0 185m-65-100h130" stroke="#dce8f8" strokeWidth="3"/>
 </svg>;
}
