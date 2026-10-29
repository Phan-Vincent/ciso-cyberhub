import {emptyProgress,parseProgress,scoreQuiz,matches,countAcademyLessons,compareRecords,type Question} from './core.js';
import {sha256Bytes} from './sha256.js';
const base=document.body.dataset.base || '';
const $=(s:string)=>document.querySelector(s) as HTMLElement | null;
const key='cyberhub:'+base+':progress:v1';
let storageOK=true;
let progress=emptyProgress();
try {progress=parseProgress(localStorage.getItem(key));} catch {storageOK=false;}
function say(text:string){const box=$('#status');if(box)box.textContent=text;}
function save(){try{localStorage.setItem(key,JSON.stringify(progress));}catch{storageOK=false;} if(!storageOK)say('Browser storage is unavailable. Progress will last for this page only.');}
async function data(name:string){const r=await fetch(`${base}/assets/${name}.json`);if(!r.ok)throw new Error('Data could not load. Reload or try again later.');return r.json();}
const theme=$('#theme') as HTMLButtonElement|null;
const root=document.documentElement;
const systemLight=matchMedia('(prefers-color-scheme: light)');
const isLight=()=>root.dataset.theme==='light';
function syncTheme(){
 const dark=!isLight();
 theme?.setAttribute('aria-pressed',String(dark));
 theme?.setAttribute('aria-label','Dark theme');
 theme?.setAttribute('title',dark?'Switch to light theme':'Switch to dark theme');
 const meta=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
 if(meta)meta.content=dark?'#050505':'#edeff2';
}
theme?.addEventListener('click',()=>{const value=isLight()?'dark':'light';root.dataset.theme=value;root.dataset.themeSource='user';try{localStorage.setItem('cyberhub:theme',value);}catch{say('Theme applied for this visit; browser storage is unavailable.');}syncTheme();});
systemLight.addEventListener('change',()=>{if(root.dataset.themeSource==='user')return;root.dataset.theme=systemLight.matches?'light':'dark';syncTheme();});
syncTheme();

// Command shortcut (Cmd/Ctrl+K) to open or focus search
document.addEventListener('keydown',e=>{
 if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){
  e.preventDefault();
  const input=($('#global-search')||document.querySelector<HTMLInputElement>('input[name="q"]'));
  if(input)input.focus();
  else location.href=`${base}/search/`;
 }
});

function element(tag:string,text:string,cls=''){const el=document.createElement(tag);el.textContent=text;if(cls)el.className=cls;return el;}
function link(label:string,path:string){const a=document.createElement('a');a.textContent=label;a.href=path;return a;}
function setupFilters(){
 const form=$('#filters') as HTMLFormElement|null; const list=$('#results'); if(!form||!list)return;
 const cards=Array.from(list.querySelectorAll<HTMLElement>('[data-record]'));
 const parsed=cards.map(card=>({card,record:JSON.parse(card.dataset.record||'{}')}));
 const sortSelect=form.querySelector<HTMLSelectElement>('select[name="sort"]');
 const defaultSort=sortSelect?.options[0]?.value||'name';
 const query=new URLSearchParams(location.search);
 for(const field of Array.from(form.elements) as HTMLInputElement[]){if(field.name && query.has(field.name))field.value=query.get(field.name)||'';}
 // Long lists show a page at a time; filters and search still cover every record.
 const page=Number(list.dataset.page)||24;let limit=page;let more:HTMLButtonElement|null=null;
 if(cards.length>page){more=document.createElement('button');more.type='button';more.className='show-more';list.after(more);more.addEventListener('click',()=>{limit+=page;update(true);});}
 function update(keep=false){
  if(!keep)limit=page;
  const values=Object.fromEntries(new FormData(form!)) as Record<string,string>;let count=0;
  const text=values.q||'';delete values.q;
  const sort=values.sort||defaultSort;delete values.sort;
  parsed.sort((a,b)=>compareRecords(a.record,b.record,sort));
  for(const {card,record} of parsed){const ok=matches(record,text,values);if(ok)count++;card.hidden=!ok||count>limit;list!.append(card);}
  const result=$('#result-count');if(result)result.textContent=count>limit?`Showing ${limit} of ${count} results`:`${count} results`;
  if(more){more.hidden=count<=limit;more.textContent=`Show ${Math.min(page,count-limit)} more`;}
  const empty=$('#empty');if(empty)empty.hidden=count!==0;
  const params=new URLSearchParams();if(text)params.set('q',text);for(const [k,v]of Object.entries(values))if(v)params.set(k,v);if(sort!==defaultSort)params.set('sort',sort);
  const nextUrl=location.pathname+(params.size?'?'+params:'')+location.hash;
  if(nextUrl!==location.pathname+location.search+location.hash)history.replaceState(null,'',nextUrl);
 }
 form.addEventListener('input',()=>update());form.addEventListener('submit',e=>e.preventDefault());
 $('#reset-filters')?.addEventListener('click',()=>{form.reset();update();});update();
}
setupFilters();
const lesson=$('[data-lesson]');
if(lesson){const id=lesson.dataset.lesson!;const button=$('#complete') as HTMLButtonElement;
 const update=()=>{button.textContent=progress.lessons.includes(id)?'Marked complete · Undo':'Mark lesson complete';button.setAttribute('aria-pressed',String(progress.lessons.includes(id)));};
 button.addEventListener('click',()=>{progress.lessons=progress.lessons.includes(id)?progress.lessons.filter(x=>x!==id):[...progress.lessons,id];save();update();});update();}

function renderProgressSummaries(objectives?: {lesson: string}[]){
 const total=objectives?.length||28;
 const done=Math.min(total,countAcademyLessons(progress.lessons,objectives));
 const progressBox=$('#progress-summary');
 if(progressBox){progressBox.textContent=`${done} of ${total} Academy lessons marked complete · ${progress.attempts.length} practice attempts on this browser`;}
 const homeProgress=$('#home-progress-summary');
 if(homeProgress){
  const last=progress.attempts.at(-1);
  const lastScore=last?` · Last quiz: ${last.score}/${last.total}`:'';
  homeProgress.textContent=`${done} of ${total} lessons completed · ${progress.attempts.length} quiz attempts${lastScore}`;
  const badge=$('#home-progress-badge');
  if(badge&&done>0)badge.textContent=`${Math.min(100,Math.round((done/total)*100))}% pathway complete`;
 }
}
renderProgressSummaries();

$('#reset-progress')?.addEventListener('click',()=>{if(confirm('Clear all CyberHub learning progress for this site on this browser?')){progress=emptyProgress();save();location.reload();}});
$('#export-progress')?.addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(progress,null,2)],{type:'application/json'}));const a=link('Download',url);a.download='cyberhub-progress.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('#import-progress')?.addEventListener('change',async e=>{const input=e.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;if(file.size>200000){say('Progress file is too large.');return;}const raw=await file.text();let valid=false;try{valid=JSON.parse(raw).version===1;}catch{}if(!valid){say('Not a recognized progress file.');return;}progress=parseProgress(raw);save();location.reload();});
const search=$('#global-search') as HTMLInputElement|null;
if(search){let records:any[]=[];
 const draw=()=>{const box=$('#search-results')!;box.replaceChildren();const q=search.value.trim();if(q.length<2){say('Type at least two characters.');return;}const found=records.filter(r=>`${r.title} ${r.text}`.toLowerCase().includes(q.toLowerCase())).slice(0,30);for(const r of found){const item=element('li','');item.append(link(r.title,base+r.path),element('small',r.section));box.append(item);}say(`${found.length} search results`);};
 search.addEventListener('input',draw);data('search').then(r=>{records=r;draw();}).catch(e=>say(e.message));}

async function academy(){
 const hasDomainBars=document.querySelectorAll('[data-domain-bar]').length>0;
 if(!$('#quiz')&&!$('#flashcards')&&!$('#weak-domains')&&!$('#progress-summary')&&!$('#home-progress-summary')&&!hasDomainBars)return;
 const course=await data('academy');
 renderProgressSummaries(course.objectives);
 if(hasDomainBars){
  for(const bar of document.querySelectorAll<HTMLElement>('[data-domain-bar]')){
   const d=bar.dataset.domainBar||'';
   const objs=course.objectives.filter((o:any)=>String(o.id).startsWith(d+'.'));
   const done=countAcademyLessons(progress.lessons,objs);
   const label=document.querySelector<HTMLElement>(`[data-domain-progress="${d}"]`);
   if(label)label.textContent=`${done}/${objs.length}`;
   const step=objs.length?Math.round((done/objs.length)*10):0;
   bar.dataset.step=String(step);
  }
 }
 const weak=$('#weak-domains');
 if(weak){const last=progress.attempts.at(-1);if(last){for(const [i,[d,s]]of Object.entries(last.domains).sort((a,b)=>a[1].correct/a[1].total-b[1].correct/b[1].total).entries()){const row=element('p',`${i===0?'Lowest observed domain · ':''}Domain ${d}: ${s.correct}/${s.total} on your last practice. `);row.append(link('Review lessons',base+`/academy/#domain-${d}`));weak.append(row);}}else weak.textContent='Take a practice quiz to see domain feedback. This is a study signal, not an exam-readiness prediction.';}
 if($('#flashcards')){
  let i=0,flipped=false;const cards=course.flashcards;const card=$('#card-text') as HTMLButtonElement|null;
  const flipFx=()=>{if(!card||calm)return;card.classList.remove('flip');void card.offsetWidth;card.classList.add('flip');};
  const draw=()=>{const c=cards[i];if(card){card.textContent=flipped?c.back:c.front;card.setAttribute('aria-pressed',String(flipped));}const count=$('#card-count');if(count)count.textContent=`${i+1} / ${cards.length} · Objective ${c.objective}`;const btn=$('#flip');if(btn)btn.textContent=flipped?'Show question':'Show answer';};
  const flip=()=>{flipped=!flipped;draw();flipFx();};
  card?.addEventListener('click',flip);
  $('#flip')?.addEventListener('click',flip);
  $('#next-card')?.addEventListener('click',()=>{i=(i+1)%cards.length;flipped=false;draw();});
  $('#previous-card')?.addEventListener('click',()=>{i=(i-1+cards.length)%cards.length;flipped=false;draw();});
  draw();
 }
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
 });submit.addEventListener('click',finish);host.dataset.ready='1';
}
academy().catch(e=>say(e.message));
// Freshness and active errors are evaluated at view time, even when deployment or schedules have stopped.
for(const el of document.querySelectorAll<HTMLElement>('[data-freshness]')){
 const value=el.dataset.freshness||'';
 const err=(el.dataset.error||'').trim();
 const age=value?(Date.now()-Date.parse(value))/86400000:NaN;
 const hasAge=Number.isFinite(age);
 const stale=!hasAge||age>2;
 const healthy=!err&&!stale;
 if(err&&hasAge){
  el.textContent=stale?`Error: ${err} (stale · ${Math.floor(age)}d since success)`:`Error: ${err} (last ok ${value.slice(0,10)})`;
 }else if(err){
  el.textContent=`Error: ${err} (no successful retrieval)`;
 }else if(hasAge){
  el.textContent=stale?`Stale · ${Math.floor(age)} days since success`:`Updated within 48 hours (${value.slice(0,10)})`;
 }else{
  el.textContent='No successful retrieval';
 }
 el.classList.toggle('warning',!healthy);
 const container=el.closest('[data-feed-card], [data-feed-item]');
 const dot=container?.querySelector('.status-dot');
 if(dot){dot.classList.toggle('online',healthy);dot.classList.toggle('warn',!healthy);}
}
const healthCounter=$('#live-feed-health');
if(healthCounter){
 const cards=Array.from(document.querySelectorAll<HTMLElement>('[data-feed-card] [data-freshness]'));
 const ok=cards.filter(el=>!el.classList.contains('warning')).length;
 const total=Number(healthCounter.dataset.total||cards.length);
 healthCounter.textContent=`${ok}/${total}`;
}
if(!storageOK)say('Browser storage is unavailable. Learning remains usable; progress cannot persist.');

