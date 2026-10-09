/* Pure scoring and session functions. No network or framework required. */
(function(root){
'use strict';
const shuffle=(array,rng=Math.random)=>{const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
function createSession(ids,questions,settings={},now=Date.now(),rng=Math.random){
 const map=new Map(questions.map(q=>[q.id,q]));
 if(!ids.length||new Set(ids).size!==ids.length||ids.some(id=>!map.has(id)))throw new Error('Invalid question list');
 const order=settings.shuffleQuestions?shuffle(ids,rng):[...ids];
 return {version:1,attemptId:`${now}-${Math.floor(rng()*1e9)}`,setId:settings.setId||null,title:settings.title||'مشق',mode:settings.mode==='exam'?'exam':'practice',startedAt:now,deadline:settings.minutes>0?now+settings.minutes*60000:null,entries:order.map(id=>({id,options:settings.shuffleOptions?shuffle([0,1,2,3],rng):[0,1,2,3]})),answers:{},checked:[],flags:[],position:0,finished:false,finishedAt:null};
}
function validateSession(s,questions){
 const validIds=new Set(questions.map(q=>q.id));
 if(!s||s.version!==1||!Array.isArray(s.entries)||!s.entries.length||s.entries.length>300||!['exam','practice'].includes(s.mode)||!Number.isFinite(s.startedAt)||s.startedAt<0)return false;
 if(s.deadline!==null&&(!Number.isFinite(s.deadline)||s.deadline<s.startedAt))return false;
 if(!Number.isInteger(s.position)||s.position<0||s.position>=s.entries.length||new Set(s.entries.map(e=>e.id)).size!==s.entries.length)return false;
 if(s.entries.some(e=>!validIds.has(e.id)||!Array.isArray(e.options)||e.options.length!==4||new Set(e.options).size!==4||e.options.some(n=>!Number.isInteger(n)||n<0||n>3)))return false;
 const entryIds=new Set(s.entries.map(e=>e.id));
 if(!s.answers||typeof s.answers!=='object'||Object.entries(s.answers).some(([id,n])=>!entryIds.has(id)||!Number.isInteger(n)||n<0||n>3))return false;
 if(!Array.isArray(s.checked)||!Array.isArray(s.flags)||[...s.checked,...s.flags].some(id=>!entryIds.has(id)))return false;
 if(s.checked.some(id=>!Object.hasOwn(s.answers,id)))return false;
 return typeof s.finished==='boolean';
}
function score(s,questions){
 const map=new Map(questions.map(q=>[q.id,q]));const units={};let correct=0,wrong=0,unanswered=0;
 const results=s.entries.map(e=>{const q=map.get(e.id);if(!q)throw new Error('Unknown question');const a=Object.hasOwn(s.answers,e.id)?s.answers[e.id]:null;const status=a===null?'unanswered':a===q.correct?'correct':'wrong';if(status==='correct')correct++;else if(status==='wrong')wrong++;else unanswered++;
 if(!units[q.unit])units[q.unit]={total:0,correct:0,wrong:0,unanswered:0};units[q.unit].total++;units[q.unit][status]++;
 return {id:e.id,answer:a,correct:q.correct,status};});
 return {total:s.entries.length,correct,wrong,unanswered,percent:Math.round(correct/s.entries.length*100),units,results};
}
const api={shuffle,createSession,validateSession,score};root.UsulQuiz=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
