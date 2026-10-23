import {emptyProgress,parseProgress,scoreQuiz,matches,countAcademyLessons,compareRecords,type Question} from './core.js';
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
theme?.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme ? document.documentElement.dataset.theme==='dark' : !matchMedia('(prefers-color-scheme: light)').matches; const value=dark?'light':'dark';document.documentElement.dataset.theme=value;try{localStorage.setItem('cyberhub:theme',value);}catch{}document.dispatchEvent(new Event('cyberhub:theme'));});

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
 const query=new URLSearchParams(location.search);
 for(const field of Array.from(form.elements) as HTMLInputElement[]){if(field.name && query.has(field.name))field.value=query.get(field.name)||'';}
 function update(){
  const values=Object.fromEntries(new FormData(form!)) as Record<string,string>;let count=0;
  const text=values.q||'';delete values.q;
  const sort=values.sort||'name';delete values.sort;
  parsed.sort((a,b)=>compareRecords(a.record,b.record,sort));
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
const fine=matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const BLUE='#0068bc',BLUE_HI='#3b93ff';
let px=innerWidth/2,py=innerHeight/2,hasPointer=false,stageP=0;
addEventListener('pointermove',e=>{px=e.clientX;py=e.clientY;hasPointer=true;const c=$('#coords');if(c)c.textContent=`x ${(px/innerWidth).toFixed(3)} y ${(py/innerHeight).toFixed(3)}`;},{passive:true});
function sizeCanvas(cv:HTMLCanvasElement){const d=Math.min(2,devicePixelRatio||1);const w=cv.clientWidth,h=cv.clientHeight;if(cv.width!==Math.round(w*d)||cv.height!==Math.round(h*d)){cv.width=Math.round(w*d);cv.height=Math.round(h*d);}const ctx=cv.getContext('2d')!;ctx.setTransform(d,0,0,d,0,0);return {ctx,w,h};}
const visible=new Map<Element,boolean>();
const vio=new IntersectionObserver(es=>es.forEach(e=>visible.set(e.target,e.isIntersecting)));

// Loader: under a second, home only, once per visit.
const loader=$('#loader');
if(loader){let seen=false;try{seen=sessionStorage.getItem('cyberhub:seen')==='1';}catch{}
 if(calm||seen)loader.remove();else{loader.classList.add('run');const t0=performance.now();const step=(now:number)=>{const p=clamp((now-t0)/900,0,1),e=1-Math.pow(1-p,3);$('#load-count')!.textContent=String(Math.round(e*100)).padStart(2,'0');$('#load-line')!.style.setProperty('--p',String(e));if(p<1)requestAnimationFrame(step);else{loader.classList.add('done');setTimeout(()=>loader.remove(),800);try{sessionStorage.setItem('cyberhub:seen','1');}catch{}}};requestAnimationFrame(step);loader.addEventListener('click',()=>loader.classList.add('done'));}}

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
 document.addEventListener('pointerover',e=>{const t=(e.target as HTMLElement).closest<HTMLElement>('[data-cursor], .mod > a, .tile a');if(t){lab.textContent=t.dataset.cursor||'View';cursor.classList.add('act');}else cursor.classList.remove('act');cursor.classList.toggle('on-blue',!!(e.target as HTMLElement).closest('.tone-blue'));});
 document.querySelectorAll<HTMLElement>('.button').forEach(b=>{b.addEventListener('pointermove',e=>{const r=b.getBoundingClientRect();b.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.14}px,${(e.clientY-r.top-r.height/2)*.24}px)`;});b.addEventListener('pointerleave',()=>{b.style.transform='';});});
}

// Reveals: in-view elements reveal at once; nothing waits on scrolling to become readable without JS.
const rio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rio.unobserve(e.target);}}),{rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('.rv, .fade, .acad').forEach(el=>rio.observe(el));

// Flashcard flip feedback
$('#flip')?.addEventListener('click',()=>{const c=$('#card-text');if(!c||calm)return;c.classList.remove('flip');void c.offsetWidth;c.classList.add('flip');});

// Hero: type sized to its share of the measure; wireframe where it crosses the Core.
const heroH1=$('#hero-title'),seal=$('#seal'),sealTilt=$('#seal-tilt');
const maskSeal=()=>{if(!heroH1||!seal)return;const h=heroH1.getBoundingClientRect(),r=seal.getBoundingClientRect(),k=1+stageP*.5;heroH1.style.setProperty('--sx',`${r.left+r.width/2-h.left}px`);heroH1.style.setProperty('--sy',`${r.top+r.height/2-h.top}px`);heroH1.style.setProperty('--sr',`${r.width/2*k*.97}px`);};
if(heroH1){
 const solid=heroH1.querySelector('.type-solid')!;const wire=solid.cloneNode(true) as HTMLElement;wire.className='type-wire';heroH1.append(wire);heroH1.classList.add('masked');
 const fit=()=>{const w=heroH1.clientWidth;const s=heroH1.querySelectorAll<HTMLElement>('.type-solid .ln'),wl=heroH1.querySelectorAll<HTMLElement>('.type-wire .ln');s.forEach((ln,i)=>{ln.style.fontSize='100px';const m=(ln.firstElementChild as HTMLElement).getBoundingClientRect().width;const frac=innerWidth<640?1:parseFloat(ln.dataset.w||'1');const fs=Math.min(100*w*frac/m,innerHeight*(innerWidth<640?.16:.27));ln.style.fontSize=`${fs}px`;wl[i].style.fontSize=`${fs}px`;});maskSeal();};
 fit();document.fonts?.ready.then(fit);addEventListener('resize',fit);
}

// The Core: a 3D precision mechanism (the logo's still Core, set in motion).
const coreCv=$('#core-canvas') as HTMLCanvasElement|null;
const RINGS=[[0,0,1,0],[Math.PI/2,0,1,0],[Math.PI/2,Math.PI/3,1,1],[Math.PI/2,-Math.PI/3,1,0],[.42,.3,.78,1],[Math.PI/2,Math.PI/4,.5,0],[.9,-.6,.5,1]];
const DISC=['NETWORK','DETECTION','ENDPOINT','VULN MGMT','APPSEC','CLOUD','CRYPTO','GRC'];
type V3=[number,number,number];
const rotX=(p:V3,a:number):V3=>{const c=Math.cos(a),s=Math.sin(a);return [p[0],p[1]*c-p[2]*s,p[1]*s+p[2]*c];};
const rotY=(p:V3,a:number):V3=>{const c=Math.cos(a),s=Math.sin(a);return [p[0]*c+p[2]*s,p[1],-p[0]*s+p[2]*c];};
let yaw=.6,pitch=.38,yawV=0,frameN=0;
let INK='255,255,255',INKHEX='#fff',GROUND='#050505';
function inkFor(el:Element){const light=!!el.closest('.tone-paper');INK=light?'5,5,5':'255,255,255';INKHEX=light?'#050505':'#fff';GROUND=light?'#edeff2':'#050505';}
function drawCore(dt:number){
 if(!coreCv)return;const {ctx,w}=sizeCanvas(coreCv);if(!w)return;inkFor(coreCv);ctx.clearRect(0,0,w,w);
 const c=w/2,R=w/2/1.28*.84;
 const ty=(hasPointer&&!calm?(px/innerWidth-.5)*1.1:0)+stageP*2.4,tp=.38+(hasPointer&&!calm?(py/innerHeight-.5)*.7:0);
 if(!calm)yawV+=dt*.00011;yaw=lerp(yaw,ty+yawV,.06);pitch=lerp(pitch,tp,.06);
 const P=(v:V3)=>{let q=rotY(v,yaw);q=rotX(q,pitch);const s=3.4/(3.4+q[2]);return [c+q[0]*R*s,c+q[1]*R*s,q[2],s];};
 ctx.font=`400 ${Math.max(9,R*.028)}px "Martian Mono", monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineWidth=1;
 const dialR=R*1.14,deg=((yaw*180/Math.PI)%360+360)%360;
 ctx.strokeStyle=`rgba(${INK},.22)`;ctx.beginPath();ctx.arc(c,c,dialR,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<120;i++){const a=i/120*Math.PI*2-yaw,long=i%10===0,l=long?R*.05:R*.022;ctx.strokeStyle=long?`rgba(${INK},.55)`:`rgba(${INK},.2)`;ctx.beginPath();ctx.moveTo(c+Math.cos(a)*dialR,c+Math.sin(a)*dialR);ctx.lineTo(c+Math.cos(a)*(dialR+l),c+Math.sin(a)*(dialR+l));ctx.stroke();if(long){ctx.fillStyle=`rgba(${INK},.45)`;ctx.fillText(String(i*3).padStart(3,'0'),c+Math.cos(a)*(dialR+R*.1),c+Math.sin(a)*(dialR+R*.1));}}
 ctx.fillStyle=BLUE_HI;ctx.beginPath();ctx.moveTo(c,c-dialR+2);ctx.lineTo(c-6,c-dialR-10);ctx.lineTo(c+6,c-dialR-10);ctx.closePath();ctx.fill();
 if(!calm){const sw=(performance.now()*.0006)%(Math.PI*2);ctx.strokeStyle='rgba(59,147,255,.75)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c,c,dialR-6,sw,sw+.5);ctx.stroke();ctx.lineWidth=1;}
 ctx.setLineDash([3,6]);for(const a of [[1.3,0,0,'X'],[0,1.3,0,'Y'],[0,0,1.3,'Z']] as [number,number,number,string][]){const p0=P([-a[0],-a[1],-a[2]]),p1=P([a[0],a[1],a[2]]);ctx.strokeStyle=`rgba(${INK},.18)`;ctx.beginPath();ctx.moveTo(p0[0],p0[1]);ctx.lineTo(p1[0],p1[1]);ctx.stroke();ctx.fillStyle=`rgba(${INK},.5)`;ctx.fillText(a[3],p1[0]+10,p1[1]-10);}ctx.setLineDash([]);
 for(const rg of RINGS){let prev:number[]|null=null;for(let i=0;i<=96;i++){const t=i/96*Math.PI*2;let v:V3=[Math.cos(t)*rg[2],0,Math.sin(t)*rg[2]];v=rotX(v,rg[0]);v=rotY(v,rg[1]);const q=P(v);if(prev){const z=(prev[2]+q[2])/2,k=.12+.7*(1-(z+1)/2);ctx.strokeStyle=rg[3]?`rgba(59,147,255,${k})`:`rgba(${INK},${k*.8})`;ctx.lineWidth=rg[3]?1.4:1;ctx.beginPath();ctx.moveTo(prev[0],prev[1]);ctx.lineTo(q[0],q[1]);ctx.stroke();}prev=q;}}
 ctx.lineWidth=1;const h=.16,V:number[][]=[];for(let i=0;i<8;i++)V.push(P([i&1?h:-h,i&2?h:-h,i&4?h:-h]));
 ctx.fillStyle='rgba(0,104,188,.85)';ctx.beginPath();ctx.moveTo(V[2][0],V[2][1]);ctx.lineTo(V[3][0],V[3][1]);ctx.lineTo(V[7][0],V[7][1]);ctx.lineTo(V[6][0],V[6][1]);ctx.closePath();ctx.fill();
 ctx.strokeStyle=`rgba(${INK},.85)`;for(const [a,b] of [[0,1],[2,3],[4,5],[6,7],[0,2],[1,3],[4,6],[5,7],[0,4],[1,5],[2,6],[3,7]]){ctx.beginPath();ctx.moveTo(V[a][0],V[a][1]);ctx.lineTo(V[b][0],V[b][1]);ctx.stroke();}
 ctx.textAlign='left';for(let i=0;i<8;i++){const t=i/8*Math.PI*2,q=P([Math.cos(t),0,Math.sin(t)]),k=.25+.75*(1-(q[2]+1)/2);ctx.strokeStyle=`rgba(59,147,255,${k*.5})`;ctx.beginPath();ctx.moveTo(c,c);ctx.lineTo(q[0],q[1]);ctx.stroke();ctx.fillStyle=q[2]<0?BLUE_HI:GROUND;ctx.strokeStyle=`rgba(59,147,255,${k})`;ctx.beginPath();ctx.arc(q[0],q[1],4*q[3]+1,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=`rgba(${INK},${k*.85})`;ctx.fillText(`N${String(i+1).padStart(2,'0')} ${DISC[i]}`,q[0]+12,q[1]-12);}
 ctx.textAlign='center';
 if(++frameN%6===0){const y=$('#core-yaw'),p=$('#core-pitch');if(y)y.textContent=deg.toFixed(1).padStart(5,'0')+'°';if(p)p.textContent=(pitch*180/Math.PI).toFixed(1)+'°';}
}
if(coreCv)sealTilt?.classList.add('live');

// Scroll choreography: header tone, progress, aperture, marquee, map.
const head=$('#site-header'),prog=$('#progress'),stage=$('#top'),aperture=$('#aperture'),apRing=$('#ap-ring');
const scenes=Array.from(document.querySelectorAll<HTMLElement>('[data-tone]'));
const m1=$('#m1'),m2=$('#m2'),interlude=$('.interlude');
let ticking=false,counted=false;
function countUp(){document.querySelectorAll<HTMLElement>('.spec strong[data-count]').forEach(el=>{const end=Number(el.dataset.count),t0=performance.now();const st=(now:number)=>{const p=clamp((now-t0)/1200,0,1);el.textContent=String(Math.round(end*(1-Math.pow(1-p,4)))).padStart(2,'0');if(p<1)requestAnimationFrame(st);};requestAnimationFrame(st);});}
function onScroll(){
 ticking=false;const sy=scrollY;
 prog?.style.setProperty('--p',(sy/Math.max(1,document.documentElement.scrollHeight-innerHeight)).toFixed(4));
 head?.classList.toggle('scrolled',sy>40);
 if(stage&&seal&&aperture&&apRing&&!calm){
  const r=stage.getBoundingClientRect();stageP=clamp(-r.top/(r.height-innerHeight),0,1);
  const sr=seal.getBoundingClientRect(),ox=sr.left+sr.width/2,oy=sr.top+sr.height/2;
  const open=clamp((stageP-.06)/.62,0,1),e=open*open*(3-2*open);const far=Math.hypot(Math.max(ox,innerWidth-ox),Math.max(oy,innerHeight-oy));const rad=e===0?0:lerp(sr.width*.2,far,e);
  for(const el of [aperture,apRing]){el.style.setProperty('--ar',`${rad}px`);el.style.setProperty('--ax',`${ox}px`);el.style.setProperty('--ay',`${oy}px`);}
  apRing.style.setProperty('--ao',e>0&&e<1?'1':'0');sealTilt?.style.setProperty('--ss',(1+stageP*.5).toFixed(3));heroH1?.style.setProperty('--hy',`${(-stageP*120).toFixed(1)}px`);maskSeal();
  (aperture as any).inert=open<.9;if(open>.9&&!counted){counted=true;countUp();}
 }
 if(head&&scenes.length){for(const s of scenes){const r=s.getBoundingClientRect();if(r.top<=36&&r.bottom>36){const tone=(s===stage&&!calm&&stageP>.45)?(aperture?.classList.contains('tone-void')?'void':'paper'):s.dataset.tone||'void';head.classList.remove('tone-void','tone-paper','tone-blue');head.classList.add('tone-'+tone);break;}}}
 if(!calm&&interlude&&m1&&m2){const r=interlude.getBoundingClientRect(),p=clamp((innerHeight-r.top)/(innerHeight+r.height),0,1);m1.style.transform=`translate3d(${(-p*38).toFixed(2)}%,0,0)`;m2.style.transform=`translate3d(${(p*30-20).toFixed(2)}%,0,0)`;}
 netScroll();
}
addEventListener('scroll',()=>{if(!ticking){ticking=true;requestAnimationFrame(onScroll);}},{passive:true});
addEventListener('resize',onScroll);
document.addEventListener('cyberhub:tones',()=>requestAnimationFrame(onScroll));requestAnimationFrame(onScroll);

// Learning map: server-rendered discipline buttons drive a canvas map.
const netSec=$('#map'),netCv=$('#net-canvas') as HTMLCanvasElement|null;
const nodeBtns=Array.from(document.querySelectorAll<HTMLButtonElement>('[data-node]'));
let active=0,hoverNode=-1,online=calm?nodeBtns.length:0;
function selectNode(i:number){active=i;nodeBtns.forEach((b,j)=>b.setAttribute('aria-pressed',String(j===i)));const b=nodeBtns[i];if(!b)return;$('#nc-idx')!.textContent=`Node / ${String(i+1).padStart(3,'0')}`;$('#nc-name')!.textContent=b.dataset.name||'';$('#nc-text')!.textContent=b.dataset.text||'';$('#nc-links')!.textContent=`Tools / ${b.dataset.tools}${b.dataset.lab?' — '+b.dataset.lab:''}`;}
nodeBtns.forEach((b,i)=>{b.addEventListener('click',()=>selectNode(i));b.addEventListener('pointerenter',()=>{hoverNode=i;});b.addEventListener('pointerleave',()=>{hoverNode=-1;});});
function netScroll(){if(!netSec||calm||!nodeBtns.length)return;const r=netSec.getBoundingClientRect();const p=innerWidth<=860?clamp((innerHeight*.9-r.top)/(innerHeight*.9),0,1):clamp((-r.top+innerHeight*.2)/(r.height-innerHeight),0,1);const n=Math.min(nodeBtns.length,Math.floor(p*(nodeBtns.length+1.2)));if(n!==online){online=n;const nc=$('#net-count');if(nc)nc.textContent=String(n).padStart(2,'0');nodeBtns.forEach((b,j)=>b.classList.toggle('live',j<n));}}
if(calm)nodeBtns.forEach(b=>b.classList.add('live'));
const glow=nodeBtns.map(()=>0);let netT=0;const pts=nodeBtns.map((_,i)=>({a:-Math.PI/2+i/nodeBtns.length*Math.PI*2,x:0,y:0}));
netCv?.addEventListener('click',e=>{const r=netCv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;pts.forEach((p,i)=>{if(Math.hypot(p.x-x,p.y-y)<40&&i<online)selectNode(i);});});
function drawNet(dt:number){
 if(!netCv)return;const {ctx,w:nw,h:nh}=sizeCanvas(netCv);if(!nw)return;inkFor(netCv);netT+=dt;ctx.clearRect(0,0,nw,nh);
 const small=nw<520,cx=small?nw*.5:nw*.44,cy=small?nh*.5:nh*.44,R=Math.min(nw,nh)*(small?.26:.34);const r=netCv.getBoundingClientRect(),mx=px-r.left,my=py-r.top;
 ctx.strokeStyle=`rgba(${INK},.08)`;ctx.lineWidth=1;for(const rr of [R*.32,R,R*1.22]){ctx.beginPath();ctx.arc(cx,cy,rr,0,Math.PI*2);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(cx-R*1.32,cy);ctx.lineTo(cx+R*1.32,cy);ctx.moveTo(cx,cy-R*1.32);ctx.lineTo(cx,cy+R*1.32);ctx.stroke();
 for(let i=0;i<72;i++){const a=i/72*Math.PI*2,l=i%9===0?10:4;ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*R*1.22,cy+Math.sin(a)*R*1.22);ctx.lineTo(cx+Math.cos(a)*(R*1.22+l),cy+Math.sin(a)*(R*1.22+l));ctx.stroke();}
 pts.forEach((p,i)=>{let x=cx+Math.cos(p.a+netT*.00004)*R,y=cy+Math.sin(p.a+netT*.00004)*R;const d=Math.hypot(mx-x,my-y),pull=hasPointer&&!calm?clamp(1-d/220,0,1)*18:0;if(d>0){x+=(mx-x)/d*pull;y+=(my-y)/d*pull;}p.x=x;p.y=y;glow[i]=lerp(glow[i],(i===active||i===hoverNode)?1:0,.12);});
 pts.forEach((p,i)=>{if(i>=online)return;ctx.strokeStyle=`rgba(0,104,188,${.25+glow[i]*.6})`;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(p.x,p.y);ctx.stroke();});
 nodeBtns.forEach((b,i)=>{(b.dataset.rel||'').split(',').map(Number).forEach(j=>{if(i>=online||j>=online)return;const a=pts[i],q=pts[j];if(!q)return;const hot=Math.max(glow[i],glow[j]);const mxp=lerp(a.x,q.x,.5),myp=lerp(a.y,q.y,.5),qx=mxp+(cx-mxp)*.35,qy=myp+(cy-myp)*.35;ctx.strokeStyle=hot>.05?`rgba(59,147,255,${.2+hot*.7})`:`rgba(${INK},.14)`;ctx.lineWidth=hot>.5?1.5:1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(qx,qy,q.x,q.y);ctx.stroke();ctx.lineWidth=1;if(!calm&&hot>.5){const t=((netT*.00035)+i*.13)%1,x=(1-t)*(1-t)*a.x+2*(1-t)*t*qx+t*t*q.x,y=(1-t)*(1-t)*a.y+2*(1-t)*t*qy+t*t*q.y;ctx.fillStyle=BLUE_HI;ctx.beginPath();ctx.arc(x,y,2.5,0,Math.PI*2);ctx.fill();}});});
 ctx.fillStyle=GROUND;ctx.strokeStyle=BLUE;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(cx,cy,R*.22,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.lineWidth=1;
 ctx.fillStyle=INKHEX;ctx.font=`800 ${Math.max(13,R*.1)}px Archivo, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('HUB',cx,cy);
 pts.forEach((p,i)=>{const on=i<online,g=glow[i];ctx.beginPath();ctx.arc(p.x,p.y,6+g*4,0,Math.PI*2);ctx.fillStyle=on?(g>.3?BLUE_HI:INKHEX):GROUND;ctx.strokeStyle=on?BLUE_HI:`rgba(${INK},.3)`;ctx.fill();ctx.stroke();if(g>.05){ctx.strokeStyle=`rgba(59,147,255,${g*.6})`;ctx.beginPath();ctx.arc(p.x,p.y,14+g*8,0,Math.PI*2);ctx.stroke();}
  const cos=Math.cos(p.a),vert=Math.abs(cos)<.2;ctx.textAlign=vert?'center':(cos>0?'left':'right');const lx=p.x+(vert?0:Math.sign(cos)*18),ly=p.y+(vert?(Math.sin(p.a)<0?-24:26):0);const name=nodeBtns[i].dataset.name||'';
  ctx.fillStyle=on?`rgba(${INK},${.75+g*.25})`:`rgba(${INK},.3)`;ctx.font=`${g>.3?700:500} ${small?11:14}px Archivo, sans-serif`;ctx.fillText(small?name.split(' ')[0]:name,lx,ly-(small?0:7));
  if(!small){ctx.fillStyle=on?BLUE_HI:`rgba(${INK},.25)`;ctx.font='400 9px "Martian Mono", monospace';ctx.fillText(`NODE / ${String(i+1).padStart(3,'0')}`,lx,ly+9);}});
}

// Module art (hover plates) and the diptych machine renders.
function art(cv:HTMLCanvasElement){
 const {ctx:c,w,h}=sizeCanvas(cv);if(!w)return;c.fillStyle='#050505';c.fillRect(0,0,w,h);c.strokeStyle='rgba(255,255,255,.07)';for(let x=0;x<w;x+=20){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}for(let y=0;y<h;y+=20){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
 let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;const k=cv.dataset.art;c.font='500 10px "Martian Mono", monospace';c.textBaseline='middle';
 if(k==='trace'){const xs=[w*.22,w*.78];c.strokeStyle='rgba(255,255,255,.35)';c.setLineDash([3,5]);xs.forEach(x=>{c.beginPath();c.moveTo(x,h*.18);c.lineTo(x,h*.92);c.stroke();});c.setLineDash([]);for(let i=0;i<4;i++){const y=h*(.32+i*.16),l=i%2===0;c.strokeStyle=BLUE_HI;c.lineWidth=2;c.beginPath();c.moveTo(l?xs[0]:xs[1],y);c.lineTo(l?xs[1]:xs[0],y);c.stroke();const hx=l?xs[1]:xs[0],dr=l?-1:1;c.beginPath();c.moveTo(hx+dr*8,y-5);c.lineTo(hx,y);c.lineTo(hx+dr*8,y+5);c.stroke();}c.lineWidth=1;c.fillStyle='#fff';c.textAlign='center';c.fillText('192.0.2.10',xs[0],h*.1);c.fillText('192.0.2.53',xs[1],h*.1);}
 else if(k==='topology'){const P:number[][]=[];for(let i=0;i<26;i++)P.push([w*(.1+rnd()*.8),h*(.12+rnd()*.76)]);P.forEach((p,i)=>P.forEach((q,j)=>{if(j>i&&Math.hypot(p[0]-q[0],p[1]-q[1])<w*.2){c.strokeStyle=i%5===0?'rgba(59,147,255,.8)':'rgba(255,255,255,.22)';c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(q[0],q[1]);c.stroke();}}));P.forEach((p,i)=>{c.fillStyle=i%5===0?BLUE_HI:'#fff';c.beginPath();c.arc(p[0],p[1],i%5===0?4:2.2,0,7);c.fill();});}
 else if(k==='bars'){[12,22,18,28,20].forEach((v,i)=>{const y=h*(.18+i*.15);c.fillStyle='rgba(255,255,255,.12)';c.fillRect(w*.16,y,w*.72,10);c.fillStyle=v===28?BLUE_HI:'#fff';c.fillRect(w*.16,y,w*.72*v/28,10);c.fillStyle='rgba(255,255,255,.6)';c.textAlign='left';c.fillText('D'+(i+1),w*.06,y+5);});}
 else if(k==='tools'){for(let y=0;y<4;y++)for(let x=0;x<6;x++){const on=rnd()>.75,X=w*.08+x*w*.14,Y=h*.14+y*h*.18;c.strokeStyle=on?BLUE_HI:'rgba(255,255,255,.25)';c.strokeRect(X,Y,w*.12,h*.15);if(on){c.fillStyle='rgba(59,147,255,.25)';c.fillRect(X,Y,w*.12,h*.15);}}}
 else{let x=w*.1,y=h*.8;const P:number[][]=[[x,y]];for(let i=0;i<6;i++){x+=w*.13;y-=h*(.06+rnd()*.06);P.push([x,y]);}c.strokeStyle='rgba(255,255,255,.45)';c.beginPath();P.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();P.forEach((p,i)=>{c.fillStyle=i===6?BLUE_HI:'#fff';c.beginPath();c.arc(p[0],p[1],i===6?5:3,0,7);c.fill();});}
}
const arts=Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-art]'));
const paintArts=()=>arts.forEach(art);paintArts();document.fonts?.ready.then(paintArts);addEventListener('resize',paintArts);
document.querySelectorAll<HTMLElement>('.mod').forEach(li=>li.addEventListener('pointermove',e=>{const r=li.getBoundingClientRect();li.querySelector<HTMLElement>('.mod-media')?.style.setProperty('--my',`${(e.clientY-r.top-r.height/2)*.35}px`);}));

const machines=Array.from(document.querySelectorAll<HTMLCanvasElement>('canvas[data-machine]'));
machines.forEach(m=>vio.observe(m));
function metalRing(c:CanvasRenderingContext2D,x:number,y:number,r:number,wd:number,light:boolean){const g=c.createLinearGradient(x-r,y-r,x+r,y+r);if(light){g.addColorStop(0,'#ffffff');g.addColorStop(.5,'#a7adb7');g.addColorStop(1,'#5d636d');}else{g.addColorStop(0,'#6b717c');g.addColorStop(.45,'#2a2d33');g.addColorStop(1,'#0d0e11');}c.strokeStyle=g;c.lineWidth=wd;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();c.lineWidth=1;}
function bolt(c:CanvasRenderingContext2D,x:number,y:number,r:number,blue=false){const g=c.createRadialGradient(x-r*.3,y-r*.3,r*.1,x,y,r);g.addColorStop(0,blue?'#8fc0ff':'#e9ecf1');g.addColorStop(1,blue?'#0068bc':'#3a3e46');c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();}
function drawRig(cv:HTMLCanvasElement,t:number){
 const {ctx:c,w,h}=sizeCanvas(cv);if(!w)return;c.clearRect(0,0,w,h);const cx=w/2+(hasPointer&&!calm?(px/innerWidth-.5)*8:0),cy=h/2,R=Math.min(w,h)*.3,rot=calm?0:t*.00012;
 // gantry rails and four arm brackets
 c.fillStyle='#1d2026';c.fillRect(cx-R*.18,0,R*.36,h);c.fillStyle='rgba(255,255,255,.06)';c.fillRect(cx-R*.18,0,2,h);
 for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){const ax=cx+sx*R*1.55,ay=cy+sy*R*1.05;c.strokeStyle='#0a0b0d';c.lineWidth=R*.16;c.lineCap='square';c.beginPath();c.moveTo(ax,ay);c.lineTo(ax,cy+sy*R*.35);c.lineTo(cx+sx*R*.98,cy+sy*R*.35);c.stroke();c.strokeStyle='#2c3038';c.lineWidth=R*.1;c.stroke();c.lineWidth=1;bolt(c,ax,ay,R*.11);bolt(c,ax,ay,R*.05,true);c.fillStyle='rgba(255,255,255,.35)';c.font='500 9px "Martian Mono", monospace';c.textAlign=sx<0?'left':'right';c.fillText(`ARM / 0${(sy<0?0:2)+(sx<0?1:2)}`,ax+sx*-R*.2,ay+sy*R*.22);}
 // machined plate + dial
 const pg=c.createRadialGradient(cx-R*.4,cy-R*.5,R*.1,cx,cy,R*1.1);pg.addColorStop(0,'#3a3e47');pg.addColorStop(1,'#101114');c.fillStyle=pg;c.beginPath();c.arc(cx,cy,R*1.02,0,Math.PI*2);c.fill();
 metalRing(c,cx,cy,R,R*.07,false);metalRing(c,cx,cy,R*.72,R*.03,false);
 for(let i=0;i<60;i++){const a=i/60*Math.PI*2+rot,l=i%5===0?R*.08:R*.04;c.strokeStyle=i%5===0?'rgba(255,255,255,.6)':'rgba(255,255,255,.25)';c.beginPath();c.moveTo(cx+Math.cos(a)*R*.86,cy+Math.sin(a)*R*.86);c.lineTo(cx+Math.cos(a)*(R*.86-l),cy+Math.sin(a)*(R*.86-l));c.stroke();}
 c.fillStyle=BLUE_HI;c.beginPath();c.moveTo(cx,cy-R*1.06);c.lineTo(cx-7,cy-R*1.06-12);c.lineTo(cx+7,cy-R*1.06-12);c.closePath();c.fill();
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2-Math.PI/2+rot*2;bolt(c,cx+Math.cos(a)*R*.72,cy+Math.sin(a)*R*.72,R*.045,i===0);}
 // cube hub, top view (blue top face = the one filled shape of the mark)
 const s=R*.22;c.save();c.translate(cx,cy);c.rotate(rot*2+Math.PI/4);c.fillStyle='#0d0e11';c.fillRect(-s*1.08,-s*1.08,s*2.16,s*2.16);const cg=c.createLinearGradient(-s,-s,s,s);cg.addColorStop(0,'#3b93ff');cg.addColorStop(1,'#00427a');c.fillStyle=cg;c.fillRect(-s,-s,s*2,s*2);c.strokeStyle='rgba(255,255,255,.7)';c.strokeRect(-s,-s,s*2,s*2);c.restore();
 if(!calm){const sw=(t*.0006)%(Math.PI*2);c.strokeStyle='rgba(59,147,255,.85)';c.lineWidth=3;c.beginPath();c.arc(cx,cy,R*1.12,sw,sw+.6);c.stroke();c.lineWidth=1;}
}
function drawXray(cv:HTMLCanvasElement,t:number){
 const {ctx:c,w,h}=sizeCanvas(cv);if(!w)return;c.clearRect(0,0,w,h);const sec=cv.closest('section');let ex=.6;if(sec&&!calm){const r=sec.getBoundingClientRect();ex=clamp((innerHeight-r.top)/(innerHeight*1.2),0,1);}
 const cx=w*.5+(hasPointer&&!calm?(px/innerWidth-.5)*10:0),R=Math.min(w*.32,h*.42),gap=h*(.07+ex*.1),top=h*.5-gap*2-R*.05,tilt=.32,rot=calm?0:t*.0003;
 const layers=['L01 / Dial','L02 / Gimbal','L03 / Hub','L04 / Nodes','L05 / Base'];
 // wiring through the stack (behind the glass)
 for(let k=-1;k<=1;k+=2){c.strokeStyle=k<0?'rgba(0,104,188,.85)':'rgba(5,5,5,.55)';c.lineWidth=2;c.beginPath();c.moveTo(cx+k*R*.18,top);for(let i=1;i<5;i++)c.bezierCurveTo(cx+k*R*(.3+.2*Math.sin(i+rot)),top+gap*(i-.6),cx+k*R*.1,top+gap*(i-.3),cx+k*R*.18,top+gap*i);c.stroke();}c.lineWidth=1;
 layers.forEach((name,i)=>{const y=top+gap*i,rr=R*(i===2?.36:i===1?.82:i===4?.9:1);
  if(i===2){const s=R*.26;c.fillStyle='rgba(255,255,255,.55)';c.strokeStyle='rgba(5,5,5,.7)';c.beginPath();c.moveTo(cx,y-s*tilt*1.6);c.lineTo(cx+s,y-s*tilt*.6);c.lineTo(cx+s,y+s*.7);c.lineTo(cx,y+s*.7+s*tilt);c.lineTo(cx-s,y+s*.7);c.lineTo(cx-s,y-s*tilt*.6);c.closePath();c.fill();c.stroke();c.fillStyle='#0068bc';c.beginPath();c.moveTo(cx,y-s*tilt*1.6);c.lineTo(cx+s,y-s*tilt*.6);c.lineTo(cx,y+s*tilt*.4);c.lineTo(cx-s,y-s*tilt*.6);c.closePath();c.fill();}
  else{const g=c.createLinearGradient(cx-rr,y,cx+rr,y);g.addColorStop(0,'rgba(255,255,255,.75)');g.addColorStop(.5,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(255,255,255,.6)');c.fillStyle=g;c.strokeStyle='rgba(5,5,5,.55)';c.lineWidth=1.2;c.beginPath();c.ellipse(cx,y,rr,rr*tilt,0,0,Math.PI*2);c.fill();c.stroke();c.strokeStyle='rgba(5,5,5,.2)';c.beginPath();c.ellipse(cx,y+6,rr,rr*tilt,0,0,Math.PI);c.stroke();
   if(i===0){for(let k=0;k<48;k++){const a=k/48*Math.PI*2+rot;c.strokeStyle='rgba(5,5,5,.45)';c.beginPath();c.moveTo(cx+Math.cos(a)*rr,y+Math.sin(a)*rr*tilt);c.lineTo(cx+Math.cos(a)*rr*.93,y+Math.sin(a)*rr*.93*tilt);c.stroke();}c.fillStyle='#0068bc';c.beginPath();c.moveTo(cx,y-rr*tilt-2);c.lineTo(cx-6,y-rr*tilt-12);c.lineTo(cx+6,y-rr*tilt-12);c.closePath();c.fill();}
   if(i===1){c.strokeStyle='rgba(0,104,188,.9)';c.lineWidth=2;c.beginPath();c.ellipse(cx,y,rr*.35,rr*tilt*1.9,rot,0,Math.PI*2);c.stroke();c.lineWidth=1;}
   if(i===3){for(let k=0;k<8;k++){const a=k/8*Math.PI*2+rot*2,nx=cx+Math.cos(a)*rr,ny=y+Math.sin(a)*rr*tilt;c.fillStyle=Math.sin(a)>0?'#0068bc':'rgba(255,255,255,.9)';c.strokeStyle='rgba(5,5,5,.6)';c.beginPath();c.arc(nx,ny,4,0,Math.PI*2);c.fill();c.stroke();}}}
  // leader label
  const lx=cx+R*1.08,ly=y;c.strokeStyle='rgba(5,5,5,.45)';c.beginPath();c.moveTo(cx+rr*.98,y);c.lineTo(lx,ly);c.lineTo(lx+18,ly);c.stroke();c.fillStyle='#24272d';c.font='500 10px "Martian Mono", monospace';c.textAlign='left';c.textBaseline='middle';c.fillText(name.toUpperCase(),lx+22,ly);});
}
const diptychSec=document.querySelector('.diptych');if(diptychSec)vio.observe(diptychSec);

// Hash bench: SHA-256 avalanche, entirely local.
const bitsBox=$('#bits'),hashIn=$('#hash-in') as HTMLInputElement|null;
if(bitsBox&&hashIn){
 const cells:HTMLElement[]=[];for(let i=0;i<256;i++){const c=document.createElement('i');bitsBox.append(c);cells.push(c);}
 let prev:Uint8Array|null=null;
 const run=async()=>{let buf:Uint8Array;try{buf=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(hashIn.value)));}catch{$('#hash-out')!.textContent='Hashing is unavailable in this browser.';return;}
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
if(stage)vio.observe(stage);if(netSec)vio.observe(netSec);
let lastT=performance.now();
function frame(now:number){const dt=Math.min(64,now-lastT);lastT=now;
 if(coreCv&&stage&&visible.get(stage)!==false){maskSeal();drawCore(calm?0:dt);}
 if(netSec&&visible.get(netSec))drawNet(dt);
 if(diptychSec&&visible.get(diptychSec))machines.forEach(m=>m.dataset.machine==='rig'?drawRig(m,now):drawXray(m,now));
 requestAnimationFrame(frame);}
if(coreCv||netCv||machines.length)requestAnimationFrame(frame);
onScroll();
if(calm)countUp();