for(const el of document.querySelectorAll<HTMLElement>('[data-verification]')){const age=(Date.now()-Date.parse(el.dataset.verification||''))/86400000;if(Number.isFinite(age)&&age>90){el.textContent=`Source check is ${Math.floor(age)} days old. Re-verification is due.`;el.classList.add('warning');}}

// ---------------------------------------------------------------------------
// Flagship layer: motion and instruments. Everything below is progressive
// enhancement; server-rendered content stays readable without it.
// ---------------------------------------------------------------------------
const calm=matchMedia('(prefers-reduced-motion: reduce)').matches;
// Card spotlight: a soft light follows the pointer across cards (fine pointers only).
if(matchMedia('(pointer: fine)').matches){const SPOT='.card, .dir-card, .play-tile, .path-card, .ctf-card, .role-card, .today-stat, .today-news, .cont-item, .job';
 document.addEventListener('pointermove',e=>{const c=(e.target as HTMLElement|null)?.closest?.(SPOT) as HTMLElement|null;if(!c)return;const r=c.getBoundingClientRect();c.style.setProperty('--mx',`${e.clientX-r.left}px`);c.style.setProperty('--my',`${e.clientY-r.top}px`);},{passive:true});}
// Guided paths: "Start this path" remembers the choice; each step then shows a Next up bar.
{const base=document.body.dataset.base||'',rel=location.pathname.slice(base.length)||'/';
 document.querySelectorAll<HTMLAnchorElement>('a.path-go[data-path]').forEach(a=>a.addEventListener('click',()=>{try{localStorage.setItem('cyberhub:path',a.dataset.path||'');}catch{}}));
 let pid='';try{pid=localStorage.getItem('cyberhub:path')||'';}catch{}
 if(/^[a-z]{2,20}$/.test(pid))fetch(base+'/assets/paths.json').then(r=>r.json()).then((d:{paths:{id:string;title:string;steps:[string,string][]}[]})=>{
  const p=d.paths.find(x=>x.id===pid);if(!p)return;const i=p.steps.findIndex(s=>s[1]===rel);if(i<0)return;
  const bar=document.createElement('nav');bar.className='path-bar';bar.setAttribute('aria-label','Your path');
  const info=document.createElement('span');info.className='label';info.textContent=`${p.title} · step ${i+1} of ${p.steps.length}`;
  const go=document.createElement('a');go.className='button primary';
  if(i<p.steps.length-1){go.href=base+p.steps[i+1][1];go.textContent=`Next up: ${p.steps[i+1][0]} →`;}else{go.href=base+'/progress/';go.textContent='Path complete. See your badges →';}
  const x=document.createElement('button');x.type='button';x.className='path-x';const xl=document.createElement('span');xl.className='lbl';xl.textContent='Leave path';const xi=document.createElement('span');xi.className='ico';xi.setAttribute('aria-hidden','true');xi.textContent='×';x.append(xl,xi);x.setAttribute('aria-label','Leave this path');x.addEventListener('click',()=>{try{localStorage.removeItem('cyberhub:path');}catch{}bar.remove();});
  bar.append(info,go,x);document.body.append(bar);document.body.classList.add('has-path-bar');}).catch(()=>{});}
// Labs page: filter cards by level; tracks with nothing left hide themselves.
{const chips=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-lab-level]'));
 if(chips.length){const count=document.querySelector('.lab-filter-count');
  const apply=(lv:string)=>{let n=0;document.querySelectorAll<HTMLElement>('.lab-track').forEach(t=>{let shown=0;t.querySelectorAll<HTMLElement>('[data-levels]').forEach(c=>{const ok=!lv||(c.dataset.levels||'').split(' ').includes(lv);c.hidden=!ok;if(ok)shown++;});t.hidden=!shown;n+=shown;});
   chips.forEach(c=>c.setAttribute('aria-pressed',String((c.dataset.labLevel||'')===lv)));if(count)count.textContent=`${n} lab${n===1?'':'s'}`;try{sessionStorage.setItem('cyberhub:lab-level',lv);}catch{}};
  chips.forEach(c=>c.addEventListener('click',()=>apply(c.dataset.labLevel||'')));let saved='';try{saved=sessionStorage.getItem('cyberhub:lab-level')||'';}catch{}apply(saved);}}
// Continue: remember the last lab, lesson or game page visited, so the menu can send people back to it.
{const base=document.body.dataset.base||'',rel=location.pathname.slice(base.length)||'/';
 const worth=/^\/(labs\/[^/]+|linux\/.+|academy\/[^/]+|it\/[^/]+|ai\/red-team|duel|daily|challenges|start|defend\/[^/]+|plan|tutorials\/[^/]+|careers\/(?:match|resume))\//.test(rel);
 let last:{u?:string;t?:string}|null=null;try{last=JSON.parse(localStorage.getItem('cyberhub:last')||'null');}catch{}
 if(worth){try{localStorage.setItem('cyberhub:last',JSON.stringify({u:rel,t:document.title.split(' · ')[0].slice(0,60),at:Date.now()}));}catch{}}
 const mc=document.getElementById('menu-continue') as HTMLAnchorElement|null;
 if(mc){if(last&&last.u&&last.t&&last.u.startsWith('/')&&last.u!==rel){mc.href=base+last.u;mc.textContent=`Continue: ${last.t.length>26?last.t.slice(0,25)+'…':last.t} →`;}else{mc.href=base+'/progress/';mc.textContent='My progress →';}}}
const fine=matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const BLUE='#005eb8',BLUE_HI='#4d9de6';
let px=innerWidth/2,py=innerHeight/2,hasPointer=false,stageP=0;
addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;hasPointer=true;const c=$('#coords');if(c)c.textContent=`x ${(px/innerWidth).toFixed(3)} y ${(py/innerHeight).toFixed(3)}`;},{passive:true});
function sizeCanvas(cv:HTMLCanvasElement){const d=Math.min(2,devicePixelRatio||1);const w=cv.clientWidth,h=cv.clientHeight;if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);}const ctx=cv.getContext('2d')!;ctx.setTransform(d,0,0,d,0,0);return {ctx,w,h};}
const visible=new Map<Element,boolean>();
const globeSec=document.getElementById('core-canvas')?.closest('section')||null;
const vio=new IntersectionObserver(es=>es.forEach(e=>visible.set(e.target,e.isIntersecting)));

// Loader: under a second, home only, once per visit.
const loader=$('#loader');
if(loader){let seen=false;try{seen=sessionStorage.getItem('cyberhub:seen')==='1';}catch{}
 if(calm||seen)loader.remove();else{loader.classList.add('run');const t0=performance.now();const step=(now:number)=>{const p=clamp((now-t0)/1500,0,1),e=1-Math.pow(1-p,3);$('#load-count')!.textContent=`${Math.round(e*100)}%`;loader.querySelectorAll('.boot li').forEach((li,i,all)=>li.classList.toggle('on',e>=(i+.5)/all.length));$('#load-line')!.style.setProperty('--p',String(e));if(p<1)requestAnimationFrame(step);else{loader.classList.add('done');setTimeout(()=>loader.remove(),800);try{sessionStorage.setItem('cyberhub:seen','1');}catch{}}};requestAnimationFrame(step);loader.addEventListener('click',()=>loader.classList.add('done'));}}

