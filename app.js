/* =================================================
   상태 변수
================================================== */
let currentScreen   = null;
const SLIDE_MS      = 300;
let currentFetchCtl = null;      // AbortController
let alertCooldown   = false;     // 중복 알림 방지

const prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =================================================
   화면 전환 (우→좌 슬라이드)
================================================== */
function showScreen(id){
  const next = document.getElementById(id);
  if(!next || next===currentScreen) return;

  /* 모션 OFF 시스템 → 즉시 전환 */
  if(prefersReduce || !currentScreen){
    next.style.display='block';
    next.classList.add('active');
    if(currentScreen){
      currentScreen.classList.remove('active');
      currentScreen.style.display='none';
    }
    currentScreen = next;
    return;
  }

  const prev=currentScreen;
  [prev,next].forEach(s=>{
    s.style.position='absolute'; s.style.inset=0; s.style.width='100%'; s.style.height='100%';
  });
  next.style.display='block';
  next.style.transform='translateX(100%)';
  next.classList.add('active');

  requestAnimationFrame(()=>{
    next.style.transition=`transform ${SLIDE_MS}ms ease`;
    prev.style.transition=`transform ${SLIDE_MS}ms ease`;
    next.style.transform='translateX(0)';
    prev.style.transform='translateX(-100%)';
  });
  next.addEventListener('transitionend',function end(e){
    if(e.propertyName!=='transform')return;
    next.removeEventListener('transitionend',end);
    prev.style.display='none'; prev.classList.remove('active');
    [prev,next].forEach(s=>{s.style.transform=s.style.transition=s.style.position='';});
    currentScreen=next;
  });
}

/* =================================================
   장 목록 생성
================================================== */
function loadChapters(book){
  const list=document.querySelector('.chapter-list');
  list.innerHTML='';
  const total = (book==='revelation') ? 22 : 66;
  const name  = (book==='revelation') ? '계시록' : '이사야';

  for(let i=1;i<=total;i++){
    const b=document.createElement('button');
    b.className='chapter-btn';
    b.textContent=`📖 ${name} ${i}장`;
    b.setAttribute('aria-label',`${name} ${i}장 강해 보기`);
    b.onclick=()=>openChapter(book,i);
    list.appendChild(b);
  }
  showScreen('chapters');
}

/* =================================================
   강해 본문 로드
================================================== */
function filePath(book,chap){
  return (book==='revelation')
    ? `data/Rev/R-chapter${chap}.txt`
    : `data/Isa/I-chapter${chap}.txt`;
}

async function openChapter(book,chap){
  const name=(book==='revelation')?'계시록':'이사야';
  document.getElementById('contentTitle').textContent=`${name} ${chap}장`;
  const body=document.getElementById('contentBody');
  body.textContent='로딩 중…';
  showScreen('content');

  /* 직전 fetch 취소 */
  if(currentFetchCtl) currentFetchCtl.abort();
  currentFetchCtl=new AbortController();

  try{
    const res=await fetch(filePath(book,chap),{signal:currentFetchCtl.signal});
    if(!res.ok) throw new Error();
    const txt=await res.text();
    body.textContent=txt.trim()||'(본문이 없습니다)';
  }catch(e){
    body.textContent='(오프라인 상태이거나 본문을 불러올 수 없습니다)';
    if(!alertCooldown){
      alert(`❗ ${name} ${chap}장을 표시할 수 없습니다.`);
      alertCooldown=true; setTimeout(()=>alertCooldown=false,4000);
    }
  }
}

/* =================================================
   설정 슬라이더
================================================== */
const sliders=[
  {id:'fontRange',
    css:v=>document.documentElement
             .style.setProperty('--font-base',`${Math.round(32*v/100)}px`)},
  {id:'layoutRange',
    css:v=>document.documentElement
             .style.setProperty('--menu-width',`${v}%`)},
  {id:'btnRange',    /* ★ 전체 UI 스케일 */
    css:v=>{
      const scale=v/100;
      document.documentElement.style.setProperty('--ui-scale',scale);
      /* 타이틀·버튼·min-height 등은 CSS 변수 연쇄로 자동 반영 */
    }}
];

function handleSliderInput(e){
  const s=sliders.find(x=>x.id===e.target.id);
  const val=+e.target.value;
  s.css(val);
  document.getElementById(s.id.replace('Range','Val')).textContent=`${val}%`;
}
function saveSettings(){
  sliders.forEach(s=>{
    const val=document.getElementById(s.id).value;
    localStorage.setItem(s.id,val);
  });
  showPopup();
}
function loadSettings(){
  sliders.forEach(s=>{
    const saved=localStorage.getItem(s.id) || document.getElementById(s.id).value;
    document.getElementById(s.id).value=saved;
    s.css(+saved);
    document.getElementById(s.id.replace('Range','Val')).textContent=`${saved}%`;
    document.getElementById(s.id).addEventListener('input',handleSliderInput);
  });
}

/* =================================================
   팝업
================================================== */
function showPopup(){
  const p=document.getElementById('popup');
  p.style.display='flex';
  setTimeout(()=>p.style.display='none',1500);
}

/* =================================================
   최초 로드
================================================== */
document.addEventListener('DOMContentLoaded',()=>{
  loadSettings();
  showScreen('main');
});
