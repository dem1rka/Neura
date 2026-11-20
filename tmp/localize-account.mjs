import ts from 'typescript';
import fs from 'node:fs';
const path='src/pages/Account.tsx';let text=fs.readFileSync(path,'utf8');const source=ts.createSourceFile(path,text,99,true,4);const edits=[];const keys=new Set();
function visit(n){if(ts.isJsxText(n)&&/[А-Яа-яЁё]/.test(n.text)){const key=n.text.trim();keys.add(key);edits.push([n.pos,n.end,`{t(${JSON.stringify(key)})} `]);return;}
if(ts.isStringLiteral(n)&&/[А-Яа-яЁё]/.test(n.text)&&n.getStart(source)>text.indexOf('  if (loading)')){keys.add(n.text);const call=`t(${JSON.stringify(n.text)})`;edits.push([n.getStart(source),n.end,ts.isJsxAttribute(n.parent)?`{${call}}`:call]);return;}ts.forEachChild(n,visit);}
visit(source);for(const [a,b,c]of edits.sort((a,b)=>b[0]-a[0]))text=text.slice(0,a)+c+text.slice(b);
text="import { useT, localeTag } from '../i18n';\n"+text.replace('export default function Account() {','export default function Account() {\n  const t = useT();').replaceAll('{message}</','{t(message)}</').replace("toLocaleString('ru')","toLocaleString(localeTag())");fs.writeFileSync(path,text);
fs.writeFileSync('tmp/account-keys.json',JSON.stringify([...keys],null,2));console.log([...keys].join('\n'));