// Menu
const menu=$('#menu'),menuOpen=$('#menu-open'),menuClose=$('#menu-close');
function setMenu(open:boolean){if(!menu)return;menu.classList.toggle('open',open);menuOpen?.setAttribute('aria-expanded',String(open));document.body.style.overflow=open?'hidden':'';(open?menuClose:menuOpen)?.focus();}
menuOpen?.addEventListener('click',()=>setMenu(true));menuClose?.addEventListener('click',()=>setMenu(false));
menu?.querySelectorAll('nav a').forEach(a=>a.addEventListener('click',()=>setMenu(false)));
addEventListener('keydown',e=>{if(!menu?.classList.contains('open'))return;if(e.key==='Escape')setMenu(false);if(e.key==='Tab'){const f=Array.from(menu.querySelectorAll<HTMLElement>('a, button'));const first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});

// Cursor (fine pointers only) and magnetic buttons
const cursor=$('#cursor');
if(cursor&&fine&&!calm){
 document.documentElement.classList.add('has-cursor');
 const ring=cursor.querySelector<HTMLElement>('.ring')!,dot=cursor.querySelector<HTMLElement>('.dot')!,lab=$('#cursor-label')!;let cx=px,cy=py;
 const loop=()=>{cx=lerp(cx,px,.2);cy=lerp(cy,py,.2);ring.style.transform=`translate(${cx}px,${cy}px)`;dot.style.transform=`translate(${px}px,${py}px)`;requestAnimationFrame(loop);};loop();
 document.addEventListener('pointerover',e=>{const t=(e.target as HTMLElement).closest<HTMLElement>('[data-cursor], .mod > a, .tile a');if(t){lab.textContent=t.dataset.cursor||'View';cursor.classList.add('act');}else cursor.classList.remove('act');cursor.classList.toggle('on-blue',!!(e.target as HTMLElement).closest('.tone-blue'));cursor.classList.toggle('globe',!!(e.target as HTMLElement).closest('#core-canvas'));});
 document.querySelectorAll<HTMLElement>('.button').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.14}px,${(e.clientY-r.top-r.height/2)*.24}px)`;});b.addEventListener('pointerleave',()=>{b.style.transform='';});});
}

// Reveals: in-view elements reveal at once; nothing waits on scrolling to become readable without JS.
const rio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rio.unobserve(e.target);}}),{rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('.rv, .fade, .acad, .dw').forEach(el=>rio.observe(el));
// Scroll-in: cards and sections below the fold rise in as they enter view, a few at a time.
// Anything on screen at load stays put, so the first view never waits on motion.
if(!calm&&'IntersectionObserver' in window){
 const SR='.card, .job, .digest-row, .dir-section, .wr-card, .role-card, .path-card, .lab-track, .play-tile, .hx-era, .gl-sec, .st-path, .guide-sources, .df-card';
 let batch=0,batchT=0;
 const sio=new IntersectionObserver(es=>{const now=performance.now();if(now-batchT>120)batch=0;batchT=now;es.forEach(e=>{if(!e.isIntersecting)return;const el=e.target as HTMLElement;el.style.transitionDelay=`${Math.min(batch++,6)*70}ms`;el.classList.add('in');sio.unobserve(el);const done=()=>{el.style.transitionDelay='';el.classList.remove('sr','in');};el.addEventListener('transitionend',e=>{if(e.target===el&&e.propertyName==='opacity')done();});setTimeout(done,1600);});},{rootMargin:'0px 0px -6% 0px'});
 document.querySelectorAll<HTMLElement>(`main :is(${SR})`).forEach(el=>{if(el.closest('.sr')||el.getBoundingClientRect().top<innerHeight)return;el.classList.add('sr');sio.observe(el);});
}


// Hero: type sized to its share of the measure; wireframe where it crosses the Core.
const heroH1=$('#hero-title'),seal=$('#seal'),sealTilt=$('#seal-tilt');
const maskSeal=()=>{if(!heroH1||!seal)return;const h=heroH1.getBoundingClientRect(),r=seal.getBoundingClientRect(),k=1+stageP*.5;heroH1.style.setProperty('--sx',`${r.left+r.width/2-h.left}px`);heroH1.style.setProperty('--sy',`${r.top+r.height/2-h.top}px`);heroH1.style.setProperty('--sr',`${r.width/2*k*.97}px`);};
if(heroH1){
 const solid=heroH1.querySelector('.type-solid')!;const wire=solid.cloneNode(true) as HTMLElement;wire.className='type-wire';heroH1.append(wire);heroH1.classList.add('masked');
 const fit=()=>maskSeal();
 fit();document.fonts?.ready.then(fit);addEventListener('resize',fit);
}

// Threat map: a deliberately simulated exercise, never presented as live telemetry.
// Country outlines come from the vendored Natural Earth 1:110m dataset. The
// geometry is rotated into an orthographic camera once per frame; no map tiles
// and no runtime network requests are involved.
const coreCv=$('#core-canvas') as HTMLCanvasElement|null;
// Attack map: an illustration of the kind of traffic security teams watch. Countries are real
// places on a real globe; the attacks are generated here and never presented as live telemetry.
type Place={name:string;lon:number;lat:number;big:boolean};
const PLACES:Place[]=[
 ['United States',-98,39,1],['Canada',-106,57,1],['Mexico',-102,23,1],['Brazil',-52,-10,1],['Argentina',-65,-35,1],['Chile',-71,-30,0],['Colombia',-73,4,0],['Peru',-75,-9,0],
 ['United Kingdom',-2,53,1],['Ireland',-8,53,0],['France',2.5,46.5,1],['Spain',-4,40,1],['Portugal',-8,39.5,0],['Germany',10.4,51,1],['Netherlands',5.5,52.2,0],['Italy',12.5,42.8,1],['Poland',19,52,0],['Sweden',16,62,1],['Norway',9,61,0],['Finland',26,63,0],['Ukraine',31,49,1],['Romania',25,46,0],['Turkey',35,39,1],
 ['Russia',95,61,1],['Kazakhstan',67,48,1],['China',104,35,1],['Mongolia',103,46.8,0],['Japan',138,36.5,1],['South Korea',127.8,36.3,0],['India',79,22,1],['Pakistan',69,30,0],['Iran',53,32,1],['Saudi Arabia',45,24,1],['United Arab Emirates',54,24,0],['Israel',35,31.5,0],
 ['Egypt',30,26.5,1],['Nigeria',8,9.5,1],['Kenya',38,0.5,0],['South Africa',24,-29,1],['Morocco',-6,32,0],['Algeria',3,28,1],['Ethiopia',39.5,8.5,0],
 ['Indonesia',117,-2,1],['Vietnam',106,15,0],['Thailand',101,15,0],['Philippines',122,12,0],['Singapore',103.8,1.35,0],['Australia',134,-25,1],['New Zealand',172,-41.5,0]
].map(([name,lon,lat,big])=>({name:name as string,lon:lon as number,lat:lat as number,big:!!big}));
const ATTACK_TYPES=[{name:'Malware',color:'0'},{name:'Phishing',color:'1'},{name:'DDoS',color:'2'},{name:'Intrusion',color:'3'}];
// Attack colors are resolved per theme so every type stays visible on the pale and the dark globe.
const ATK_LIGHT=['#005eb8','#111111','#5c9ee0','#8a8a8a'],ATK_DARK=['#4d9de6','#ffffff','#a9d1fb','#7d7d7d'];
const atkCol=(k:string)=>(document.documentElement.dataset.theme==='light'?ATK_LIGHT:ATK_DARK)[Number(k)]||'#888';
type Attack={from:number;to:number;t0:number;dur:number;color:string;pts:number[][]};
const attacks:Attack[]=[];const hot=new Map<number,{until:number;color:string}>();let nextAttack=0;
const mapLight=()=>document.documentElement.dataset.theme==='light';
function mapPalette(){const light=mapLight();return {line:(a:number)=>light?`rgba(5,5,5,${a})`:`rgba(255,255,255,${a})`,ink:light?'#050505':'#ffffff',muted:light?'rgba(5,5,5,.58)':'rgba(255,255,255,.58)',ground:light?'#edeff2':'#050505',accent:light?BLUE:BLUE_HI};}
type GeoPoint=[number,number];
type GeoPolygon={rings:GeoPoint[][];box:[number,number,number,number]};
type GeoCountry={code:string;name:string;polygons:GeoPolygon[]};
type GeoDoc={countries:Array<{code:string;name:string;polygons:GeoPoint[][][]}>};
type GlobeGeo={dots:Float32Array;coast:Float64Array;borders:Float64Array;countries:number};
let globeGeo:GlobeGeo|null=null;
// Orthographic globe. Natural Earth rings are sampled into unit vectors once;
// each animation frame only rotates points instead of re-testing polygons.
const RAD=Math.PI/180,GLOBE_START=-24*RAD,GLOBE_LAT=17*RAD;
// Pointer offsets from the base tilt, eased toward the cursor each frame, plus
// the orientation the visitor set by dragging.
let globeYaw=0,globePitch=0,dragYaw=0,dragPitch=0,spinClock=0,spinStamp=0;
const globeVec=(lon:number,lat:number):number[]=>{const a=lon*RAD,b=lat*RAD,cb=Math.cos(b);return [cb*Math.cos(a),cb*Math.sin(a),Math.sin(b)];};
function inRing(lon:number,lat:number,ring:GeoPoint[]):boolean{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const [xi,yi]=ring[i],[xj,yj]=ring[j];if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;}return inside;}
function ringBox(ring:GeoPoint[]):[number,number,number,number]{let x0=180,x1=-180,y0=90,y1=-90;for(const [x,y] of ring){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}return [x0,x1,y0,y1];}
function landAt(countries:GeoCountry[],lon:number,lat:number):boolean{
 for(const country of countries)for(const polygon of country.polygons){
  const [x0,x1,y0,y1]=polygon.box;if(lon<x0||lon>x1||lat<y0||lat>y1)continue;
  if(!inRing(lon,lat,polygon.rings[0]))continue;
  let hole=false;for(let i=1;i<polygon.rings.length;i++)if(inRing(lon,lat,polygon.rings[i])){hole=true;break;}
  if(!hole)return true;
 }
 return false;
}
function edgeKey(a:GeoPoint,b:GeoPoint):string{const ka=`${a[0]},${a[1]}`,kb=`${b[0]},${b[1]}`;return ka<kb?ka+'|'+kb:kb+'|'+ka;}
function pushEdge(target:number[],a:GeoPoint,b:GeoPoint){
 let dlon=b[0]-a[0];if(dlon>180)dlon-=360;else if(dlon<-180)dlon+=360;
 const dlat=b[1]-a[1],steps=Math.max(1,Math.ceil(Math.max(Math.abs(dlon),Math.abs(dlat))/.9));
 let lon0=a[0],lat0=a[1];
 for(let s=1;s<=steps;s++){
  const lon=lon0+dlon/steps,lat=lat0+dlat/steps,c0=Math.cos(lat0*RAD),c1=Math.cos(lat*RAD);
  target.push(c0*Math.cos(lon0*RAD),c0*Math.sin(lon0*RAD),Math.sin(lat0*RAD),c1*Math.cos(lon*RAD),c1*Math.sin(lon*RAD),Math.sin(lat*RAD));
  lon0=lon;lat0=lat;
 }
}
function buildGeo(doc:GeoDoc):GlobeGeo{
 if(!doc||!Array.isArray(doc.countries)||doc.countries.length<170)throw new Error('Geography data is incomplete.');
 const countries:GeoCountry[]=doc.countries.map(country=>({code:country.code,name:country.name,polygons:country.polygons.map(rings=>({rings,box:ringBox(rings[0])}))}));
 // An edge shared by two countries is an internal boundary; the rest is coast.
 const shared=new Map<string,number>();
 for(const country of countries)for(const polygon of country.polygons)for(const ring of polygon.rings)for(let i=0;i+1<ring.length;i++){
  const key=edgeKey(ring[i],ring[i+1]);shared.set(key,(shared.get(key)||0)+1);
 }
 const coast:number[]=[],borders:number[]=[];
 for(const country of countries)for(const polygon of country.polygons)for(let r=0;r<polygon.rings.length;r++){
  const ring=polygon.rings[r];
  for(let i=0;i+1<ring.length;i++){
   const border=r===0&&(shared.get(edgeKey(ring[i],ring[i+1]))||0)>1;
   pushEdge(border?borders:coast,ring[i],ring[i+1]);
  }
 }
 const dots:number[]=[];
 for(let lat=-84;lat<=84;lat+=1.5){
  const step=Math.min(8,1.5/Math.max(.25,Math.cos(lat*RAD)));
  for(let lon=-180;lon<180;lon+=step)if(landAt(countries,lon,lat)){const v=globeVec(lon,lat);dots.push(v[0],v[1],v[2]);}
 }
 return {dots:new Float32Array(dots),coast:new Float64Array(coast),borders:new Float64Array(borders),countries:countries.length};
}
if(coreCv){
 coreCv.dataset.ready='loading';
 fetch(`${base}/assets/geo/ne_110m_countries.json`)
  .then(response=>{if(!response.ok)throw new Error('Geography could not load.');return response.json() as Promise<GeoDoc>;})
  .then(doc=>{globeGeo=buildGeo(doc);coreCv.dataset.ready='ready';})
  .catch(()=>{coreCv.dataset.ready='error';});
}
const GRID_VEC:number[][][]=[];
for(let lon=-180;lon<180;lon+=30){const line:number[][]=[];for(let lat=-88;lat<=88;lat+=4)line.push(globeVec(lon,lat));GRID_VEC.push(line);}
for(let lat=-60;lat<=60;lat+=30){const line:number[][]=[];for(let lon=-180;lon<=180;lon+=4)line.push(globeVec(lon,lat));GRID_VEC.push(line);}
const PLACE_VEC:number[][]=PLACES.map(n=>globeVec(n.lon,n.lat));
// Great-circle arc from a to b, lifted off the surface in proportion to distance.
function arcPoints(a:number[],b:number[]):number[][]{const dot=clamp(a[0]*b[0]+a[1]*b[1]+a[2]*b[2],-1,1),om=Math.acos(dot)||1e-6,so=Math.sin(om),lift=.04+.22*om/Math.PI,out:number[][]=[];
 for(let s=0;s<=56;s++){const t=s/56,ka=Math.sin((1-t)*om)/so,kb=Math.sin(t*om)/so;const vx=a[0]*ka+b[0]*kb,vy=a[1]*ka+b[1]*kb,vz=a[2]*ka+b[2]*kb,len=Math.hypot(vx,vy,vz)||1,r=1.006+lift*Math.sin(Math.PI*t);out.push([vx/len*r,vy/len*r,vz/len*r]);}return out;}
function spawnAttack(now:number){let from=Math.floor(Math.random()*PLACES.length),to=Math.floor(Math.random()*PLACES.length),guard=0;
 while((to===from||Math.acos(clamp(PLACE_VEC[from][0]*PLACE_VEC[to][0]+PLACE_VEC[from][1]*PLACE_VEC[to][1]+PLACE_VEC[from][2]*PLACE_VEC[to][2],-1,1))<.35)&&guard++<20)to=Math.floor(Math.random()*PLACES.length);
 const type=ATTACK_TYPES[Math.floor(Math.random()*ATTACK_TYPES.length)];attacks.push({from,to,t0:now,dur:1500+Math.random()*1300,color:type.color,pts:arcPoints(PLACE_VEC[from],PLACE_VEC[to])});}
type Globe={small:boolean;cx:number;cy:number;R:number;c:number;s:number;pc:number;ps:number};
let dragState:{id:number;x:number;y:number}|null=null;
function advanceSpin(){
 const now=performance.now();
 if(!spinStamp)spinStamp=now;
 const dt=Math.min(64,Math.max(0,now-spinStamp));spinStamp=now;
 if(!dragState)spinClock+=dt;
}
function globeCamera(w:number,h:number):Globe{
 const small=w<520,cx=w*(small?.5:.5),cy=h*(small?.5:.5),R=Math.min(w,h)*(small?.41:.44);
 const aim=fine&&hasPointer&&!calm&&!dragState;
 globeYaw=lerp(globeYaw,aim?-(px/innerWidth-.5)*1.1:0,.06);
 globePitch=lerp(globePitch,aim?(.5-py/innerHeight)*.7:0,.06);
 const spin=calm?0:spinClock*.00003;
 const lon0=(GLOBE_START-spin+dragYaw+globeYaw)%(Math.PI*2);
 const lat=clamp(GLOBE_LAT+dragPitch+globePitch,-1.35,1.35);
 return {small,cx,cy,R,c:Math.cos(lon0),s:Math.sin(lon0),pc:Math.cos(lat),ps:Math.sin(lat)};
}
if(coreCv){
 const syncDrag=()=>{coreCv.dataset.dragYaw=dragYaw.toFixed(4);coreCv.dataset.dragPitch=dragPitch.toFixed(4);};
 const endDrag=(e:PointerEvent)=>{
  if(!dragState||dragState.id!==e.pointerId)return;
  dragState=null;coreCv.dataset.dragging='false';coreCv.classList.remove('dragging');
  if(coreCv.hasPointerCapture(e.pointerId))coreCv.releasePointerCapture(e.pointerId);
 };
 coreCv.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  dragState={id:e.pointerId,x:e.clientX,y:e.clientY};
  // Fold the eased hover offset into the persistent orientation so the sphere
  // does not jump when the visitor starts dragging.
  dragYaw+=globeYaw;globeYaw=0;dragPitch+=globePitch;globePitch=0;
  coreCv.dataset.dragging='true';coreCv.classList.add('dragging');syncDrag();
  try{coreCv.setPointerCapture(e.pointerId);}catch{}
  e.preventDefault();
 });
 coreCv.addEventListener('pointermove',e=>{
  if(!dragState||dragState.id!==e.pointerId)return;
  const dx=e.clientX-dragState.x,dy=e.clientY-dragState.y;
  dragState.x=e.clientX;dragState.y=e.clientY;
  if(dx||dy){
   dragYaw-=dx*.0062;
   dragPitch=clamp(dragPitch+dy*.0062,-1.15,1.15);
   syncDrag();
  }
  e.preventDefault();
 });
 coreCv.addEventListener('pointerup',endDrag);
 coreCv.addEventListener('pointercancel',endDrag);
 coreCv.addEventListener('lostpointercapture',endDrag);
}
// Rotate a unit vector into camera space; z>0 faces the viewer.
function globePoint(v:number[],g:Globe):[number,number,number]{
 const x=g.c*v[0]+g.s*v[1],y0=-g.s*v[0]+g.c*v[1],z0=v[2];
 const y=g.pc*z0-g.ps*y0,z=g.ps*z0+g.pc*y0;
 return [g.cx-g.R*x,g.cy-g.R*y,z];
}
function strokeVisible(ctx:CanvasRenderingContext2D,pts:number[][],g:Globe,minZ=.02){
 let open=false;ctx.beginPath();
 for(const v of pts){const [x,y,z]=globePoint(v,g);if(z>=minZ){if(open)ctx.lineTo(x,y);else{ctx.moveTo(x,y);open=true;}}else open=false;}
 ctx.stroke();
}
// Draw pre-sampled geography segments (six numbers: one unit vector pair).
// Segments are short enough that a horizon test on both ends is sufficient.
function strokeGeo(ctx:CanvasRenderingContext2D,flat:Float64Array,g:Globe,minZ=.015){
 if(!flat.length)return;ctx.beginPath();
 for(let i=0;i<flat.length;i+=6){
  const ax=flat[i],ay=flat[i+1],az=flat[i+2],bx=flat[i+3],by=flat[i+4],bz=flat[i+5];
  const axr=g.c*ax+g.s*ay,ayr=-g.s*ax+g.c*ay;
  const bxr=g.c*bx+g.s*by,byr=-g.s*bx+g.c*by;
  const ay2=g.pc*az-g.ps*ayr,az2=g.ps*az+g.pc*ayr;
  const by2=g.pc*bz-g.ps*byr,bz2=g.ps*bz+g.pc*byr;
  if(az2<minZ||bz2<minZ)continue;
  ctx.moveTo(g.cx-g.R*axr,g.cy-g.R*ay2);
  ctx.lineTo(g.cx-g.R*bxr,g.cy-g.R*by2);
 }
 ctx.stroke();
}
function drawAttackMap(){
 if(!coreCv)return;const {ctx,w,h}=sizeCanvas(coreCv);if(!w)return;ctx.clearRect(0,0,w,h);
 advanceSpin();
 const light=mapLight(),p=mapPalette(),g=globeCamera(w,h),{cx,cy,R,small}=g;
 ctx.lineWidth=1;ctx.textBaseline='middle';
 // Sphere body, lit from the upper left like a white/blue instrument.
 const body=ctx.createRadialGradient(cx-R*.38,cy-R*.46,R*.08,cx,cy,R*1.05);
 if(light){body.addColorStop(0,'#ffffff');body.addColorStop(.6,'#e7edf5');body.addColorStop(1,'#c7d3e1');}
 else{body.addColorStop(0,'#1d1d1d');body.addColorStop(.55,'#101010');body.addColorStop(1,'#060606');}
 ctx.fillStyle=body;ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fill();
 // Graticule, then real land: dot field, country borders and coastlines on the
 // front hemisphere only.
 ctx.strokeStyle=p.line(.06);for(const line of GRID_VEC)strokeVisible(ctx,line,g);
 if(globeGeo){
  ctx.fillStyle=p.line(light?.32:.26);
  const dot=small?1.1:1.35;
  for(let i=0;i<globeGeo.dots.length;i+=3){
   const vx=globeGeo.dots[i],vy=globeGeo.dots[i+1],vz=globeGeo.dots[i+2];
   const x=g.c*vx+g.s*vy,y0=-g.s*vx+g.c*vy,y=g.pc*vz-g.ps*y0,z=g.ps*vz+g.pc*y0;
   if(z>.02)ctx.fillRect(cx-R*x-dot/2,cy-R*y-dot/2,dot,dot);
  }
  ctx.strokeStyle=p.line(light?.22:.2);ctx.lineWidth=.7;strokeGeo(ctx,globeGeo.borders,g);ctx.lineWidth=1;
  ctx.strokeStyle=p.line(light?.58:.54);strokeGeo(ctx,globeGeo.coast,g);
 }
 // Shade the limb so the disk reads as a sphere, not a disc.
 const shade=ctx.createRadialGradient(cx-R*.34,cy-R*.38,R*.05,cx-R*.05,cy-R*.05,R*1.18);
 shade.addColorStop(0,'rgba(255,255,255,.10)');shade.addColorStop(.48,'rgba(255,255,255,0)');shade.addColorStop(1,light?'rgba(5,5,5,.20)':'rgba(0,0,0,.58)');
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.clip();ctx.fillStyle=shade;ctx.fillRect(cx-R,cy-R,R*2,R*2);ctx.restore();
 // Rim light and a soft atmosphere instead of instrument rings.
 ctx.strokeStyle=p.line(light?.18:.22);ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.stroke();
 const glow=ctx.createRadialGradient(cx,cy,R*.98,cx,cy,R*1.16);glow.addColorStop(0,light?'rgba(0,0,0,.08)':'rgba(255,255,255,.07)');glow.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=glow;ctx.beginPath();ctx.arc(cx,cy,R*1.16,0,Math.PI*2);ctx.arc(cx,cy,R,0,Math.PI*2,true);ctx.fill();
 // Attacks: spawn, travel, impact. Reduced motion shows a still frame with a few arcs.
 const now=performance.now();
 if(calm){if(!attacks.length){for(let k=0;k<7;k++)spawnAttack(now-900-k*260);}}
 else{if(now>=nextAttack&&attacks.length<(small?9:16)){spawnAttack(now);nextAttack=now+(small?420:240)+Math.random()*340;}}
 for(let k=attacks.length-1;k>=0;k--){
  const A=attacks[k],age=calm?A.dur*.82:now-A.t0,prog=Math.min(1,age/A.dur),fade=age>A.dur?1-Math.min(1,(age-A.dur)/900):1;
  if(fade<=0){attacks.splice(k,1);continue;}
  const n=A.pts.length-1,head=Math.max(1,Math.round(prog*n)),tail=Math.max(0,head-Math.round(n*.45));
  ctx.lineWidth=small?1.4:1.8;ctx.lineCap='round';
  for(let s2=Math.max(tail,1);s2<=head;s2++){const [x0,y0,z0]=globePoint(A.pts[s2-1],g),[x1,y1,z1]=globePoint(A.pts[s2],g);if(z0<-.02||z1<-.02)continue;
   ctx.globalAlpha=fade*Math.pow((s2-tail)/Math.max(1,head-tail),1.6)*(prog<1?1:.55);ctx.strokeStyle=atkCol(A.color);ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();}
  ctx.globalAlpha=1;ctx.lineWidth=1;
  if(prog<1){const [hx,hy,hz]=globePoint(A.pts[head],g);if(hz>-.02){ctx.fillStyle=light?'#111':'#fff';ctx.beginPath();ctx.arc(hx,hy,small?1.6:2.1,0,Math.PI*2);ctx.fill();ctx.fillStyle=atkCol(A.color);ctx.globalAlpha=.35;ctx.beginPath();ctx.arc(hx,hy,small?4:5.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}}
  else{const [tx,ty,tz]=globePoint(PLACE_VEC[A.to],g);hot.set(A.to,{until:now+1600,color:A.color});
   if(tz>.02){const r=(small?5:7)+(1-fade)*(small?14:22);ctx.strokeStyle=atkCol(A.color);ctx.globalAlpha=fade*.9;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(tx,ty,r,0,Math.PI*2);ctx.stroke();ctx.lineWidth=1;ctx.globalAlpha=1;}}
  if(age<500)hot.set(A.from,{until:now+1200,color:A.color});
 }
 // Country names: attack participants first, then the big ones, never overlapping.
 ctx.textAlign='center';ctx.textBaseline='middle';const boxes:number[][]=[];
 const order=PLACES.map((pl,i)=>{const h0=hot.get(i);return {i,pl,active:!!h0&&h0.until>now,color:h0?h0.color:''};}).sort((x,y)=>Number(y.active)-Number(x.active)||Number(y.pl.big)-Number(x.pl.big));
 for(const {i,pl,active,color} of order){const [x,y,z]=globePoint(PLACE_VEC[i],g);if(z<=.18)continue;if(!active&&(!pl.big||small))continue;
  ctx.font=`${active?600:500} ${small?9.5:11}px "IBM Plex Sans", system-ui, sans-serif`;const tw=ctx.measureText(pl.name).width,ly=y-(small?9:11),bx=[x-tw/2-3,ly-7,x+tw/2+3,ly+7];
  if(boxes.some(o=>bx[0]<o[2]&&bx[2]>o[0]&&bx[1]<o[3]&&bx[3]>o[1])){if(active){ctx.fillStyle=atkCol(color);ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill();}continue;}
  boxes.push(bx);const a=Math.min(1,(z-.18)/.3);ctx.globalAlpha=a*(active?1:.75);
  ctx.fillStyle=active?atkCol(color):p.muted;ctx.beginPath();ctx.arc(x,y,active?2.6:1.6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=active?p.ink:p.muted;ctx.fillText(pl.name,x,ly);ctx.globalAlpha=1;}
}
if(coreCv)sealTilt?.classList.add('live');

// Scroll choreography: header tone, progress, aperture, marquee, map.
const head=$('#site-header'),prog=$('#progress'),stage=$('#top'),aperture=$('#aperture'),apRing=$('#ap-ring');
const scenes=Array.from(document.querySelectorAll<HTMLElement>('[data-tone]'));
const m1=$('#m1'),m2=$('#m2'),interlude=$('.interlude');
let ticking=false,counted=false,lastY=scrollY;
function countUp(){document.querySelectorAll<HTMLElement>('.spec strong[data-count]').forEach(el=>{const end=Number(el.dataset.count),t0=performance.now();const st=(now:number)=>{const p=clamp((now-t0)/1200,0,1);el.textContent=String(Math.round(end*(1-Math.pow(1-p,4)))).padStart(2,'0');if(p<1)requestAnimationFrame(st);};requestAnimationFrame(st);});}
function onScroll(){
 ticking=false;const sy=scrollY;
 prog?.style.setProperty('--p',(sy/Math.max(1,document.documentElement.scrollHeight-innerHeight)).toFixed(4));
 head?.classList.toggle('scrolled',sy>40);
 // Header steps aside while reading down the page and comes back on any scroll up.
 if(head){const dy=sy-lastY;if(sy<160||document.body.style.overflow==='hidden')head.classList.remove('tuck');else if(dy>8)head.classList.add('tuck');else if(dy<-8)head.classList.remove('tuck');if(Math.abs(dy)>8||sy<160)lastY=sy;}
 if(stage&&seal&&aperture&&apRing&&!calm){
  const r=stage.getBoundingClientRect();stageP=clamp(-r.top/(r.height-innerHeight),0,1);
  const sr=seal.getBoundingClientRect(),hasSeal=sr.width>0;
  const ox=hasSeal?sr.left+sr.width/2:innerWidth*.5,oy=hasSeal?sr.top+sr.height/2:innerHeight*.5;
  const open=clamp((stageP-.06)/.62,0,1),e=open*open*(3-2*open);const far=Math.hypot(Math.max(ox,innerWidth-ox),Math.max(oy,innerHeight-oy));const rad=e===0?0:lerp(hasSeal?sr.width*.2:innerWidth*.2,far,e);
  for(const el of [aperture,apRing]){el.style.setProperty('--ar',`${rad}px`);el.style.setProperty('--ax',`${ox}px`);el.style.setProperty('--ay',`${oy}px`);}
  apRing.style.setProperty('--ao',e>0&&e<1?'1':'0');sealTilt?.style.setProperty('--ss',(1+stageP*.5).toFixed(3));heroH1?.style.setProperty('--hy',`${(-stageP*120).toFixed(1)}px`);maskSeal();
  (aperture as any).inert=open<.9;if(open>.9&&!counted){counted=true;countUp();}
 }
 if(head&&scenes.length){for(const s of scenes){const r=s.getBoundingClientRect();if(r.top<=36&&r.bottom>36){const tone=(s===stage&&!calm&&stageP>.45)?'paper':s.dataset.tone||'void';head.classList.remove('tone-void','tone-paper','tone-blue','tone-carbon','tone-footer');head.classList.add('tone-'+tone);break;}}}
 if(!calm&&interlude&&m1&&m2){const r=interlude.getBoundingClientRect(),p=clamp((innerHeight-r.top)/(innerHeight+r.height),0,1);m1.style.transform=`translate3d(${(-p*38).toFixed(2)}%,0,0)`;m2.style.transform=`translate3d(${(p*30-20).toFixed(2)}%,0,0)`;}
 netScroll();
}
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(onScroll);}},{passive:true});
addEventListener('resize',onScroll);
head?.addEventListener('focusin',()=>head.classList.remove('tuck'));

// Learning map: server-rendered discipline buttons drive a canvas map.
const netSec=$('#map'),netCv=$('#net-canvas') as HTMLCanvasElement|null;
const nodeBtns=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-node]'));
let active=0,hoverNode=-1,online=calm?nodeBtns.length:0;
function selectNode(i:number){active=i;nodeBtns.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));const b=nodeBtns[i];if(!b)return;$('#nc-idx')!.textContent=`Discipline ${i+1} of ${nodeBtns.length}`;$('#nc-name')!.textContent=b.dataset.name||'';$('#nc-text')!.textContent=b.dataset.text||'';$('#nc-links')!.textContent=`Tools / ${b.dataset.tools}${b.dataset.lab?' — '+b.dataset.lab:''}`;}
nodeBtns.forEach((b,i)=>{b.addEventListener('click',()=>selectNode(i));b.addEventListener('pointerenter',()=>{hoverNode=i;});b.addEventListener('pointerleave',()=>{hoverNode=-1;});});
function netScroll(){if(!netSec||calm||!nodeBtns.length)return;const r=netSec.getBoundingClientRect();const p=innerWidth<=860?clamp((innerHeight*.9-r.top)/(innerHeight*.9),0,1):clamp((-r.top+innerHeight*.2)/(r.height-innerHeight),0,1);const n=Math.min(nodeBtns.length,Math.floor(p*(nodeBtns.length+1.2)));if(n!==online){online=n;const nc=$('#net-count');if(nc)nc.textContent=String(n).padStart(2,'0');nodeBtns.forEach((b,j)=>b.classList.toggle('live',j<n));}}
if(calm)nodeBtns.forEach(b=>b.classList.add('live'));
const glow=nodeBtns.map(()=>0);let netT=0;const pts=nodeBtns.map((_,i)=>({a:-Math.PI/2+i/nodeBtns.length*Math.PI*2,x:0,y:0}));
const fixed:( {fx:number,fy:number}|null )[]=nodeBtns.map(()=>null);let dragI=-1;let dragMoved=false;
const hitNode=(e:PointerEvent|MouseEvent)=>{if(!netCv)return -1;const r=netCv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;let best=-1,bd=28;pts.forEach((p,i)=>{const d=Math.hypot(p.x-x,p.y-y);if(d<bd&&i<online){bd=d;best=i;}});return best;};
if(netCv){
 netCv.addEventListener('pointerdown',e=>{const i=hitNode(e);if(i<0)return;dragI=i;dragMoved=false;netCv.setPointerCapture(e.pointerId);netCv.classList.add('dragging');e.preventDefault();});
 netCv.addEventListener('pointermove',e=>{const r=netCv.getBoundingClientRect();if(dragI<0){netCv.classList.toggle('can-drag',hitNode(e)>=0);return;}dragMoved=true;fixed[dragI]={fx:clamp((e.clientX-r.left)/r.width,.04,.96),fy:clamp((e.clientY-r.top)/r.height,.06,.94)};});
 const end=(e:PointerEvent)=>{if(dragI<0)return;if(!dragMoved)selectNode(dragI);else{selectNode(dragI);$('#net-hint')?.classList.add('moved');}dragI=-1;netCv.classList.remove('dragging');try{netCv.releasePointerCapture(e.pointerId);}catch{}};
 netCv.addEventListener('pointerup',end);netCv.addEventListener('pointercancel',end);
 $('#net-reset')?.addEventListener('click',()=>{fixed.fill(null);const card=$('#node-card');if(card){card.style.removeProperty('--dx');card.style.removeProperty('--dy');}$('#net-hint')?.classList.remove('moved');});
}
// Draggable, collapsible info card
const card=$('#node-card'),grip=$('#nc-grip'),area=$('#net-area');
if(card&&grip&&area){
 let sx=0,sy=0,ox=0,oy=0,on=false;const get=(k:string)=>parseFloat(card.style.getPropertyValue(k)||'0');
 const place=(dx:number,dy:number)=>{const a=area.getBoundingClientRect(),c=card.getBoundingClientRect();const bx=c.left-get('--dx'),by=c.top-get('--dy');
  dx=clamp(dx,a.left-bx,a.right-c.width-bx);dy=clamp(dy,a.top-by-40,a.bottom-c.height-by);card.style.setProperty('--dx',dx+'px');card.style.setProperty('--dy',dy+'px');};
 grip.addEventListener('pointerdown',e=>{on=true;sx=e.clientX;sy=e.clientY;ox=get('--dx');oy=get('--dy');grip.setPointerCapture(e.pointerId);card.classList.add('moving');e.preventDefault();});
 grip.addEventListener('pointermove',e=>{if(on)place(ox+e.clientX-sx,oy+e.clientY-sy);});
 const stop=()=>{on=false;card.classList.remove('moving');};grip.addEventListener('pointerup',stop);grip.addEventListener('pointercancel',stop);
 grip.addEventListener('keydown',e=>{const st=e.shiftKey?40:12;const m:Record<string,[number,number]>={ArrowLeft:[-st,0],ArrowRight:[st,0],ArrowUp:[0,-st],ArrowDown:[0,st]};const v=m[e.key];if(!v)return;e.preventDefault();place(get('--dx')+v[0],get('--dy')+v[1]);});
 const min=$('#nc-min');min?.addEventListener('click',()=>{const c=card.classList.toggle('collapsed');min.setAttribute('aria-expanded',String(!c));min.textContent=c?'+':'–';min.setAttribute('aria-label',c?'Expand card':'Collapse card');});
}
function drawNet(dt:number){
 if(!netCv)return;const {ctx,w:nw,h:nh}=sizeCanvas(netCv);if(!nw)return;netT+=dt;ctx.clearRect(0,0,nw,nh);
 const light=mapLight(),palette=mapPalette(),accentA=(a:number)=>light?`rgba(0, 94, 184,${a})`:`rgba(77, 157, 230,${a})`;
 const small=nw<520,cx=small?nw*.5:nw*.42,cy=small?nh*.46:nh*.4,R=Math.min(nw,nh)*(small?.26:.3);const r=netCv.getBoundingClientRect(),mx=px-r.left,my=py-r.top;
 ctx.strokeStyle=palette.line(.08);ctx.lineWidth=1;for(const rr of [R*.32,R,R*1.22]){ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(cx-R*1.32,cy);ctx.lineTo(cx+R*1.32,cy);ctx.moveTo(cx,cy-R*1.32);ctx.lineTo(cx,cy+R*1.32);ctx.stroke();
 for(let i=0;i<72;i++){const a=i/72*Math.PI*2,l=i%9===0?10:4;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*R*1.22,cy+Math.sin(a)*R*1.22);ctx.lineTo(cx+Math.cos(a)*(R*1.22+l),cy+Math.sin(a)*(R*1.22+l));ctx.stroke();}
 pts.forEach((p,i)=>{const f=fixed[i];let x=f?f.fx*nw:cx+Math.cos(p.a+netT*.00004)*R,y=f?f.fy*nh:cy+Math.sin(p.a+netT*.00004)*R;const d=Math.hypot(mx-x,my-y),pull=hasPointer&&!calm&&dragI<0&&!f?clamp(1-d/220,0,1)*18:0;if(d>0){x+=(mx-x)/d*pull;y+=(my-y)/d*pull;}p.x=x;p.y=y;glow[i]=lerp(glow[i],(i===active||i===hoverNode)?1:0,.12);});
 pts.forEach((p,i)=>{if(i>=online)return;ctx.strokeStyle=accentA(.25+glow[i]*.6);ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();});
 nodeBtns.forEach((b,i)=>{(b.dataset.rel||'').split(',').map(Number).forEach(j=>{if(i>=online||j>=online)return;const a=pts[i],q=pts[j];if(!q)return;const hot=Math.max(glow[i],glow[j]);const mxp=lerp(a.x,q.x,.5),myp=lerp(a.y,q.y,.5),qx=mxp+(cx-mxp)*.35,qy=myp+(cy-myp)*.35;ctx.strokeStyle=hot>.05?accentA(.2+hot*.7):palette.line(.14);ctx.lineWidth=hot>.5?1.5:1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(qx,qy,q.x,q.y);ctx.stroke();ctx.lineWidth=1;if(!calm&&hot>.5){const t=((netT*.00035)+i*.13)%1,x=(1-t)*(1-t)*a.x+2*(1-t)*t*qx+t*t*q.x,y=(1-t)*(1-t)*a.y+2*(1-t)*t*qy+t*t*q.y;ctx.fillStyle=palette.accent;ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}});});
 ctx.fillStyle=palette.ground;ctx.strokeStyle=palette.accent;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,cy,R*.22,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.lineWidth=1;
 ctx.fillStyle=palette.ink;ctx.font=`800 ${Math.max(13,R*.1)}px Archivo, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('HUB',cx,cy);
 pts.forEach((p,i)=>{const on=i<online,g=glow[i];ctx.beginPath();ctx.arc(p.x,p.y,6+g*4,0,Math.PI*2);ctx.fillStyle=on?(g>.3?palette.accent:palette.ink):palette.ground;ctx.strokeStyle=on?palette.accent:palette.line(.3);ctx.fill();ctx.stroke();if(g>.05){ctx.strokeStyle=accentA(g*.6);ctx.beginPath();ctx.arc(p.x,p.y,14+g*8,0,Math.PI*2);ctx.stroke();}
  const ang=fixed[i]?Math.atan2(p.y-cy,p.x-cx):p.a,cos=Math.cos(ang),vert=Math.abs(cos)<.2;ctx.textAlign=vert?'center':(cos>0?'left':'right');const lx=p.x+(vert?0:Math.sign(cos)*18),ly=p.y+(vert?(Math.sin(ang)<0?-24:26):0);const name=nodeBtns[i].dataset.name||'';
  ctx.fillStyle=on?palette.ink:palette.line(.3);ctx.font=`${g>.3?700:500} ${small?11:14}px Archivo, sans-serif`;ctx.fillText(small?name.split(' ')[0]:name,lx,ly-(small?0:7));
  });
}
// Module art (hover plates) and the diptych machine renders.
function art(cv:HTMLCanvasElement){
 const {ctx:c,w,h}=sizeCanvas(cv);if(!w)return;c.fillStyle='#050505';c.fillRect(0,0,w,h);c.strokeStyle='rgba(255,255,255,.07)';for(let x=0;x<w;x+=20){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=0;y<h;y+=20){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
 let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;const k=cv.dataset.art;c.font='500 10px "IBM Plex Sans", system-ui, sans-serif';c.textBaseline='middle';
 if(k==='trace'){const xs=[w*.22,w*.78];c.strokeStyle='rgba(255,255,255,.35)';c.setLineDash([3,5]);xs.forEach(x=>{c.beginPath();c.moveTo(x,h*.18);c.lineTo(x,h*.92);c.stroke();});c.setLineDash([]);for(let i=0;i<4;i++){const y=h*(.32+i*.16),l=i%2===0;c.strokeStyle=BLUE_HI;c.lineWidth=2;c.beginPath();c.moveTo(l?xs[0]:xs[1],y);c.lineTo(l?xs[1]:xs[0],y);c.stroke();const hx=l?xs[1]:xs[0],dr=l?-1:1;c.beginPath();c.moveTo(hx+dr*8,y-5);c.lineTo(hx,y);c.lineTo(hx+dr*8,y+5);c.stroke();}c.lineWidth=1;c.fillStyle='#fff';c.textAlign='center';c.fillText('192.0.2.10',xs[0],h*.1);c.fillText('192.0.2.53',xs[1],h*.1);}
 else if(k==='topology'){const P:number[][]=[];for(let i=0;i<26;i++)P.push([w*(.1+rnd()*.8),h*(.12+rnd()*.76)]);P.forEach((p,i)=>P.forEach((q,j)=>{if(j>i&&Math.hypot(p[0]-q[0],p[1]-q[1])<w*.2){c.strokeStyle=i%5===0?'rgba(77, 157, 230,.8)':'rgba(255,255,255,.22)';c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke();}}));P.forEach((p,i)=>{c.fillStyle=i%5===0?BLUE_HI:'#fff';c.beginPath();c.arc(p[0],p[1],i%5===0?4:2.2,0,7);c.fill();});}
 else if(k==='bars'){[12,22,18,28,20].forEach((v,i)=>{const y=h*(.18+i*.15);c.fillStyle='rgba(255,255,255,.12)';c.fillRect(w*.16,y,w*.72,10);c.fillStyle=v===28?BLUE_HI:'#fff';c.fillRect(w*.16,y,w*.72*v/28,10);c.fillStyle='rgba(255,255,255,.6)';c.textAlign='left';c.fillText('D'+(i+1),w*.06,y+5);});}
 else if(k==='tools'){for(let y=0;y<4;y++)for(let x=0;x<6;x++){const on=rnd()>.75,X=w*.08+x*w*.14,Y=h*.14+y*h*.18;c.strokeStyle=on?BLUE_HI:'rgba(255,255,255,.25)';c.strokeRect(X,Y,w*.12,h*.15);if(on){c.fillStyle='rgba(77, 157, 230,.25)';c.fillRect(X,Y,w*.12,h*.15);}}}
 else{let x=w*.1,y=h*.8;const P:number[][]=[[x,y]];for(let i=0;i<6;i++){x+=w*.13;y-=h*(.06+rnd()*.06);P.push([x,y]);}c.strokeStyle='rgba(255,255,255,.45)';c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();P.forEach((p,i)=>{c.fillStyle=i===6?BLUE_HI:'#fff';c.beginPath();c.arc(p[0],p[1],i===6?5:3,0,7);c.fill();});}
}
const arts=Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-art]'));
const paintArts=()=>arts.forEach(art);paintArts();document.fonts?.ready.then(paintArts);addEventListener('resize',paintArts);
document.querySelectorAll<HTMLElement>('.mod').forEach(li=>li.addEventListener('pointermove',e=>{const r=li.getBoundingClientRect();li.querySelector<HTMLElement>('.mod-media')?.style.setProperty('--my',`${(e.clientY-r.top-r.height/2)*.35}px`);}));

