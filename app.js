/* =================================================
   상태
================================================== */
let currentScreen   = null;
const SLIDE_MS      = 300;
let currentFetchCtl = null;
let alertCooldown   = false;
const prefersReduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =================================================
   화면 전환
================================================== */
function showScreen(id){
  const next=document.getElementById(id);
  if(!next||next===currentScreen) return;

  if(prefersReduce||!currentScreen){
    if(currentScreen){currentScreen.classList.remove('active');currentScreen.style.display='none';}
    next.style.display='block';next.classList.add('active');currentScreen=next;return;
  }

  const prev=currentScreen;
  [prev,next].forEach(s=>{s.style.position='absolute';s.style.inset=0;s.style.width='100%';s.style.height='100%';});
  next.style.display='block';next.style.transform='translateX(100%)';next.classList.add('active');
  requestAnimationFrame(()=>{
    next.style.transition=`transform ${SLIDE_MS}ms ease`;
    prev.style.transition=`transform ${SLIDE_MS}ms ease`;
    next.style.transform='translateX(0)';prev.style.transform='translateX(-100%)';
  });
  next.addEventListener('transitionend',function end(e){
    if(e.propertyName!=='transform')return;
    next.removeEventListener('transitionend',end);
    prev.style.display='none';prev.classList.remove('active');
    [prev,next].forEach(s=>{s.style.transform=s.style.transition=s.style.position='';});
    currentScreen=next;
  });
}

/* =================================================
   장 목록
================================================== */
function loadChapters(book){
  const list=document.querySelector('.chapter-list');list.innerHTML='';
  const total=book==='revelation'?22:66;const name=book==='revelation'?'계시록':'이사야';
  for(let i=1;i<=total;i++){
    const b=document.createElement('button');
    b.className='chapter-btn';b.textContent=`📖 ${name} ${i}장`;
    b.setAttribute('aria-label',`${name} ${i}장 강해 보기`);
    b.onclick=()=>openChapter(book,i);list.appendChild(b);
  }
  showScreen('chapters');
}

/* =================================================
   강해 로드
================================================== */
function filePath(book,chap){return book==='revelation'?`data/Rev/R-chapter${chap}.txt`:`data/Isa/I-chapter${chap}.txt`;}
async function openChapter(book,chap){
  const name=book==='revelation'?'계시록':'이사야';
  document.getElementById('contentTitle').textContent=`${name} ${chap}장`;
  const body=document.getElementById('contentBody');body.textContent='로딩 중…';showScreen('content');
  if(currentFetchCtl) currentFetchCtl.abort();currentFetchCtl=new AbortController();
  try{
    const res=await fetch(filePath(book,chap),{signal:currentFetchCtl.signal});
    if(!res.ok) throw 0;body.textContent=(await res.text()).trim()||'(본문이 없습니다)';
  }catch(e){
    body.textContent='(오프라인이거나 본문 오류)';if(!alertCooldown){alert(`❗ ${name} ${chap}장 표시 실패`);alertCooldown=true;setTimeout(()=>alertCooldown=false,4e3);}
  }
}

/* =================================================
   설정 슬라이더
================================================== */
const sliders=[
  {id:'fontRange',  css:v=>document.documentElement.style.setProperty('--font-base',`${32*v/100}px`)},
  {id:'layoutRange',css:v=>document.documentElement.style.setProperty('--menu-width',`${0.8*v}%`)},
  {id:'btnRange',   css:v=>document.documentElement.style.setProperty('--ui-scale',v/100)}
];
function handleSliderInput(e){
  const s=sliders.find(x=>x.id===e.target.id);const v=+e.target.value;
  s.css(v);document.getElementById(s.id.replace('Range','Val')).textContent=`${v}%`;
}
function saveSettings(){sliders.forEach(s=>localStorage.setItem(s.id,document.getElementById(s.id).value));showPopup();}
function loadSettings(){sliders.forEach(s=>{const v=localStorage.getItem(s.id)||'100';document.getElementById(s.id).value=v;s.css(+v);document.getElementById(s.id.replace('Range','Val')).textContent=`${v}%`;document.getElementById(s.id).addEventListener('input',handleSliderInput);});}

/* =================================================
   팝업
================================================== */
function showPopup(){const p=document.getElementById('popup');p.style.display='flex';setTimeout(()=>p.style.display='none',1500);}

/* =================================================
   init
================================================== */
document.addEventListener('DOMContentLoaded',()=>{loadSettings();showScreen('main');});
