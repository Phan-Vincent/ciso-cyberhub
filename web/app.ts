import {emptyProgress,parseProgress,scoreQuiz,matches,type Question} from './core.js';
const base=document.body.dataset.base || '';
const $=(s:string)=>document.querySelector(s) as HTMLElement | null;
const key='cyberhub:'+base+':progress:v1';
let storageOK=true;
let progress=emptyProgress();
try {progress=parseProgress(localStorage.getItem(key));} catch {storageOK=false;}
function say(text:string){const box=$('#status');if(box)box.textContent=text;}
function save(){try{localStorage.setItem(key,JSON.stringify(progress));}catch{storageOK=false;} if(!storageOK)say('Browser storage is unavailable. Progress will last for this page only.');}
async function data(name:string){const r=await fetch(`${base}/assets/${name}.json`);if(!r.ok)throw new Error('Data could not load. Reload or try again later.');return r.json();}
const theme=$('#theme');
try{const value=localStorage.getItem('cyberhub:theme');if(value==='dark'||value==='light')document.documentElement.dataset.theme=value;}catch{}
theme?.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme ? document.documentElement.dataset.theme==='dark' : matchMedia('(prefers-color-scheme: dark)').matches; const value=dark?'light':'dark';document.documentElement.dataset.theme=value;try{localStorage.setItem('cyberhub:theme',value);}catch{}});
function element(tag:string,text:string,cls=''){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;}
function link(label:string,path:string){const a=document.createElement('a');a.textContent=label;a.href=path;return a;}
function setupFilters(){
 const form=$('#filters') as HTMLFormElement|null; const list=$('#results'); if(!form||!list)return;
 const cards=Array.from(list.querySelectorAll<HTMLElement>('[data-record]'));
 const parsed=cards.map(card=>({card,record:JSON.parse(card.dataset.record||'{}')}));
 const query=new URLSearchParams(location.search);
 for(const field of Array.from(form.elements) as HTMLInputElement[]){if(field.name && query.has(field.name))field.value=query.get(field.name)||'';}
 function update(){
  const values=Object.fromEntries(new FormData(form!)) as Record<string,string>;let count=0;
  const text=values.q||'';delete values.q;
  const sort=values.sort||'name';delete values.sort;
  parsed.sort((a,b)=>{const av=String(a.record[sort]||''),bv=String(b.record[sort]||'');return sort==='published_at'||sort==='last_verified'?bv.localeCompare(av):av.localeCompare(bv);});
  for(const {card,record} of parsed){card.hidden=!matches(record,text,values);if(!card.hidden)count++;list!.append(card);}
  const result=$('#result-count');if(result)result.textContent=`${count} results`;
  const empty=$('#empty');if(empty)empty.hidden=count!==0;
  const params=new URLSearchParams();if(text)params.set('q',text);for(const [k,v]of Object.entries(values))if(v)params.set(k,v);if(sort!=='name')params.set('sort',sort);
  history.replaceState(null,'',location.pathname+(params.size?'?'+params:'')+location.hash);
 }
 form.addEventListener('input',update);form.addEventListener('submit',e=>e.preventDefault());
 $('#reset-filters')?.addEventListener('click',()=>{form.reset();update();});update();
}
setupFilters();
const lesson=$('[data-lesson]');
if(lesson){const id=lesson.dataset.lesson!;const button=$('#complete') as HTMLButtonElement;
 const update=()=>{button.textContent=progress.lessons.includes(id)?'Marked complete · Undo':'Mark lesson complete';button.setAttribute('aria-pressed',String(progress.lessons.includes(id)));};
 button.addEventListener('click',()=>{progress.lessons=progress.lessons.includes(id)?progress.lessons.filter(x=>x!==id):[...progress.lessons,id];save();update();});update();}
const progressBox=$('#progress-summary');
if(progressBox){progressBox.textContent=`${progress.lessons.length} lessons marked complete · ${progress.attempts.length} practice attempts on this browser`;}
$('#reset-progress')?.addEventListener('click',()=>{if(confirm('Clear all CyberHub learning progress for this site on this browser?')){progress=emptyProgress();save();location.reload();}});
$('#export-progress')?.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}));const a=link('Download',url);a.download='cyberhub-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#import-progress')?.addEventListener('change',async e=>{const input=e.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;if(file.size>200000){say('Progress file is too large.');return;}const raw=await file.text();let valid=false;try{valid=JSON.parse(raw).version===1;}catch{}if(!valid){say('Not a recognized progress file.');return;}progress=parseProgress(raw);save();location.reload();});
const search=$('#global-search') as HTMLInputElement|null;
if(search){let records:any[]=[];data('search').then(r=>{records=r;}).catch(e=>say(e.message));
 search.addEventListener('input',()=>{const box=$('#search-results')!;box.replaceChildren();const q=search.value.trim();if(q.length<2)return;const found=records.filter(r=>`${r.title} ${r.text}`.toLowerCase().includes(q.toLowerCase())).slice(0,30);for(const r of found){const item=element('li','');item.append(link(r.title,base+r.path),element('small',r.section));box.append(item);}say(`${found.length} search results`);});}