const machines=Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-machine]'));
machines.forEach(m=>vio.observe(m));
function metalRing(c:CanvasRenderingContext2D,x:number,y:number,r:number,wd:number,light:boolean){const g=c.createLinearGradient(x-r,y-r,x+r,y+r);if(light){g.addColorStop(0,'#ffffff');g.addColorStop(.5,'#a7adb7');g.addColorStop(1,'#5d636d');}else{g.addColorStop(0,'#6b717c');g.addColorStop(.45,'#2a2d33');g.addColorStop(1,'#0d0e11');}c.strokeStyle=g;c.lineWidth=wd;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.lineWidth=1;}
function bolt(c:CanvasRenderingContext2D,x:number,y:number,r:number,blue=false){const g=c.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);g.addColorStop(0,blue?'#8fc0ff':'#e9ecf1');g.addColorStop(1,blue?'#005eb8':'#3a3e46');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function drawRig(cv:HTMLCanvasElement,t:number){
 const {ctx:c,w,h}=sizeCanvas(cv);if(!w)return;c.clearRect(0,0,w,h);const cx=w/2+(hasPointer&&!calm?(px/innerWidth-.5)*8:0),cy=h/2,R=Math.min(w,h)*.3,rot=calm?0:t*.00012;
 // gantry rails and four arm brackets
 c.fillStyle='#1d2026';c.fillRect(cx-R*.18,0,R*.36,h);c.fillStyle='rgba(255,255,255,.06)';c.fillRect(cx-R*.18,0,2,h);
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const ax=cx+sx*R*1.55,ay=cy+sy*R*1.05;c.strokeStyle='#0a0b0d';c.lineWidth=R*.16;c.lineCap='square';c.beginPath();c.moveTo(ax,ay);c.lineTo(ax,cy+sy*R*.35);c.lineTo(cx+sx*R*.98,cy+sy*R*.35);c.stroke();c.strokeStyle='#2c3038';c.lineWidth=R*.1;c.stroke();c.lineWidth=1;bolt(c,ax,ay,R*.11);bolt(c,ax,ay,R*.05,true);c.fillStyle='rgba(255,255,255,.35)';c.font='500 9px "IBM Plex Sans", system-ui, sans-serif';c.textAlign=sx<0?'left':'right';c.fillText(`ARM / 0${(sy<0?0:2)+(sx<0?1:2)}`,ax+sx*-R*.2,ay+sy*R*.22);}
 // machined plate + dial
 const pg=c.createRadialGradient(cx-R*.4,cy-R*.5,R*.1,cx,cy,R*1.1);pg.addColorStop(0,'#3a3e47');pg.addColorStop(1,'#101114');c.fillStyle=pg;c.beginPath();c.arc(cx,cy,R*1.02,0,Math.PI*2);c.fill();
 metalRing(c,cx,cy,R,R*.07,false);metalRing(c,cx,cy,R*.72,R*.03,false);
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2+rot,l=i%5===0?R*.08:R*.04;c.strokeStyle=i%5===0?'rgba(255,255,255,.6)':'rgba(255,255,255,.25)';c.beginPath();c.moveTo(cx+Math.cos(a)*R*.86,cy+Math.sin(a)*R*.86);c.lineTo(cx+Math.cos(a)*(R*.86-l),cy+Math.sin(a)*(R*.86-l));c.stroke();}
 c.fillStyle=BLUE_HI;c.beginPath();c.moveTo(cx,cy-R*1.06);c.lineTo(cx-7,cy-R*1.06-12);c.lineTo(cx+7,cy-R*1.06-12);c.closePath();c.fill();
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/2+rot*2;bolt(c,cx+Math.cos(a)*R*.72,cy+Math.sin(a)*R*.72,R*.045,i===0);}
 // cube hub, top view (blue top face = the one filled shape of the mark)
 const s=R*.22;c.save();c.translate(cx,cy);c.rotate(rot*2+Math.PI/4);c.fillStyle='#0d0e11';c.fillRect(-s*1.08,-s*1.08,s*2.16,s*2.16);const cg=c.createLinearGradient(-s,-s,s,s);cg.addColorStop(0,'#4d9de6');cg.addColorStop(1,'#00427a');c.fillStyle=cg;c.fillRect(-s,-s,s*2,s*2);c.strokeStyle='rgba(255,255,255,.7)';c.strokeRect(-s,-s,s*2,s*2);c.restore();
 if(!calm){const sw=(t*.0006)%(Math.PI*2);c.strokeStyle='rgba(77, 157, 230,.85)';c.lineWidth=3;c.beginPath();c.arc(cx,cy,R*1.12,sw,sw+.6);c.stroke();c.lineWidth=1;}
}
function drawXray(cv:HTMLCanvasElement,t:number){
 const {ctx:c,w,h}=sizeCanvas(cv);if(!w)return;c.clearRect(0,0,w,h);const sec=cv.closest('section');let ex=.6;if(sec&&!calm){const r=sec.getBoundingClientRect();ex=clamp((innerHeight-r.top)/(innerHeight*1.2),0,1);}
 const cx=w*.5+(hasPointer&&!calm?(px/innerWidth-.5)*10:0),R=Math.min(w*.32,h*.42),gap=h*(.07+ex*.1),top=h*.5-gap*2-R*.05,tilt=.32,rot=calm?0:t*.0003;
 const layers=['L01 / Dial','L02 / Gimbal','L03 / Hub','L04 / Nodes','L05 / Base'];
 // wiring through the stack (behind the glass)
 for(let k=-1;k<=1;k+=2){c.strokeStyle=k<0?'rgba(0, 94, 184,.85)':'rgba(5,5,5,.55)';c.lineWidth=2;c.beginPath();c.moveTo(cx+k*R*.18,top);for(let i=1;i<5;i++)c.bezierCurveTo(cx+k*R*(.3+.2*Math.sin(i+rot)),top+gap*(i-.6),cx+k*R*.1,top+gap*(i-.3),cx+k*R*.18,top+gap*i);c.stroke();}c.lineWidth=1;
 layers.forEach((name,i)=>{const y=top+gap*i,rr=R*(i===2?.36:i===1?.82:i===4?.9:1);
  if(i===2){const s=R*.26;c.fillStyle='rgba(255,255,255,.55)';c.strokeStyle='rgba(5,5,5,.7)';c.beginPath();c.moveTo(cx,y-s*tilt*1.6);c.lineTo(cx+s,y-s*tilt*.6);c.lineTo(cx+s,y+s*.7);c.lineTo(cx,y+s*.7+s*tilt);c.lineTo(cx-s,y+s*.7);c.lineTo(cx-s,y-s*tilt*.6);c.closePath();c.fill();c.stroke();c.fillStyle='#005eb8';c.beginPath();c.moveTo(cx,y-s*tilt*1.6);c.lineTo(cx+s,y-s*tilt*.6);c.lineTo(cx,y+s*tilt*.4);c.lineTo(cx-s,y-s*tilt*.6);c.closePath();c.fill();}
  else{const g=c.createLinearGradient(cx-rr,y,cx+rr,y);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.5,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,.6)');c.fillStyle=g;c.strokeStyle='rgba(5,5,5,.55)';c.lineWidth=1.2;c.beginPath();c.ellipse(cx,y,rr,rr*tilt,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='rgba(5,5,5,.2)';c.beginPath();c.ellipse(cx,y+6,rr,rr*tilt,0,0,Math.PI);c.stroke();
   if(i===0){for(let k=0;k<48;k++){const a=k/48*Math.PI*2+rot;c.strokeStyle='rgba(5,5,5,.45)';c.beginPath();c.moveTo(cx+Math.cos(a)*rr,y+Math.sin(a)*rr*tilt);c.lineTo(cx+Math.cos(a)*rr*.93,y+Math.sin(a)*rr*.93*tilt);c.stroke();}c.fillStyle='#005eb8';c.beginPath();c.moveTo(cx,y-rr*tilt-2);c.lineTo(cx-6,y-rr*tilt-12);c.lineTo(cx+6,y-rr*tilt-12);c.closePath();c.fill();}
   if(i===1){c.strokeStyle='rgba(0, 94, 184,.9)';c.lineWidth=2;c.beginPath();c.ellipse(cx,y,rr*.35,rr*tilt*1.9,rot,0,Math.PI*2);c.stroke();c.lineWidth=1;}
   if(i===3){for(let k=0;k<8;k++){const a=k/8*Math.PI*2+rot*2,nx=cx+Math.cos(a)*rr,ny=y+Math.sin(a)*rr*tilt;c.fillStyle=Math.sin(a)>0?'#005eb8':'rgba(255,255,255,.9)';c.strokeStyle='rgba(5,5,5,.6)';c.beginPath();c.arc(nx,ny,4,0,Math.PI*2);c.fill();c.stroke();}}}
  // leader label
  const lx=cx+R*1.08,ly=y;c.strokeStyle='rgba(5,5,5,.45)';c.beginPath();c.moveTo(cx+rr*.98,y);c.lineTo(lx,ly);c.lineTo(lx+18,ly);c.stroke();c.fillStyle='#24272d';c.font='500 10px "IBM Plex Sans", system-ui, sans-serif';c.textAlign='left';c.textBaseline='middle';c.fillText(name.toUpperCase(),lx+22,ly);});
}
const diptychSec=document.querySelector('.diptych');if(diptychSec)vio.observe(diptychSec);

