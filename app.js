// Unhandled promise rejection 로깅
window.addEventListener('unhandledrejection', evt => {
  console.error('Unhandled promise rejection:', evt.reason);
});

document.addEventListener('DOMContentLoaded', () => {
  const screens = document.querySelectorAll('.screen');
  let currentScreen = document.querySelector('.screen.active');

  // 화면 전환 애니메이션
  function animateTransition(fromEl, toEl) {
    if (fromEl === toEl) return;
    toEl.style.transition = 'none';
    toEl.style.transform = 'translateX(100%)';
    toEl.classList.add('active');
    requestAnimationFrame(() => {
      fromEl.style.transition = 'transform 0.3s ease';
      toEl.style.transition = 'transform 0.3s ease';
      fromEl.style.transform = 'translateX(-100%)';
      toEl.style.transform = 'translateX(0)';
    });
    const cleanup = () => {
      fromEl.classList.remove('active');
      ['transition','transform'].forEach(prop => {
        fromEl.style[prop] = '';
        toEl.style[prop] = '';
      });
      toEl.removeEventListener('transitionend', cleanup);
      currentScreen = toEl;
    };
    toEl.addEventListener('transitionend', cleanup, { once: true });
  }

  function showScreen(id) {
    animateTransition(currentScreen, document.getElementById(id));
  }

  // 장 목록 동적 생성 (이벤트 위임 사용)
  function showChapterScreen(book) {
    const chapterList = document.querySelector('.chapter-list');
    chapterList.innerHTML = '';
    const total = book === 'revelation' ? 22 : 66;
    const name = book === 'revelation' ? '계시록' : '이사야';
    const buttonsHtml = Array.from({ length: total }, (_, i) =>
      `<button role="listitem" data-book="${book}" data-chapter="${i+1}" aria-label="${name} ${i+1}장 열기">📖 ${name} ${i+1}장</button>`
    ).join('');
    chapterList.innerHTML = buttonsHtml;
    showScreen('chapter-screen');
  }

  // 버튼 이벤트
  document.getElementById('btn-revelation').addEventListener('click', () => showChapterScreen('revelation'));
  document.getElementById('btn-isaiah').addEventListener('click', () => showChapterScreen('isaiah'));
  document.getElementById('btn-settings').addEventListener('click', () => showScreen('settings-screen'));
  document.getElementById('btn-back-from-chapter').addEventListener('click', () => showScreen('main-screen'));
  document.getElementById('btn-back-from-settings').addEventListener('click', () => showScreen('main-screen'));
  document.getElementById('btn-back-from-content').addEventListener('click', () => showScreen('chapter-screen'));

  // 목록 클릭 이벤트
  document.querySelector('.chapter-list').addEventListener('click', event => {
    const btn = event.target.closest('button');
    if (!btn) return;
    const book = btn.dataset.book;
    const chapter = btn.dataset.chapter;
    const name = book === 'revelation' ? '계시록' : '이사야';
    document.getElementById('content-title').textContent = `${name} ${chapter}장`;
    loadContent(book, chapter);
    showScreen('content-screen');
  });

  // 서비스 워커
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.error('SW 등록 실패:', err));
  }

  // 콘텐츠 로드
  function loadContent(book, chapter) {
    const contentEl = document.getElementById('content');
    const path = `data/${book === 'revelation' ? 'Rev/R-' : 'Isa/I-'}chapter${chapter}.txt`;
    fetch(path)
      .then(res => res.ok ? res.text() : Promise.reject('파일 없음'))
      .then(text => contentEl.textContent = text)
      .catch(err => contentEl.textContent = '강해 내용을 불러올 수 없습니다.');
  }
});
