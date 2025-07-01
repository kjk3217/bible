/**
 * 성경 강해집 PWA v2.0
 * 모바일 최적화 성경 강해 앱
 * 작성일: 2025년
 */

// =================================================================
// DOM 요소 참조
// =================================================================

const screens = {
    main: document.getElementById('main-screen'),
    settings: document.getElementById('settings-screen'),
    chapter: document.getElementById('chapter-screen'),
    content: document.getElementById('content-screen')
};

const buttons = {
    settings: document.getElementById('settings-btn'),
    revelation: document.getElementById('revelation-btn'),
    isaiah: document.getElementById('isaiah-btn'),
    backFromSettings: document.getElementById('back-from-settings'),
    backFromContent: document.getElementById('back-from-content'),
    saveSettings: document.getElementById('save-settings'),
    popupOk: document.getElementById('popup-ok'),
    installYes: document.getElementById('install-yes'),
    installNo: document.getElementById('install-no')
};

const elements = {
    bookTitle: document.getElementById('book-title'),
    contentTitle: document.getElementById('content-title'),
    chapterList: document.getElementById('chapter-list'),
    studyContent: document.getElementById('study-content'),
    popup: document.getElementById('custom-popup'),
    popupMessage: document.getElementById('popup-message'),
    installPrompt: document.getElementById('install-prompt'),
    fontSizeSlider: document.getElementById('font-size'),
    buttonSizeSlider: document.getElementById('button-size'),
    layoutSizeSlider: document.getElementById('layout-size'),
    fontSizeValue: document.getElementById('font-size-value'),
    buttonSizeValue: document.getElementById('button-size-value'),
    layoutSizeValue: document.getElementById('layout-size-value')
};

// =================================================================
// 앱 상태 변수
// =================================================================

let currentBook = '';
let currentChapter = 0;

// PWA 설치 관련 변수
let deferredPrompt = null;
let installPromptShown = false;

// 성경책 데이터
const booksData = {
    revelation: {
        name: '계시록',
        chapters: 22,
        filePrefix: 'R',
        dataPath: 'data/Rev'
    },
    isaiah: {
        name: '이사야',
        chapters: 66,
        filePrefix: 'I',
        dataPath: 'data/Isa'
    }
};

// 데이터 캐시 시스템
const contentCache = new Map();

// =================================================================
// 화면 전환 함수들
// =================================================================

// 화면 전환 함수 (스와이프 효과 포함)
function showScreen(screenName, direction = 'fade') {
    const currentScreen = document.querySelector('.screen.active');
    const targetScreen = screens[screenName];
    
    if (!targetScreen || currentScreen === targetScreen) {
        return;
    }
    
    // 전환 방향 결정
    const transitionDirection = getTransitionDirection(currentScreen, targetScreen);
    
    // 스와이프 효과로 화면 전환
    performScreenTransition(currentScreen, targetScreen, transitionDirection);
}

// 화면 전환 방향 결정
function getTransitionDirection(currentScreen, targetScreen) {
    const screenHierarchy = {
        'main-screen': 0,
        'settings-screen': 1,
        'chapter-screen': 1,
        'content-screen': 2
    };
    
    const currentLevel = screenHierarchy[currentScreen?.id] || 0;
    const targetLevel = screenHierarchy[targetScreen?.id] || 0;
    
    if (targetLevel > currentLevel) {
        return 'slideLeft';  // 더 깊은 화면으로
    } else if (targetLevel < currentLevel) {
        return 'slideRight'; // 상위 화면으로
    } else {
        return 'slideLeft';  // 같은 레벨
    }
}

// 실제 화면 전환 애니메이션 수행
function performScreenTransition(currentScreen, targetScreen, direction) {
    // 전환 중 중복 실행 방지
    if (document.body.classList.contains('transitioning')) {
        return;
    }
    
    document.body.classList.add('transitioning');
    
    // 타겟 화면을 미리 준비
    targetScreen.classList.add('screen-preparing');
    
    switch (direction) {
        case 'slideLeft':
            slideLeft(currentScreen, targetScreen);
            break;
        case 'slideRight':
            slideRight(currentScreen, targetScreen);
            break;
        case 'fade':
        default:
            fadeTransition(currentScreen, targetScreen);
            break;
    }
}