// Hash bench: SHA-256 avalanche, entirely local.
const bitsBox=$('#bits'),hashIn=$('#hash-in') as HTMLInputElement|null;
if(bitsBox&&hashIn){
 const cells:HTMLElement[]=[];for(let i=0;i<256;i++){const c=document.createElement('i');bitsBox.append(c);cells.push(c);}
 let prev:Uint8Array|null=null;
 const run=async()=>{const bytes=new TextEncoder().encode(hashIn.value);let buf:Uint8Array;try{buf=new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes));}catch{buf=sha256Bytes(bytes);}
  const out=$('#hash-out')!;out.replaceChildren();let changed=0;
  buf.forEach((v,i)=>{const b=element('b',v.toString(16).padStart(2,'0'));if(prev&&prev[i]!==v){b.className='flip';requestAnimationFrame(()=>requestAnimationFrame(()=>b.classList.remove('flip')));}out.append(b);});
  for(let i=0;i<256;i++){const bit=(buf[i>>3]>>(7-(i&7)))&1,was=prev?(prev[i>>3]>>(7-(i&7)))&1:bit;cells[i].className=bit?'one':'';if(bit!==was){changed++;const c=cells[i];c.classList.add('chg');requestAnimationFrame(()=>requestAnimationFrame(()=>c.classList.remove('chg')));}}
  $('#aval')!.textContent=prev?`${changed} / 256 (${(changed/2.56).toFixed(1)}%)`:'Edit the input';prev=buf;};
 hashIn.addEventListener('input',run);run();
}

