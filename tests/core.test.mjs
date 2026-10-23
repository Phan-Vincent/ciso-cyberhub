import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {emptyProgress,parseProgress,scoreQuiz,matches,countAcademyLessons,compareRecords} from '../web/core.ts';
const course=JSON.parse(readFileSync(new URL('../data/academy.json',import.meta.url)));
const allContent=JSON.parse(readFileSync(new URL('../data/content.json',import.meta.url)));
test('every question can score correctly and maps to a domain',()=>{const answers=Object.fromEntries(course.questions.map(q=>[q.id,q.answer]));const score=scoreQuiz(course.questions,answers);assert.equal(score.score,28);assert.equal(Object.keys(score.domains).length,5);});
test('unanswered questions count against total',()=>assert.deepEqual(scoreQuiz(course.questions,{}).score,0));
test('wrong answer cannot inflate score',()=>{const q=course.questions[0];assert.equal(scoreQuiz([q],{[q.id]:(q.answer+1)%4}).score,0);});
test('corrupted storage has a safe empty fallback',()=>assert.deepEqual(parseProgress('{broken'),emptyProgress()));
test('unknown progress versions are rejected',()=>assert.deepEqual(parseProgress('{"version":2,"lessons":[],"attempts":[]}'),emptyProgress()));
test('progress round-trip preserves learning and scores',()=>{const p={version:1,lessons:['academy/a'],attempts:[{at:'2024-01-01T00:00:00Z',score:1,total:2,domains:{1:{correct:1,total:2}}}]};assert.deepEqual(parseProgress(JSON.stringify(p)),p);});
test('duplicate and invalid lessons are filtered',()=>{assert.deepEqual(parseProgress(JSON.stringify({version:1,lessons:['a','a','<script>',42],attempts:[]})).lessons,['a']);});
test('invalid imported scores and domains are rejected',()=>{const p=parseProgress(JSON.stringify({version:1,lessons:[],attempts:[{at:'2024-01-01',score:999,total:1,domains:{}},{at:'2024-01-01',score:1,total:1,domains:{x:{correct:1,total:1}}}]}));assert.equal(p.attempts.length,0);});
test('search combines text terms and filters',()=>{const t={name:'Packet Tool',description:'DNS analysis',category:'Network',os:['Linux'],license:'MIT'};assert.ok(matches(t,'packet dns',{category:'Network',os:'Linux'}));assert.equal(matches(t,'dns',{os:'Windows'}),false);assert.equal(matches(t,'impossible',{}),false);});
test('empty filter includes unknown metadata but explicit filter does not',()=>{assert.ok(matches({name:'Example',license:null},'',{license:''}));assert.equal(matches({name:'Example',license:null},'',{license:'MIT'}),false);});
test('completing all content only counts mapped Academy lessons and never exceeds 100%',()=>{
  const everyRoute=allContent.map(d=>`${d.section}/${d.id}`);
  assert.equal(everyRoute.length,55);
  const done=countAcademyLessons(everyRoute,course.objectives);
  assert.equal(done,28);
  assert.equal(Math.round((done/course.objectives.length)*100),100);
});
test('compareRecords sorts date_added newest first',()=>{
  const records=[
    {id:'CVE-2021-0001',date_added:'2021-11-03'},
    {id:'CVE-2026-9999',date_added:'2026-10-20'},
    {id:'CVE-2024-0002',date_added:'2024-05-10'}
  ];
  records.sort((a,b)=>compareRecords(a,b,'date_added'));
  assert.deepEqual(records.map(r=>r.date_added),['2026-10-20','2024-05-10','2021-11-03']);
});