// 왼쪽으로 슬라이드 (앞으로 가기)
function slideLeft(currentScreen, targetScreen) {
    // 타겟 화면을 오른쪽에 위치
    targetScreen.style.transform = 'translateX(100%)';
    targetScreen.classList.add('active');
    targetScreen.classList.remove('screen-preparing');
    
    // 강제 리플로우
    targetScreen.offsetHeight;
    
    // 애니메이션 시작
    currentScreen.style.transform = 'translateX(-100%)';
    targetScreen.style.transform = 'translateX(0)';
    
    // 애니메이션 완료 후 정리
    setTimeout(() => {
        finishTransition(currentScreen, targetScreen);
    }, 300);
}

// 오른쪽으로 슬라이드 (뒤로 가기)
function slideRight(currentScreen, targetScreen) {
    // 타겟 화면을 왼쪽에 위치
    targetScreen.style.transform = 'translateX(-100%)';
    targetScreen.classList.add('active');
    targetScreen.classList.remove('screen-preparing');
    
    // 강제 리플로우
    targetScreen.offsetHeight;
    
    // 애니메이션 시작
    currentScreen.style.transform = 'translateX(100%)';
    targetScreen.style.transform = 'translateX(0)';
    
    // 애니메이션 완료 후 정리
    setTimeout(() => {
        finishTransition(currentScreen, targetScreen);
    }, 300);
}

// 페이드 전환
function fadeTransition(currentScreen, targetScreen) {
    // 타겟 화면 준비
    targetScreen.style.opacity = '0';
    targetScreen.classList.add('active');
    targetScreen.classList.remove('screen-preparing');
    
    // 강제 리플로우
    targetScreen.offsetHeight;
    
    // 페이드 애니메이션
    currentScreen.style.opacity = '0';
    targetScreen.style.opacity = '1';
    
    // 애니메이션 완료 후 정리
    setTimeout(() => {
        finishTransition(currentScreen, targetScreen);
    }, 300);
}

// 전환 완료 후 정리
function finishTransition(currentScreen, targetScreen) {
    // 이전 화면 정리
    if (currentScreen) {
        currentScreen.classList.remove('active');
        currentScreen.style.transform = '';
        currentScreen.style.opacity = '';
    }
    
    // 타겟 화면 정리
    targetScreen.style.transform = '';
    targetScreen.style.opacity = '';
    targetScreen.classList.remove('screen-preparing');
    
    // 전환 상태 해제
    document.body.classList.remove('transitioning');
    
    // 화면별 초기화 콜백
    onScreenActivated(targetScreen.id);
}

// 화면 활성화 시 콜백
function onScreenActivated(screenId) {
    switch (screenId) {
        case 'main-screen':
            console.log('[Screen] 메인 화면 활성화');
            break;
        case 'settings-screen':
            console.log('[Screen] 설정 화면 활성화');
            break;
        case 'chapter-screen':
            console.log(`[Screen] ${currentBook} 장 선택 화면 활성화`);
            break;
        case 'content-screen':
            console.log(`[Screen] ${currentBook} ${currentChapter}장 강해 화면 활성화`);
            break;
    }
}

// =================================================================
// 네비게이션 함수들
// =================================================================

function navigateToMain() {
    showScreen('main');
}

function navigateToSettings() {
    showScreen('settings');
}

function navigateToChapterList(bookKey) {
    currentBook = bookKey;
    createChapterList(bookKey);
    showScreen('chapter');
}

function navigateToContent(bookKey, chapter) {
    currentBook = bookKey;
    currentChapter = chapter;
    elements.contentTitle.textContent = `${booksData[bookKey].name} ${chapter}장`;
    loadStudyContentWithCache(bookKey, chapter);
    showScreen('content');
}