// Home practice card: cycles through the real question set.
const qcard=$('#qcard');
if(qcard){
 let qs:Question[]|null=null,qi=0;
 const wire=(q:Question)=>{const ol=$('#q-choices')!;ol.querySelectorAll<HTMLButtonElement>('button').forEach((b,n)=>b.addEventListener('click',()=>{ol.querySelectorAll<HTMLButtonElement>('button').forEach((x,m)=>{x.disabled=true;if(m===q.answer)x.classList.add('right');else if(m===n)x.classList.add('wrong');});const why=$('#q-why')!;why.replaceChildren(element('b',n===q.answer?'Correct. ':`Not quite. The answer is ${q.choices[q.answer]}. `),document.createTextNode(q.rationale));}));};
 const draw=(q:Question)=>{$('#q-obj')!.textContent=q.objective;$('#q-num')!.textContent=`${qi+1} of ${qs?qs.length:qcard.dataset.total}`;$('#q-prompt')!.textContent=q.prompt;$('#q-why')!.textContent='Pick an answer. You will see why it is right or wrong.';const ol=$('#q-choices')!;ol.replaceChildren();q.choices.forEach((ch,n)=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.append(element('span','ABCDEF'[n],'label'),element('span',ch));li.append(b);ol.append(li);});wire(q);};
 data('academy').then(course=>{qs=course.questions;if(qs&&qs.length)wire(qs[0]);}).catch(e=>say(e.message));
 $('#q-next')?.addEventListener('click',()=>{if(!qs||!qs.length)return;qi=(qi+1)%qs.length;draw(qs[qi]);});
}

