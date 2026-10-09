const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.resolve(__dirname,'..');const html=fs.readFileSync(path.join(root,'index.html'),'utf8');const storageKey='usul-study-v2';
function boot(hash='home',state){
 const errors=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(html,{url:'https://example.test/repository/#'+hash,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});const w=dom.window;
 w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 if(state!==undefined)w.localStorage.setItem(storageKey,typeof state==='string'?state:JSON.stringify(state));
 for(const f of ['data.js','mcqs.js','quiz-core.js','app.js'])w.eval(fs.readFileSync(path.join(root,f),'utf8'));
 return {dom,w,doc:w.document,errors};
}
const next=()=>new Promise(r=>setTimeout(r,5));
async function navigate(b,hash){b.w.location.hash=hash;await next();}
function click(b,sel){const e=b.doc.querySelector(sel);assert.ok(e,'Missing '+sel);e.click();}
function state(b){return JSON.parse(b.w.localStorage.getItem(storageKey));}
(async()=>{
 const b=boot();assert.match(b.doc.querySelector('h1').textContent,/اصولِ فقہ/);
 await navigate(b,'read/q60');assert.equal(b.doc.querySelectorAll('.qa').length,10);assert.equal(b.doc.querySelector('#answer60').hidden,false);assert.ok(b.doc.querySelectorAll('#answer60 [lang="ar"]').length>=4);assert.equal(b.doc.querySelector('#answer60').textContent.includes('§QUOTE§'),false);
 click(b,'[data-complete="60"]');click(b,'[data-bookmark="60"]');assert.deepEqual(state(b).completed,[60]);assert.deepEqual(state(b).bookmarks,[60]);
 const search=b.doc.querySelector('#studySearch');search.value='ناموجودعبارت';search.dispatchEvent(new b.w.Event('input',{bubbles:true}));assert.ok(b.doc.querySelector('.empty-state'));click(b,'[data-action="reset-filters"]');assert.equal(b.doc.querySelectorAll('.qa').length,10);
 click(b,'[data-reading-mode="flash"]');assert.equal(b.doc.querySelector('#flashAnswer').hidden,true);click(b,'[data-action="reveal-flash"]');assert.equal(b.doc.querySelector('#flashAnswer').hidden,false);click(b,'[data-flash="1"]');assert.equal(b.doc.querySelector('#flashAnswer').hidden,true);
 await navigate(b,'practice');assert.equal(b.doc.querySelectorAll('[data-start-set]').length,6);click(b,'[data-start-set="1"]');await next();assert.equal(b.doc.querySelectorAll('.option').length,4);
 let s=state(b).session,q=b.w.USUL_MCQS.questions.find(q=>q.id===s.entries[0].id);click(b,`[data-option="${q.correct}"]`);assert.equal(b.doc.querySelector('.feedback'),null);click(b,'[data-action="check-answer"]');assert.ok(b.doc.querySelector('.feedback'));assert.equal(b.doc.querySelectorAll('.option:disabled').length,4);assert.equal(state(b).session.checked.length,1);
 click(b,'[data-move="1"]');click(b,'[data-action="flag-question"]');assert.equal(state(b).session.flags.length,1);await navigate(b,'practice');click(b,'[data-action="resume"]');await next();assert.equal(state(b).session.position,1);
 await navigate(b,'practice');let mode=b.doc.querySelector('#practiceMode');mode.value='exam';mode.dispatchEvent(new b.w.Event('change'));click(b,'[data-start-set="2"]');assert.equal(b.doc.querySelector('#confirmDialog').open,true);click(b,'#confirmYes');await next();
 s=state(b).session;assert.equal(s.mode,'exam');for(let i=0;i<50;i++){if(i)click(b,`[data-jump="${i}"]`);s=state(b).session;q=b.w.USUL_MCQS.questions.find(q=>q.id===s.entries[i].id);click(b,`[data-option="${q.correct}"]`);assert.equal(b.doc.querySelector('.feedback'),null);}
 click(b,'[data-action="finish"]');click(b,'#confirmYes');await next();assert.match(b.doc.querySelector('.score-circle b').textContent,/100%/);assert.equal(state(b).history.length,1);assert.equal(Object.keys(state(b).latest).length,50);
 const restored=boot('result',state(b));assert.match(restored.doc.querySelector('.score-circle b').textContent,/100%/);assert.equal(state(restored).history.length,1);restored.dom.window.close();
 await navigate(b,'practice');click(b,'[data-start-set="3"]');await next();s=state(b).session;q=b.w.USUL_MCQS.questions.find(q=>q.id===s.entries[0].id);click(b,`[data-option="${(q.correct+1)%4}"]`);click(b,'[data-action="finish"]');click(b,'#confirmYes');await next();const report=b.w.UsulQuiz.score(state(b).session,b.w.USUL_MCQS.questions);assert.equal(report.wrong,1);assert.equal(report.unanswered,49);
 click(b,'[data-review="wrong"]');assert.equal(b.doc.querySelectorAll('.review-card').length,1);click(b,'[data-action="retry-wrong"]');await next();assert.equal(state(b).session.entries.length,50);assert.deepEqual(state(b).session.answers,{});
 const before=state(b).session.entries[0].options[0];b.doc.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'1',bubbles:true}));assert.equal(state(b).session.answers[state(b).session.entries[0].id],before);
 const timed=state(b);timed.session.deadline=timed.session.startedAt+1;const t=boot('quiz',timed);await next();assert.equal(state(t).session.finished,true);assert.equal(state(t).history.length,3);await navigate(t,'quiz');assert.equal(state(t).history.length,3);t.dom.window.close();
 const bad=boot('quiz','{broken');await next();assert.equal(bad.w.location.hash,'#practice');assert.equal(bad.errors.length,0);bad.dom.window.close();
 const blocked=boot('home');Object.defineProperty(blocked.w.Storage.prototype,'setItem',{value(){throw new Error('blocked');}});click(blocked,'#theme');assert.ok(blocked.doc.body.classList.contains('dark'));blocked.dom.window.close();
 assert.deepEqual(b.errors,[]);b.dom.window.close();console.log('PASS: DOM interactions — deep links, Arabic markup, bookmarks, reading completion, search, flashcards, practice feedback, exam concealment, all-50 scoring, resume, review filters, retries, keyboard input, expiry, corrupt storage and unavailable storage. Visual browser rendering was not tested.');
})().catch(e=>{console.error(e);process.exitCode=1;});