// 뒤로 가기 네비게이션
function navigateBack() {
    const activeScreen = document.querySelector('.screen.active');
    
    if (activeScreen) {
        switch (activeScreen.id) {
            case 'settings-screen':
                navigateToMain();
                break;
            case 'chapter-screen':
                navigateToMain();
                break;
            case 'content-screen':
                createChapterList(currentBook);
                showScreen('chapter');
                break;
            default:
                // 메인 화면에서는 뒤로가기 없음
                break;
        }
    }
}

// =================================================================
// 장 선택 화면 생성
// =================================================================

function createChapterList(bookKey) {
    const book = booksData[bookKey];
    elements.chapterList.innerHTML = '';
    
    for (let i = 1; i <= book.chapters; i++) {
        const chapterBtn = document.createElement('button');
        chapterBtn.className = 'chapter-item';
        chapterBtn.textContent = `📖 ${book.name} ${i}장`;
        chapterBtn.addEventListener('click', () => {
            console.log(`[Chapter] ${book.name} ${i}장 선택`);
            navigateToContent(bookKey, i);
        });
        elements.chapterList.appendChild(chapterBtn);
    }
    
    console.log(`[Chapter] ${book.name} 장 목록 생성 완료 (총 ${book.chapters}장)`);
}

// =================================================================
// 강해 내용 로드 시스템
// =================================================================

// 캐시된 강해 내용 로드
async function loadStudyContentWithCache(bookKey, chapter) {
    const cacheKey = `${bookKey}-${chapter}`;
    
    // 캐시에서 먼저 확인
    if (contentCache.has(cacheKey)) {
        console.log(`[Cache] 캐시에서 로드: ${cacheKey}`);
        const cachedData = contentCache.get(cacheKey);
        
        if (cachedData.success) {
            displayStudyContent(cachedData.bookName, cachedData.chapter, cachedData.content);
        } else {
            displayErrorContent(cachedData.bookName, cachedData.chapter, cachedData.error);
        }
        return;
    }
    
    // 캐시에 없으면 새로 로드
    await loadStudyContent(bookKey, chapter);
}