async function academy(){
 if(!$('#quiz')&&!$('#flashcards')&&!$('#weak-domains'))return;
 const course=await data('academy');
 const weak=$('#weak-domains');
 if(weak){const last=progress.attempts.at(-1);if(last){for(const [d,s]of Object.entries(last.domains)){const row=element('p',`Domain ${d}: ${s.correct}/${s.total} on your last practice. `);row.append(link('Review lessons',base+`/academy/#domain-${d}`));weak.append(row);}}else weak.textContent='Take a practice quiz to see domain feedback. This is a study signal, not an exam-readiness prediction.';}
 if($('#flashcards')){let i=0;let flipped=false;const cards=course.flashcards;const draw=()=>{const c=cards[i];$('#card-text')!.textContent=flipped?c.back:c.front;$('#card-count')!.textContent=`${i+1} / ${cards.length} · Objective ${c.objective}`;$('#flip')!.textContent=flipped?'Show question':'Show answer';};$('#flip')!.addEventListener('click',()=>{flipped=!flipped;draw();});$('#next-card')!.addEventListener('click',()=>{i=(i+1)%cards.length;flipped=false;draw();});$('#previous-card')!.addEventListener('click',()=>{i=(i-1+cards.length)%cards.length;flipped=false;draw();});draw();}
 if(!$('#quiz'))return;
 const host=$('#quiz-questions')!;const start=$('#start-quiz') as HTMLButtonElement;const submit=$('#submit-quiz') as HTMLButtonElement;
 let active:Question[]=[];let finished=true;let timer:ReturnType<typeof setInterval>|undefined;let deadline=0;
 function finish(){if(finished)return;finished=true;clearInterval(timer);const answers:Record<string,number>={};for(const q of active){const input=document.querySelector<HTMLInputElement>(`input[name="${q.id}"]:checked`);if(input)answers[q.id]=Number(input.value);}
  const result=scoreQuiz(active,answers);progress.attempts=[...progress.attempts,{at:new Date().toISOString(),...result}].slice(-50);save();
  for(const q of active){const row=document.getElementById(q.id)!;const answer=q.choices[q.answer];row.append(element('p',`${answers[q.id]===q.answer?'Correct.':'Review. Correct answer: '+answer+'.'} ${q.rationale}`,'rationale'));row.querySelectorAll('input').forEach(x=>x.disabled=true);}
  $('#quiz-result')!.textContent=`${result.score} / ${result.total} correct. Unanswered questions count as incorrect. Review the explanations below.`;$('#quiz-result')!.focus();submit.disabled=true;start.disabled=false;$('#timer')!.textContent='Practice finished';
 }
 start.addEventListener('click',()=>{const domain=($('#quiz-domain') as HTMLSelectElement).value;active=course.questions.filter((q:Question)=>!domain||q.objective.startsWith(domain+'.'));finished=false;host.replaceChildren();$('#quiz-result')!.textContent='';
  for(const [i,q]of active.entries()){const field=document.createElement('fieldset');field.id=q.id;field.append(element('legend',`${i+1}. ${q.prompt}`));for(const [n,choice]of q.choices.entries()){const label=document.createElement('label');const input=document.createElement('input');input.type='radio';input.name=q.id;input.value=String(n);label.append(input,document.createTextNode(choice));field.append(label);}host.append(field);}
  start.disabled=true;submit.disabled=false;const timed=($('#timed') as HTMLInputElement).checked;deadline=Date.now()+active.length*90000;
  const tick=()=>{const seconds=Math.max(0,Math.ceil((deadline-Date.now())/1000));$('#timer')!.textContent=timed?`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} remaining`:'Untimed practice';if(timed&&seconds===0)finish();};clearInterval(timer);tick();if(timed)timer=setInterval(tick,1000);host.querySelector('input')?.focus();
 });submit.addEventListener('click',finish);
}
academy().catch(e=>say(e.message));
// Freshness is evaluated at view time, even when deployment or schedules have stopped.
for(const el of document.querySelectorAll<HTMLElement>('[data-freshness]')){const value=el.dataset.freshness;const age=value?(Date.now()-Date.parse(value))/86400000:NaN;el.textContent=Number.isFinite(age)?(age>2?`Stale · ${Math.floor(age)} days since success`:'Updated within 48 hours'):'No successful retrieval';if(!Number.isFinite(age)||age>2)el.classList.add('warning');}
if(!storageOK)say('Browser storage is unavailable. Learning remains usable; progress cannot persist.');