// Home tool grid: filter by difficulty.
const tiles=$('#tiles');
document.querySelectorAll<HTMLButtonElement>('.chip[data-lvl]').forEach(ch=>ch.addEventListener('click',()=>{document.querySelectorAll('.chip[data-lvl]').forEach(c=>c.setAttribute('aria-pressed',String(c===ch)));let n=0;tiles?.querySelectorAll<HTMLElement>('.tile').forEach(t=>{t.hidden=!(ch.dataset.lvl==='all'||t.dataset.lvl===ch.dataset.lvl);if(!t.hidden)n++;});const tc=$('#tool-count');if(tc)tc.textContent=`${n} tools`;}));
$('#tiles-more')?.addEventListener('click',e=>{tiles?.classList.toggle('short');(e.currentTarget as HTMLElement).textContent=tiles?.classList.contains('short')?'Show all tools':'Show fewer';});

// Frame loop: draw only what is on screen.
if(stage)vio.observe(stage);if(netSec)vio.observe(netSec);if(globeSec)vio.observe(globeSec);
let lastT=performance.now();
function frame(now:number){const dt=Math.min(64,now-lastT);lastT=now;
 if(coreCv&&globeSec&&visible.get(globeSec)!==false){drawAttackMap();}
 if(netSec&&visible.get(netSec))drawNet(dt);
 if(diptychSec&&visible.get(diptychSec))machines.forEach(m=>m.dataset.machine==='rig'?drawRig(m,now):drawXray(m,now));
 requestAnimationFrame(frame);}
