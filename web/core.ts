export type Question = { id: string; objective: string; prompt: string; choices: string[]; answer: number; rationale: string };
export type Progress = { version: 1; lessons: string[]; attempts: { at: string; score: number; total: number; domains: Record<string, {correct:number; total:number}> }[] };
export const emptyProgress = (): Progress => ({version:1,lessons:[],attempts:[]});
export function parseProgress(raw: string | null): Progress {
  try {
    const value = JSON.parse(raw || 'null');
    if (value?.version !== 1 || !Array.isArray(value.lessons) || !Array.isArray(value.attempts)) return emptyProgress();
    const lessons = [...new Set(value.lessons.filter((x:unknown)=> typeof x === 'string' && /^[a-z0-9/-]{1,150}$/.test(x)))].slice(0,2000) as string[];
    const attempts = value.attempts.filter((a:any)=> a && typeof a.at==='string' && Number.isFinite(Date.parse(a.at)) && Number.isInteger(a.score) && Number.isInteger(a.total) && a.total>0 && a.score>=0 && a.score<=a.total && a.domains && typeof a.domains==='object' && Object.entries(a.domains).every(([k,v]:[string,any])=>/^[1-5]$/.test(k) && Number.isInteger(v.total) && Number.isInteger(v.correct) && v.total>0 && v.correct>=0 && v.correct<=v.total)).slice(-50);
    return {version:1,lessons,attempts};
  } catch { return emptyProgress(); }
}
export function scoreQuiz(questions: Question[], answers: Record<string, number>) {
  let score=0; const domains:Record<string,{correct:number;total:number}>={};
  for(const q of questions){const d=q.objective.split('.')[0]; domains[d]??={correct:0,total:0};domains[d].total++;
    if(answers[q.id]===q.answer){score++;domains[d].correct++;}}
  return {score,total:questions.length,domains};
}
export function countAcademyLessons(lessons: string[], objectives?: {lesson: string}[]) {
  const unique = [...new Set(lessons)];
  if (objectives && objectives.length > 0) {
    const mapped = new Set(objectives.map(o => `academy/${o.lesson}`));
    return unique.filter(id => mapped.has(id)).length;
  }
  return unique.filter(id => id.startsWith('academy/')).length;
}
export function compareRecords(a: Record<string, any>, b: Record<string, any>, sort = 'name') {
  const av = String(a[sort] || '');
  const bv = String(b[sort] || '');
  const desc = sort === 'published_at' || sort === 'last_verified' || sort === 'date_added';
  const primary = desc ? bv.localeCompare(av) : av.localeCompare(bv);
  if (primary !== 0) return primary;
  const aid = String(a.id || a.name || a.title || '');
  const bid = String(b.id || b.name || b.title || '');
  return desc ? bid.localeCompare(aid) : aid.localeCompare(bid);
}
export function matches(record: Record<string,any>, query:string, filters:Record<string,string>) {
  const haystack=[record.name,record.description,record.title,record.id,record.category,record.vendor,record.product,...(record.secondary_categories||[])].filter(Boolean).join(' ').toLowerCase();
  return query.toLowerCase().trim().split(/\s+/).every(term=>haystack.includes(term)) && Object.entries(filters).every(([key,value])=>!value || (Array.isArray(record[key]) ? record[key].includes(value) : record[key]===value));
}
