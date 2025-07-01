/* =================================================
   상태
================================================== */
let currentScreen = null;
const SLIDE_MS    = 300;
let fetchCtl      = null;
let alertCoolDown = false;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =================================================
   화면 전환
================================================== */
function showScreen(id){
  const next=document.getElementById(id);
  if(!next||next===currentScreen) return;

  if(reduceMotion||!currentScreen){
    if(currentScreen){currentScreen.style.display='none';currentScreen.classList.remove('active');}
    next.style.display='block';next.classList.add('active');currentScreen=next;return;
  }

  const prev=currentScreen;
  [prev,next].forEach(sec=>{sec.style.position='absolute';sec.style.inset=0;sec.style.width='100%';sec.style.height='100%';});
  next.style.display='block';next.style.transform='translateX(100%)';next.classList.add('active');

  requestAnimationFrame(()=>{
    next.style.transition=`transform ${SLIDE_MS}ms ease`;prev.style.transition=`transform ${SLIDE_MS}ms ease`;
    next.style.transform='translateX(0)';prev.style.transform='translateX(-100%)';
  });
  next.addEventListener('transitionend',function end(e){
    if(e.propertyName!=='transform')return;
    next.removeEventListener('transitionend',end);
    prev.style.display='none';prev.classList.remove('active');
    [prev,next].forEach(sec=>{sec.style.transform=sec.style.transition=sec.style.position='';});
    currentScreen=next;
  });
}

/* =================================================
   장 목록
================================================== */
function loadChapters(book){
  const list=document.querySelector('.chapter-list');list.innerHTML='';
  const total=book==='revelation'?22:66;const kor=book==='revelation'?'계시록':'이사야';
  for(let i=1;i<=total;i++){
    const btn=document.createElement('button');
    btn.className='chapter-btn';btn.textContent=`📖 ${kor} ${i}장`;
    btn.setAttribute('aria-label',`${kor} ${i}장 강해 보기`);
    btn.onclick=()=>openChapter(book,i);list.appendChild(btn);
  }
  showScreen('chapters');
}

/* =================================================
   강해 로드
================================================== */
function filePath(book,c){return book==='revelation'?`data/Rev/R-chapter${c}.txt`:`data/Isa/I-chapter${c}.txt`;}
async function openChapter(book,c){
  const kor=book==='revelation'?'계시록':'이사야';
  document.getElementById('contentTitle').textContent=`${kor} ${c}장`;
  const body=document.getElementById('contentBody');body.textContent='로딩 중…';showScreen('content');
  if(fetchCtl) fetchCtl.abort();fetchCtl=new AbortController();
  try{
    const res=await fetch(filePath(book,c),{signal:fetchCtl.signal});
    if(!res.ok) throw 0;body.textContent=(await res.text()).trim()||'(본문이 없습니다)';
  }catch{
    body.textContent='(오프라인이거나 본문 오류)';
    if(!alertCoolDown){alert(`❗ ${kor} ${c}장 표시 실패`);alertCoolDown=true;setTimeout(()=>alertCoolDown=false,4e3);}
  }
}

/* =================================================
   설정 슬라이더
================================================== */
const sliders=[
  {id:'fontRange',  css:v=>document.documentElement.style.setProperty('--font-scale',v/100)},
  {id:'layoutRange',css:v=>document.documentElement.style.setProperty('--layout-rate',v/100)},
  {id:'btnRange',   css:v=>document.documentElement.style.setProperty('--btn-scale',v/100)}
];
function handleInput(e){
  const s=sliders.find(o=>o.id===e.target.id),v=+e.target.value;
  s.css(v);document.getElementById(s.id.replace('Range','Val')).textContent=`${v}%`;
}
function saveSettings(){sliders.forEach(s=>localStorage.setItem(s.id,document.getElementById(s.id).value));popup();}
function loadSettings(){sliders.forEach(s=>{const v=localStorage.getItem(s.id)||'100';document.getElementById(s.id).value=v;s.css(+v);document.getElementById(s.id.replace('Range','Val')).textContent=`${v}%`;document.getElementById(s.id).addEventListener('input',handleInput);});}

/* 팝업 */
function popup(){const p=document.getElementById('popup');p.style.display='flex';setTimeout(()=>p.style.display='none',1500);}

/* init */
document.addEventListener('DOMContentLoaded',()=>{loadSettings();showScreen('main');});