if(coreCv||netCv||machines.length)requestAnimationFrame(frame);
onScroll();
if(calm)countUp();

// Statement: words light up as the paragraph scrolls through the viewport.
{const st=document.getElementById('stmt-text');if(st){const words=Array.from(st.querySelectorAll('span'));
 const paint=()=>{const r=st.getBoundingClientRect();const p=calm?1:clamp((innerHeight*.85-r.top)/(r.height+innerHeight*.35),0,1);const n=Math.round(p*words.length);words.forEach((w,i)=>w.classList.toggle('lit',i<n));};
 addEventListener('scroll',()=>requestAnimationFrame(paint),{passive:true});paint();}}
// Scanner: a lens reveals what an attacker sees in the config. Drag, hover or use the arrow keys.
{const stage=document.getElementById('scan-stage');if(stage){const xr=stage.querySelector<HTMLElement>('.scan-xray')!,ring=stage.querySelector<HTMLElement>('.scan-ring')!,count=document.getElementById('scan-count');
 const hits=Array.from(xr.querySelectorAll<HTMLElement>('.hit'));const found=new Set<number>();let lx=.3,ly=.35,touched=false,t0=performance.now();
 const place=(x:number,y:number)=>{lx=clamp(x,0,1);ly=clamp(y,0,1);const r=stage.getBoundingClientRect(),px2=lx*r.width,py2=ly*r.height,rad=Math.min(150,r.width*.28);
  stage.style.setProperty('--lx',`${px2}px`);stage.style.setProperty('--ly',`${py2}px`);stage.style.setProperty('--lr',`${rad}px`);
  hits.forEach((h,i)=>{const b=h.getBoundingClientRect(),cy=b.top+b.height/2-r.top;if(Math.abs(cy-py2)<rad*.8&&b.left-r.left<px2+rad){found.add(i);h.classList.add('seen');}});
  if(count)count.textContent=`${found.size} of ${hits.length} findings`;};
 const fromEvent=(e:PointerEvent)=>{const r=stage.getBoundingClientRect();touched=true;place((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height);};
 stage.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.buttons)fromEvent(e);});
 stage.addEventListener('pointerdown',e=>{fromEvent(e);try{stage.setPointerCapture(e.pointerId);}catch{}});
 stage.addEventListener('keydown',e=>{const d:Record<string,[number,number]>={ArrowLeft:[-.05,0],ArrowRight:[.05,0],ArrowUp:[0,-.06],ArrowDown:[0,.06]};const m=d[e.key];if(!m)return;e.preventDefault();touched=true;place(lx+m[0],ly+m[1]);});
 // Until someone touches it, the lens drifts slowly so the effect is visible.
 const idle=(now:number)=>{if(!touched&&!calm){const t=(now-t0)/1000;place(.35+.25*Math.sin(t*.5),.5+.38*Math.sin(t*.37));requestAnimationFrame(idle);}};
 place(lx,ly);if(!calm)requestAnimationFrame(idle);addEventListener('resize',()=>place(lx,ly));void ring;}}

// Infrastructure hero: red markers on the drawing open vulnerability cards; Next walks through them.
{const box=document.getElementById('infra');if(box){
 const marks=Array.from(box.querySelectorAll<HTMLButtonElement>('.infra-mark')),cards=Array.from(box.querySelectorAll<HTMLElement>('.infra-card'));
 const empty=document.getElementById('infra-empty'),found=document.getElementById('infra-found');let cur=-1;
 let seen:number[]=[];try{const v=JSON.parse(localStorage.getItem('cyberhub:infra')||'[]');if(Array.isArray(v))seen=v.filter(n=>Number.isInteger(n)&&n>=0&&n<marks.length);}catch{}
 marks.forEach(m=>{m.style.left=`${m.dataset.x}%`;m.style.top=`${m.dataset.y}%`;});
 const show=(i:number,focus=false)=>{cur=(i+marks.length)%marks.length;if(!seen.includes(cur)){seen.push(cur);try{localStorage.setItem('cyberhub:infra',JSON.stringify(seen));}catch{}}
  if(empty)empty.hidden=true;cards.forEach((c,k)=>{c.hidden=k!==cur;});document.querySelectorAll('.infra-svg .redline.call').forEach((c,k)=>c.classList.toggle('on',k===cur));marks.forEach((m,k)=>{m.classList.toggle('active',k===cur);m.classList.toggle('seen',seen.includes(k));m.setAttribute('aria-pressed',String(k===cur));});
  if(found)found.textContent=`${seen.length} of ${marks.length} found`;if(focus)marks[cur].focus({preventScroll:true});};
 marks.forEach((m,k)=>{m.setAttribute('aria-pressed','false');m.classList.toggle('seen',seen.includes(k));m.addEventListener('click',()=>show(k));});
 if(found)found.textContent=`${seen.length} of ${marks.length} found`;
 document.getElementById('infra-next')?.addEventListener('click',()=>show(cur+1));
 document.getElementById('infra-prev')?.addEventListener('click',()=>show(cur<0?marks.length-1:cur-1));
 box.addEventListener('keydown',e=>{if(cur<0)return;if(e.key==='ArrowRight'){e.preventDefault();show(cur+1,true);}if(e.key==='ArrowLeft'){e.preventDefault();show(cur-1,true);}});}}

// About page motion: word-by-word headlines, clip-wipe reveals, a spec sheet that types in row by row.
document.querySelectorAll<HTMLElement>('.wr').forEach(h => h.querySelectorAll<HTMLElement>('.w').forEach((w, i) => w.style.setProperty('--i', String(i))));
document.querySelectorAll<HTMLElement>('.ab-row').forEach((r, i) => r.style.setProperty('--i', String(i)));
document.querySelectorAll('.wr, .clip, .ab-spec').forEach(el => rio.observe(el));
