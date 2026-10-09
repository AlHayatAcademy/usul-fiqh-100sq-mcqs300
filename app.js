const D=window.USUL_DATA;
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let currentChapter=1;
let readSet=new Set(JSON.parse(localStorage.getItem('usulRead')||'[]'));
const unitTones=['emerald','teal','blue','indigo','violet','rose','amber','orange','olive','cyan','plum','terracotta'];
const saveRead=()=>{localStorage.setItem('usulRead',JSON.stringify([...readSet]));updateReadCount()};
const updateReadCount=()=>$('#readCount').textContent=readSet.size;
function showView(id){$$('.view').forEach(v=>v.classList.remove('active'));$('#'+id).classList.add('active');$$('.top-link').forEach(x=>x.classList.remove('active'));if(id==='homeView')$('[data-home]')?.classList.add('active');window.scrollTo({top:0,behavior:'smooth'})}
function chapterBy(n){return D.chapters.find(c=>c.number===n)}
function unitBy(id){return D.units.find(u=>u.id===id)}
function closeSidebar(){$('#sidebar').classList.remove('show');$('#overlay').classList.remove('show')}
function goHome(){showView('homeView');closeSidebar()}
function scrollToUnits(){goHome();setTimeout(()=>$('#unitsSection').scrollIntoView({behavior:'smooth',block:'start'}),80)}
function renderSidebar(){
  const nav=$('#unitNav');nav.innerHTML='';
  D.units.forEach((u,idx)=>{
    const wrap=document.createElement('div');wrap.className=`unit-nav tone-${unitTones[idx]}`;
    wrap.innerHTML=`<button class="unit-nav-head"><span class="side-unit-dot">${u.id}</span><span class="side-unit-copy"><strong>${u.name}</strong><small>${u.title}</small></span><span class="side-chev">⌄</span></button><div class="unit-chapters"></div>`;
    wrap.querySelector('.unit-nav-head').onclick=()=>wrap.classList.toggle('open');
    const box=wrap.querySelector('.unit-chapters');
    D.chapters.filter(c=>c.unit_id===u.id).forEach(c=>{
      const b=document.createElement('button');b.className='chapter-link';b.dataset.ch=c.number;b.innerHTML=`<span>باب ${c.number}</span><em>${c.title}</em>`;b.onclick=()=>openChapter(c.number);box.appendChild(b)
    });nav.appendChild(wrap)
  })
}
function renderHome(){
  const g=$('#unitCards');g.innerHTML='';
  D.units.forEach((u,idx)=>{
    const chapters=D.chapters.filter(c=>c.unit_id===u.id), qs=chapters.reduce((a,c)=>a+c.question_count,0), tone=unitTones[idx];
    const panel=document.createElement('article');panel.className=`unit-index-panel tone-${tone}`;
    panel.innerHTML=`<div class="unit-index-head"><div class="unit-index-title"><span class="unit-index-number">${u.id}</span><div class="unit-index-copy"><span class="unit-index-name">${u.name}</span><h3>${u.title}</h3></div></div><div class="unit-index-meta"><span class="meta-pill">${chapters.length} ابواب</span><span class="meta-pill meta-soft">${qs} سوالات</span></div></div><div class="unit-index-body"><div class="unit-index-chapters"></div></div>`;
    const list=panel.querySelector('.unit-index-chapters');
    chapters.forEach(c=>{
      const b=document.createElement('button');
      b.className='unit-index-chapter';
      b.innerHTML=`<span class="chapter-chip-num">باب ${c.number}</span><span class="chapter-chip-title">${c.title}</span><span class="chapter-chip-arrow">←</span>`;
      b.onclick=()=>openChapter(c.number);
      list.appendChild(b)
    });
    g.appendChild(panel)
  });
  $('#questionCount').textContent=D.total_questions;$('#homeQCount').textContent=D.total_questions;$('#heroQCount').textContent=D.total_questions;updateReadCount()
}
function cleanVisibleText(t){
  return String(t||'')
    .replace(/^§AR§/,'')
    .replace(/^\s*(?:اردو\s*(?:مفہوم|ترجمہ)|عربی\s*(?:توضیح|تعریف)|وضاحت|تشریح|ترجمہ|مفہوم|حدیث|آیت)\s*[:：-]\s*/u,'')
    .replace(/\s+/g,' ')
    .trim();
}
function isStandaloneArabic(raw){
  const t=String(raw||'');
  if(t.startsWith('§AR§')) return true;
  const diacritics=(t.match(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g)||[]).length;
  return diacritics>=5 && t.length<900 && !/[ہےہیںکےکیسےمیںکوکا]/.test(t);
}
function appendArabicQuote(ans,text,idx){
  const block=document.createElement('blockquote');
  block.className=`arabic-quote aq-${(idx%4)+1}`;
  block.setAttribute('lang','ar');
  block.innerHTML=`<span class="quote-mark" aria-hidden="true">❝</span><p></p>`;
  block.querySelector('p').textContent=text.trim();
  ans.appendChild(block);
}
function appendUrduParagraph(ans,text){
  const cleaned=String(text||'').replace(/^\s*[،۔:]\s*/,'').replace(/\s+/g,' ').trim();
  if(!cleaned)return;
  const p=document.createElement('p');
  p.className='answer-paragraph';
  p.textContent=cleaned;
  ans.appendChild(p);
}
function buildReadableAnswer(ans,parts){
  let buffer='';
  let quoteIndex=0;
  const target=620;
  const flush=()=>{if(buffer.trim()){appendUrduParagraph(ans,buffer);buffer=''}};
  const addUrdu=(text)=>{
    const clean=cleanVisibleText(text);
    if(!clean)return;
    if(buffer && (buffer.length+clean.length+1)>target) flush();
    buffer+=(buffer?' ':'')+clean;
    if(buffer.length>=target) flush();
  };
  for(const raw of parts){
    const original=String(raw||'');
    const t=cleanVisibleText(original);
    if(!t)continue;
    if(original.startsWith('§AR§')||isStandaloneArabic(original)){
      flush();appendArabicQuote(ans,t,quoteIndex++);continue;
    }
    const rx=/(﴿[^﴾]+﴾|«[^»]+»)(\s*\([^)]{1,140}\))?/g;
    let last=0,m,found=false;
    while((m=rx.exec(t))){
      found=true;
      const before=t.slice(last,m.index).trim();
      if(before)addUrdu(before);
      flush();
      appendArabicQuote(ans,(m[1]+(m[2]||'')).trim(),quoteIndex++);
      last=rx.lastIndex;
    }
    if(found){
      const after=t.slice(last).trim();
      if(after)addUrdu(after);
    }else addUrdu(t);
  }
  flush();
}
function renderChapterUnitList(c){
  const u=unitBy(c.unit_id),box=$('#chapterUnitList');box.innerHTML='';
  D.chapters.filter(x=>x.unit_id===c.unit_id).forEach(x=>{const b=document.createElement('button');b.className='unit-chapter-jump'+(x.number===c.number?' current':'');b.textContent=`باب ${x.number} — ${x.title}`;b.onclick=()=>openChapter(x.number);box.appendChild(b)})
}
function openChapter(n,focusQ){
  const c=chapterBy(n);if(!c)return;currentChapter=n;localStorage.setItem('usulLastChapter',String(n));
  const tone=unitTones[(c.unit_id-1)%unitTones.length];
  $('#chapterView').className=`view tone-${tone}`;
  $('#chapterUnit').textContent=`${c.unit_name} — ${c.unit_title}`;$('#chapterTitle').textContent=c.title;$('#chapterNumber').textContent=`باب ${n}`;$('#chapterQCount').textContent=`${c.question_count} سوالات و جوابات`;
  $('#crumbUnit').textContent=c.unit_name;$('#crumbChapter').textContent=`باب ${n}`;renderChapterUnitList(c);$('#chapterUnitList').classList.remove('show');
  const list=$('#qaList');list.innerHTML='';
  c.questions.forEach((q,i)=>{
    const card=document.createElement('article');card.className='qa-card';card.id=`q-${n}-${i+1}`;const key=`${n}:${i+1}`;
    card.innerHTML=`<button class="qa-question" aria-expanded="false"><span class="qno">${i+1}</span><span class="qtext"></span><span class="chev">⌄</span></button><div class="qa-answer"></div>`;
    card.querySelector('.qtext').textContent=q.question.replace(/^سوال\s*[0-9۰-۹]+\s*/,'');const ans=card.querySelector('.qa-answer');
    const prose=document.createElement('div');prose.className='answer-prose';ans.appendChild(prose);
    buildReadableAnswer(prose,q.answer);
    const mark=document.createElement('div');mark.className='read-mark';mark.innerHTML=`<label><input type="checkbox" ${readSet.has(key)?'checked':''}><span>اس سوال کا مطالعہ مکمل</span></label>`;
    mark.querySelector('input').onchange=e=>{e.target.checked?readSet.add(key):readSet.delete(key);saveRead()};ans.appendChild(mark);
    card.querySelector('.qa-question').onclick=()=>{card.classList.toggle('open');card.querySelector('.qa-question').setAttribute('aria-expanded',card.classList.contains('open'))};list.appendChild(card)
  });
  $('#prevChapter').disabled=n===1;$('#nextChapter').disabled=n===64;$$('.chapter-link').forEach(x=>x.classList.toggle('active',Number(x.dataset.ch)===n));showView('chapterView');closeSidebar();
  if(focusQ)setTimeout(()=>{const el=$(`#q-${n}-${focusQ}`);if(el){el.classList.add('open');el.querySelector('.qa-question')?.setAttribute('aria-expanded','true');el.scrollIntoView({behavior:'smooth',block:'center'})}},120)
}
function renderInterview(unitId=0){
  const list=$('#interviewList'); if(!list)return; list.innerHTML='';
  const items=(D.interview_questions||[]).filter(x=>!unitId||x.unit_id===unitId);
  items.forEach((x,i)=>{
    const card=document.createElement('article'); card.className='qa-card interview-card';
    card.innerHTML=`<button class="qa-question" aria-expanded="false"><span class="qno">${x.number}</span><span class="qtext"></span><span class="chev">⌄</span></button><div class="qa-answer"><div class="interview-source"></div><div class="answer-prose"></div></div>`;
    card.querySelector('.qtext').textContent=x.question;
    card.querySelector('.interview-source').textContent=`${x.unit_name} • باب ${x.chapter_number}: ${x.chapter_title}`;
    buildReadableAnswer(card.querySelector('.answer-prose'),x.answer);
    card.querySelector('.qa-question').onclick=()=>{card.classList.toggle('open');card.querySelector('.qa-question').setAttribute('aria-expanded',card.classList.contains('open'))};
    list.appendChild(card);
  });
}
function openInterview(){showView('interviewView');closeSidebar();renderInterview(0);$$('.interview-filter').forEach(b=>b.classList.toggle('active',b.dataset.unit==='0'));}
function setupInterview(){
  const row=$('#interviewUnitFilters'); if(!row)return; row.innerHTML='';
  D.units.forEach(u=>{const b=document.createElement('button');b.className='interview-filter';b.dataset.unit=String(u.id);b.textContent=u.name;b.onclick=()=>{$$('.interview-filter').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderInterview(u.id)};row.appendChild(b)});
  document.querySelector('.interview-filter[data-unit="0"]')?.addEventListener('click',e=>{$$('.interview-filter').forEach(x=>x.classList.remove('active'));e.currentTarget.classList.add('active');renderInterview(0)});
}
function doSearch(q){
  q=q.trim();if(!q){goHome();return}const norm=s=>s.toLocaleLowerCase('ur'),needle=norm(q),hits=[];
  for(const c of D.chapters){if(norm(c.title).includes(needle))hits.push({c,qi:null,text:c.title});c.questions.forEach((x,i)=>{const body=[x.question,...x.answer.map(cleanVisibleText)].join(' ');if(norm(body).includes(needle))hits.push({c,qi:i+1,text:x.question.replace(/^سوال\s*[0-9۰-۹]+\s*/,'')})})}
  $('#searchSummary').textContent=`“${q}” کے لیے ${hits.length} نتائج`;const box=$('#searchResults');box.innerHTML='';
  hits.slice(0,250).forEach(h=>{const d=document.createElement('article');d.className='search-hit';d.innerHTML=`<small>باب ${h.c.number} — ${h.c.title}</small><h3>${h.qi?`سوال ${h.qi}`:'باب'}</h3><p></p>`;d.querySelector('p').textContent=h.text;d.onclick=()=>openChapter(h.c.number,h.qi);box.appendChild(d)});
  if(!hits.length)box.innerHTML='<div class="empty">کوئی نتیجہ نہیں ملا۔ مختلف الفاظ سے تلاش کریں۔</div>';showView('searchView')
}
renderSidebar();renderHome();setupInterview();
$('#backHome').onclick=goHome;$('#brandHome').onclick=goHome;$('[data-home]').onclick=goHome;
$('#browseBtn').onclick=scrollToUnits;$('#unitsTopBtn').onclick=scrollToUnits;$('#interviewTopBtn').onclick=openInterview;$('#interviewSideBtn').onclick=openInterview;$('#openInterviewBtn').onclick=openInterview;
$('#continueBtn').onclick=()=>openChapter(Number(localStorage.getItem('usulLastChapter')||1));$('#continueTopBtn').onclick=$('#continueBtn').onclick;
$('#startFirstBtn').onclick=()=>openChapter(1);$('#prevChapter').onclick=()=>openChapter(currentChapter-1);$('#nextChapter').onclick=()=>openChapter(currentChapter+1);
$('#chapterMenuBtn').onclick=()=>$('#chapterUnitList').classList.toggle('show');
$('#expandAll').onclick=()=>$$('.qa-card').forEach(x=>{x.classList.add('open');x.querySelector('.qa-question')?.setAttribute('aria-expanded','true')});
$('#collapseAll').onclick=()=>$$('.qa-card').forEach(x=>{x.classList.remove('open');x.querySelector('.qa-question')?.setAttribute('aria-expanded','false')});
let timer;$('#searchInput').oninput=e=>{clearTimeout(timer);timer=setTimeout(()=>doSearch(e.target.value),220)};
$('#searchTopBtn').onclick=()=>{if(window.innerWidth<=980){$('#sidebar').classList.add('show');$('#overlay').classList.add('show');setTimeout(()=>$('#searchInput').focus(),200)}else{$('#searchInput').focus()}};
$('#menuBtn').onclick=()=>{$('#sidebar').classList.toggle('show');$('#overlay').classList.toggle('show')};$('#overlay').onclick=closeSidebar;
$('#themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.setItem('usulTheme',document.body.classList.contains('dark')?'dark':'light')};
if(localStorage.getItem('usulTheme')==='dark')document.body.classList.add('dark');
