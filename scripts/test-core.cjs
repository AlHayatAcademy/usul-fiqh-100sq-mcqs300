const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'mcqs.js'),'utf8'),ctx);vm.runInContext(fs.readFileSync(path.join(root,'data.js'),'utf8'),ctx);
const M=JSON.parse(JSON.stringify(ctx.window.USUL_MCQS)),D=JSON.parse(JSON.stringify(ctx.window.USUL_DATA));
const Q=require('../quiz-core.js');
assert.equal(D.interview_questions.length,120);assert.equal(M.questions.length,300);assert.equal(M.sets.length,6);
assert.equal(new Set(M.questions.map(q=>q.question)).size,300);assert.equal(new Set(M.questions.map(q=>q.id)).size,300);
const allIds=M.sets.flatMap(s=>s.questionIds);assert.equal(allIds.length,300);assert.equal(new Set(allIds).size,300);
const refs=new Set(D.interview_questions.map(q=>q.number));const units={};const answerBalance=[0,0,0,0];
for(const q of M.questions){assert.equal(q.options.length,4);assert.equal(new Set(q.options).size,4);assert.ok(q.correct>=0&&q.correct<4);assert.ok(q.explanation.length>80);assert.ok(refs.has(q.studyQuestion));assert.ok(q.question.length>25);units[q.unit]=(units[q.unit]||0)+1;answerBalance[q.correct]++;}
assert.deepEqual(answerBalance,[75,75,75,75]);assert.deepEqual(Object.values(units),[15,35,50,30,20,50,30,20,25,10,9,6]);
for(const set of M.sets){assert.equal(set.questionIds.length,50);const cover={};for(const id of set.questionIds){const u=M.questions.find(q=>q.id===id).unit;cover[u]=(cover[u]||0)+1;}assert.deepEqual(Object.keys(cover).map(Number),[[1,2],[3],[4,5],[6],[7,8],[9,10,11,12]][set.id-1]);}
for(const set of M.sets){
 for(const shuffled of [false,true]){
  const s=Q.createSession(set.questionIds,M.questions,{mode:'exam',shuffleOptions:shuffled,shuffleQuestions:shuffled,minutes:30},1000,()=>.421);
  assert.ok(Q.validateSession(s,M.questions));assert.equal(s.deadline,1801000);
  for(const e of s.entries){assert.deepEqual([...e.options].sort(),[0,1,2,3]);const q=M.questions.find(q=>q.id===e.id);s.answers[e.id]=q.correct;}
  assert.equal(Q.score(s,M.questions).correct,50);assert.equal(Q.score(s,M.questions).percent,100);
  const first=s.entries[0].id,q=M.questions.find(q=>q.id===first);s.answers[first]=(q.correct+1)%4;delete s.answers[s.entries[1].id];const score=Q.score(s,M.questions);assert.equal(score.correct,48);assert.equal(score.wrong,1);assert.equal(score.unanswered,1);assert.equal(score.percent,96);
  assert.equal(Object.values(score.units).reduce((n,u)=>n+u.total,0),50);
  const broken=JSON.parse(JSON.stringify(s));broken.entries[0].options=[0,0,1,2];assert.equal(Q.validateSession(broken,M.questions),false);
  const badKey=JSON.parse(JSON.stringify(s));badKey.answers[first]=8;assert.equal(Q.validateSession(badKey,M.questions),false);
 }
}
const small=Q.createSession([M.questions[0].id],M.questions,{mode:'practice'},1000,()=>.3);assert.equal(small.deadline,null);assert.equal(Q.score(small,M.questions).unanswered,1);
assert.throws(()=>Q.createSession(['nonexistent'],M.questions));assert.throws(()=>Q.createSession([M.questions[0].id,M.questions[0].id],M.questions));
console.log('PASS: 120 study items, 300 unique MCQs, 6 × 50, 12-unit coverage, balanced keys, scoring, shuffled keys, unanswered items and saved-session validation.');

const crypto=require('node:crypto');const integrity=JSON.parse(fs.readFileSync(path.join(root,'content/answer-integrity.json'),'utf8'));
assert.deepEqual(D.interview_questions.map(q=>q.number),Array.from({length:120},(_,i)=>i+1));
let definitionCount=0;for(const q of D.interview_questions){const digest=crypto.createHash('sha256').update(JSON.stringify(q.answer)).digest('hex');assert.equal(digest,integrity.originalAnswerHashes[q.originalNumber]);for(const d of q.definitions){definitionCount++;assert.equal(d.studyQuestion,q.number);assert.ok(d.arabic.length>12);assert.ok(d.translation.length>15);assert.ok(d.explanation.length>30);assert.match(d.source.url,/^https:\/\//);assert.ok(M.sourceCatalog[d.sourceKey]);}}assert.equal(definitionCount,50);
for(let i=0;i<M.questions.length;i++){const q=M.questions[i];assert.equal(q.number,i+1);assert.ok(q.source.book);assert.ok(M.sourceCatalog[q.sourceKey]);if(i)assert.ok(q.unit>=M.questions[i-1].unit);assert.equal(D.interview_questions.find(a=>a.number===q.studyQuestion).unit_id,q.unit);}
for(const set of M.sets){const rows=set.questionIds.map(id=>M.questions.find(q=>q.id===id));for(let i=1;i<rows.length;i++)assert.ok(rows[i].unit>rows[i-1].unit||rows[i].studyQuestion>=rows[i-1].studyQuestion);}
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'mcqs.json'),'utf8')),M);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,'study.json'),'utf8')),D);console.log('PASS: source records, 50 definition cards, logical study/MCQ sequence, linked unit agreement, preserved 120 answer arrays and JSON/JS parity.');