// 강해 내용 로드
async function loadStudyContent(bookKey, chapter) {
    const book = booksData[bookKey];
    const fileName = `${book.filePrefix}-chapter${chapter}.txt`;
    const filePath = `${book.dataPath}/${fileName}`;
    const cacheKey = `${bookKey}-${chapter}`;
    
    // 로딩 상태 표시
    elements.studyContent.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <p class="loading-text">강해 내용을 불러오는 중...</p>
        </div>
    `;
    
    try {
        console.log(`[Data] 데이터 파일 로드 시도: ${filePath}`);
        
        const response = await fetch(filePath);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const content = await response.text();
        
        if (!content.trim()) {
            throw new Error('파일 내용이 비어있습니다');
        }
        
        // 성공 데이터 캐시에 저장
        contentCache.set(cacheKey, {
            success: true,
            bookName: book.name,
            chapter: chapter,
            content: content
        });
        
        displayStudyContent(book.name, chapter, content);
        console.log(`[Data] ${book.name} ${chapter}장 강해 내용 로드 및 캐시 완료`);
        
    } catch (error) {
        console.error(`[Data] 강해 내용 로드 실패: ${error.message}`);
        
        // 에러 데이터도 캐시에 저장 (반복 요청 방지)
        contentCache.set(cacheKey, {
            success: false,
            bookName: book.name,
            chapter: chapter,
            error: error
        });
        
        displayErrorContent(book.name, chapter, error);
    }
}

// 강해 내용 표시
function displayStudyContent(bookName, chapter, content) {
    // 텍스트 내용을 HTML로 변환 (줄바꿈 처리)
    const formattedContent = content
        .trim()
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => `<p>${escapeHtml(line)}</p>`)
        .join('');
    
    elements.studyContent.innerHTML = `
        <div class="content-header">
            <h2 class="content-book-title">${bookName} ${chapter}장 강해</h2>
        </div>
        <div class="content-body">
            ${formattedContent}
        </div>
    `;
}

// 에러 내용 표시
function displayErrorContent(bookName, chapter, error) {
    const errorMessage = getErrorMessage(error);
    
    elements.studyContent.innerHTML = `
        <div class="error-container">
            <div class="error-icon">📋</div>
            <h2 class="error-title">${bookName} ${chapter}장</h2>
            <p class="error-message">${errorMessage}</p>
            <button class="retry-btn" onclick="loadStudyContentWithCache('${getCurrentBookKey()}', ${chapter})">
                다시 시도
            </button>
        </div>
    `;
}

// 에러 메시지 생성
function getErrorMessage(error) {
    if (error.message.includes('404') || error.message.includes('Not Found')) {
        return '강해 내용 파일을 찾을 수 없습니다.<br>아직 준비되지 않은 장입니다.';
    } else if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
        return '네트워크 연결을 확인해주세요.<br>인터넷 연결이 필요합니다.';
    } else if (error.message.includes('비어있습니다')) {
        return '강해 내용이 아직 준비되지 않았습니다.<br>곧 업데이트될 예정입니다.';
    } else {
        return '강해 내용을 불러오는 중 오류가 발생했습니다.<br>잠시 후 다시 시도해주세요.';
    }
}

// HTML 이스케이프 처리
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 현재 선택된 책 키 반환
function getCurrentBookKey() {
    return currentBook;
}

// =================================================================
// 설정 관리 시스템
// =================================================================

// 설정 로드
function loadSettings() {
    const settings = {
        fontSize: localStorage.getItem('fontSize') || '32',
        buttonSize: localStorage.getItem('buttonSize') || '100',
        layoutSize: localStorage.getItem('layoutSize') || '100'
    };
    
    // 설정값 유효성 검사 및 보정
    settings.fontSize = Math.max(24, Math.min(48, parseInt(settings.fontSize))) || 32;
    settings.buttonSize = Math.max(80, Math.min(120, parseInt(settings.buttonSize))) || 100;
    settings.layoutSize = Math.max(80, Math.min(120, parseInt(settings.layoutSize))) || 100;
    
    elements.fontSizeSlider.value = settings.fontSize;
    elements.buttonSizeSlider.value = settings.buttonSize;
    elements.layoutSizeSlider.value = settings.layoutSize;
    
    updateSettingValues();
    applySettings();
    
    console.log('[Settings] 설정 로드 완료:', settings);
}

// 설정값 표시 업데이트
function updateSettingValues() {
    elements.fontSizeValue.textContent = elements.fontSizeSlider.value + 'px';
    elements.buttonSizeValue.textContent = elements.buttonSizeSlider.value + '%';
    elements.layoutSizeValue.textContent = elements.layoutSizeSlider.value + '%';
}

// 설정 적용
function applySettings() {
    const fontSize = parseInt(elements.fontSizeSlider.value);
    const buttonSize = parseInt(elements.buttonSizeSlider.value);
    const layoutSize = parseInt(elements.layoutSizeSlider.value);
    
    // CSS 변수 업데이트
    document.documentElement.style.setProperty('--font-size', fontSize + 'px');
    document.documentElement.style.setProperty('--button-scale', buttonSize / 100);
    document.documentElement.style.setProperty('--layout-scale', layoutSize / 100);
    
    // 뷰포트 크기에 따른 동적 조정
    adjustForViewport();
    
    console.log('[Settings] 설정 적용:', { fontSize, buttonSize, layoutSize });
}

// 뷰포트에 따른 조정
function adjustForViewport() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // 매우 작은 화면에서 자동 스케일 조정
    if (viewportWidth < 320 || viewportHeight < 480) {
        document.documentElement.style.setProperty('--auto-scale', '0.9');
    } else if (viewportWidth < 360) {
        document.documentElement.style.setProperty('--auto-scale', '0.95');
    } else {
        document.documentElement.style.setProperty('--auto-scale', '1');
    }
    
    // 가로 모드 감지 및 조정
    if (viewportWidth > viewportHeight && viewportHeight < 500) {
        document.body.classList.add('landscape-mode');
    } else {
        document.body.classList.remove('landscape-mode');
    }
}

// 설정 저장
function saveSettings() {
    const fontSize = elements.fontSizeSlider.value;
    const buttonSize = elements.buttonSizeSlider.value;
    const layoutSize = elements.layoutSizeSlider.value;
    
    // 유효성 검사
    const validFontSize = Math.max(24, Math.min(48, parseInt(fontSize)));
    const validButtonSize = Math.max(80, Math.min(120, parseInt(buttonSize)));
    const validLayoutSize = Math.max(80, Math.min(120, parseInt(layoutSize)));
    
    localStorage.setItem('fontSize', validFontSize.toString());
    localStorage.setItem('buttonSize', validButtonSize.toString());
    localStorage.setItem('layoutSize', validLayoutSize.toString());
    
    applySettings();
    showPopup('설정이 저장되었습니다!');
    
    console.log('[Settings] 설정 저장 완료:', {
        fontSize: validFontSize,
        buttonSize: validButtonSize,
        layoutSize: validLayoutSize
    });
}

// 설정 초기화
function resetSettings() {
    localStorage.removeItem('fontSize');
    localStorage.removeItem('buttonSize');
    localStorage.removeItem('layoutSize');
    
    elements.fontSizeSlider.value = 32;
    elements.buttonSizeSlider.value = 100;
    elements.layoutSizeSlider.value = 100;
    
    updateSettingValues();
    applySettings();
    showPopup('설정이 초기화되었습니다!');
    
    console.log('[Settings] 설정 초기화 완료');
}

// =================================================================
// 반응형 및 품질 관리 시스템
// =================================================================

// 반응형 체크 함수
function checkResponsiveDesign() {
    const issues = [];
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    
    console.log(`[Responsive] 현재 뷰포트: ${viewport.width}x${viewport.height}px`);
    
    // 폰트 크기 체크
    const currentFontSize = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--font-size'));
    if (viewport.width < 360 && currentFontSize > 28) {
        issues.push('작은 화면에서 폰트 크기가 클 수 있습니다');
    }
    
    // 버튼 크기 체크
    const buttons = document.querySelectorAll('.main-button, .chapter-item, .list-btn');
    buttons.forEach(button => {
        const rect = button.getBoundingClientRect();
        if (rect.height < 44) {
            issues.push('터치 영역이 권장 크기(44px)보다 작습니다');
        }
    });
    
    // 콘텐츠 오버플로우 체크
    const containers = document.querySelectorAll('.main-container, .chapter-container, .content-container');
    containers.forEach(container => {
        if (container.scrollWidth > container.clientWidth) {
            issues.push('가로 스크롤이 발생할 수 있습니다');
        }
    });
    
    if (issues.length === 0) {
        console.log('[Responsive] ✅ 반응형 디자인 검사 통과');
    } else {
        console.warn('[Responsive] ⚠️ 발견된 문제점:', issues);
    }
    
    return {
        viewport,
        issues,
        passed: issues.length === 0
    };
}

// 뷰포트 변경 감지
function setupViewportListener() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            adjustForViewport();
            checkResponsiveDesign();
        }, 250);
    });
    
    // 화면 회전 감지
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            adjustForViewport();
            checkResponsiveDesign();
        }, 500);
    });
}

// 터치 영역 최적화
function optimizeTouchTargets() {
    const touchElements = document.querySelectorAll('button, input[type="range"]');
    
    touchElements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.height < 44 || rect.width < 44) {
            element.style.minHeight = '44px';
            element.style.minWidth = '44px';
            console.log('[Touch] 터치 영역 최적화:', element.className);
        }
    });
}

// 성능 모니터링
function monitorPerformance() {
    // CSS 변수 변경 성능 체크
    const startTime = performance.now();
    
    applySettings();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    if (duration > 16) { // 60fps 기준
        console.warn('[Performance] 설정 적용이 느립니다:', duration.toFixed(2) + 'ms');
    } else {
        console.log('[Performance] 설정 적용 성능 양호:', duration.toFixed(2) + 'ms');
    }
}

// 접근성 체크
function checkAccessibility() {
    const issues = [];
    
    // 색상 대비 체크 (간단한 확인)
    const textElements = document.querySelectorAll('.main-button, .chapter-item');
    textElements.forEach(element => {
        const style = getComputedStyle(element);
        const bgColor = style.backgroundColor;
        const textColor = style.color;
        
        // 기본적인 대비 확인
        if (bgColor === textColor) {
            issues.push('텍스트와 배경색 대비가 부족할 수 있습니다');
        }
    });
    
    // 포커스 가능 요소 체크
    const focusableElements = document.querySelectorAll('button, input, [tabindex]');
    if (focusableElements.length === 0) {
        issues.push('포커스 가능한 요소가 없습니다');
    }
    
    return {
        issues,
        passed: issues.length === 0
    };
}

// 전체 품질 검사
function runQualityCheck() {
    console.log('\n=== 📱 모바일 반응형 품질 검사 ===');
    
    const responsive = checkResponsiveDesign();
    const accessibility = checkAccessibility();
    
    console.log('\n📏 반응형 디자인:', responsive.passed ? '✅ 통과' : '❌ 문제 있음');
    if (!responsive.passed) {
        console.log('   문제점:', responsive.issues);
    }
    
    console.log('♿ 접근성:', accessibility.passed ? '✅ 통과' : '⚠️ 개선 필요');
    if (!accessibility.passed) {
        console.log('   문제점:', accessibility.issues);
    }
    
    // 설정 범위 체크
    const currentSettings = {
        fontSize: parseInt(elements.fontSizeSlider.value),
        buttonSize: parseInt(elements.buttonSizeSlider.value),
        layoutSize: parseInt(elements.layoutSizeSlider.value)
    };
    
    console.log('\n⚙️ 현재 설정값:');
    console.log(`   폰트 크기: ${currentSettings.fontSize}px (범위: 24-48px)`);
    console.log(`   버튼 크기: ${currentSettings.buttonSize}% (범위: 80-120%)`);
    console.log(`   레이아웃 크기: ${currentSettings.layoutSize}% (범위: 80-120%)`);
    
    // 추천 설정 제안
    const viewport = responsive.viewport;
    const recommendations = [];
    
    if (viewport.width < 360) {
        if (currentSettings.fontSize > 28) {
            recommendations.push('작은 화면을 위해 폰트 크기를 28px 이하로 권장');
        }
        if (currentSettings.layoutSize > 90) {
            recommendations.push('작은 화면을 위해 레이아웃 크기를 90% 이하로 권장');
        }
    }
    
    if (viewport.height < 600) {
        if (currentSettings.layoutSize > 95) {
            recommendations.push('낮은 화면을 위해 레이아웃 크기를 95% 이하로 권장');
        }
    }
    
    if (recommendations.length > 0) {
        console.log('\n💡 권장 사항:');
        recommendations.forEach(rec => console.log(`   • ${rec}`));
    } else {
        console.log('\n✨ 현재 설정이 최적화되어 있습니다!');
    }
    
    console.log('\n==============================\n');
    
    return {
        responsive,
        accessibility,
        settings: currentSettings,
        recommendations,
        overall: responsive.passed && accessibility.passed && recommendations.length === 0
    };
}

// 실시간 설정 미리보기
function setupLivePreview() {
    const sliders = [elements.fontSizeSlider, elements.buttonSizeSlider, elements.layoutSizeSlider];
    
    sliders.forEach(slider => {
        slider.addEventListener('input', () => {
            updateSettingValues();
            applySettings();
            
            // 실시간 성능 체크
            if (performance.now() % 5 === 0) { // 가끔씩만 체크
                monitorPerformance();
            }
        });
    });
}

// 디바이스별 최적 설정 제안
function suggestOptimalSettings() {
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
    };
    
    let suggestions = {
        fontSize: 32,
        buttonSize: 100,
        layoutSize: 100,
        reason: '기본 설정'
    };
    
    // iPhone SE (375x667)
    if (viewport.width <= 375 && viewport.height <= 667) {
        suggestions = {
            fontSize: 28,
            buttonSize: 95,
            layoutSize: 95,
            reason: 'iPhone SE 최적화'
        };
    }
