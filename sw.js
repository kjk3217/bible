/**
 * 성경 강해집 PWA v2.0 - Service Worker
 * 완전한 오프라인 지원 및 캐시 관리
 * 작성일: 2025년
 */

// =================================================================
// 캐시 설정 및 버전 관리
// =================================================================

const CACHE_VERSION = '2.0.0';
const CACHE_NAME = `bible-study-v${CACHE_VERSION}`;
const DATA_CACHE_NAME = `bible-data-v${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `bible-images-v${CACHE_VERSION}`;

// 앱 셸 리소스 (항상 캐시)
const APP_SHELL_FILES = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// 아이콘 및 이미지 파일들
const ICON_FILES = [
    './icon-192.png',
    './icon-512.png'
];

// 데이터 파일들 (동적으로 생성)
const REVELATION_FILES = Array.from({length: 22}, (_, i) => `./data/Rev/R-chapter${i + 1}.txt`);
const ISAIAH_FILES = Array.from({length: 66}, (_, i) => `./data/Isa/I-chapter${i + 1}.txt`);
const DATA_FILES = [...REVELATION_FILES, ...ISAIAH_FILES];

// 모든 캐시할 파일들
const STATIC_CACHE_URLS = [...APP_SHELL_FILES, ...ICON_FILES];

// 캐시 전략 설정
const CACHE_STRATEGIES = {
    APP_SHELL: 'cache-first',      // 앱 셸: 캐시 우선
    DATA: 'network-first',         // 데이터: 네트워크 우선
    IMAGES: 'cache-first'          // 이미지: 캐시 우선
};

// 오프라인 페이지 HTML
const OFFLINE_HTML = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>오프라인 - 성경 강해집</title>
    <style>
        body { 
            font-family: '맑은 고딕', Arial, sans-serif; 
            background: #287f6e; 
            color: white; 
            text-align: center; 
            padding: 50px 20px; 
            margin: 0;
        }
        .container { 
            max-width: 400px; 
            margin: 0 auto; 
        }
        h1 { font-size: 2em; margin-bottom: 20px; }
        p { font-size: 1.2em; line-height: 1.6; }
        .icon { font-size: 4em; margin-bottom: 20px; }
        .retry-btn { 
            background: white; 
            color: #287f6e; 
            border: none; 
            padding: 15px 30px; 
            border-radius: 10px; 
            font-size: 1.1em; 
            margin-top: 30px; 
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">📱</div>
        <h1>오프라인 모드</h1>
        <p>인터넷 연결이 없습니다.<br>캐시된 강해 내용만 이용 가능합니다.</p>
        <button class="retry-btn" onclick="window.location.reload()">다시 시도</button>
    </div>
</body>
</html>
`;

// =================================================================
// Service Worker 설치
// =================================================================

self.addEventListener('install', event => {
    console.log(`[SW] Service Worker 설치 시작 - v${CACHE_VERSION}`);
    
    event.waitUntil(
        Promise.all([
            // 앱 셸 캐시
            caches.open(CACHE_NAME).then(cache => {
                console.log('[SW] 앱 셸 캐시 시작');
                return cache.addAll(STATIC_CACHE_URLS).then(() => {
                    console.log('[SW] 앱 셸 캐시 완료');
                });
            }),
            
            // 데이터 캐시 초기화
            caches.open(DATA_CACHE_NAME).then(cache => {
                console.log('[SW] 데이터 캐시 초기화');
                return cache;
            }),
            
            // 이미지 캐시 초기화
            caches.open(IMAGE_CACHE_NAME).then(cache => {
                console.log('[SW] 이미지 캐시 초기화');
                return cache;
            }),
            
            // 오프라인 페이지 캐시
            caches.open(CACHE_NAME).then(cache => {
                return cache.put('/offline.html', new Response(OFFLINE_HTML, {
                    headers: { 'Content-Type': 'text/html' }
                }));
            })
        ])
        .then(() => {
            console.log('[SW] 모든 캐시 초기화 완료');
            return self.skipWaiting();
        })
        .catch(error => {
            console.error('[SW] 설치 중 오류:', error);
        })
    );
});

// =================================================================
// Service Worker 활성화
// =================================================================

self.addEventListener('activate', event => {
    console.log('[SW] Service Worker 활성화 시작');
    
    event.waitUntil(
        Promise.all([
            // 이전 캐시 정리
            cleanupOldCaches(),
            
            // 클라이언트 제어권 가져오기
            self.clients.claim()
        ])
        .then(() => {
            console.log('[SW] Service Worker 활성화 완료');
            
            // 모든 클라이언트에게 업데이트 알림
            return self.clients.matchAll().then(clients => {
                clients.forEach(client => {
                    client.postMessage({
                        type: 'SW_UPDATED',
                        version: CACHE_VERSION
                    });
                });
            });
        })
    );
});

// 이전 버전 캐시 정리
async function cleanupOldCaches() {
    const cacheNames = await caches.keys();
    const validCacheNames = [CACHE_NAME, DATA_CACHE_NAME, IMAGE_CACHE_NAME];
    
    const deletePromises = cacheNames
        .filter(cacheName => !validCacheNames.includes(cacheName))
        .map(cacheName => {
            console.log('[SW] 이전 캐시 삭제:', cacheName);
            return caches.delete(cacheName);
        });
    
    return Promise.all(deletePromises);
}

// =================================================================
// 네트워크 요청 가로채기
// =================================================================

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // GET 요청만 처리
    if (request.method !== 'GET') {
        return;
    }
    
    // 요청 유형별 처리
    if (isDataFile(url.pathname)) {
        // 데이터 파일 - 네트워크 우선 전략
        event.respondWith(handleDataRequest(request));
    } else if (isImageFile(url.pathname)) {
        // 이미지 파일 - 캐시 우선 전략
        event.respondWith(handleImageRequest(request));
    } else if (isAppShellFile(url.pathname)) {
        // 앱 셸 - 캐시 우선 전략
        event.respondWith(handleAppShellRequest(request));
    } else {
        // 기타 요청 - 기본 처리
        event.respondWith(handleGenericRequest(request));
    }
});

// =================================================================
// 요청 유형 감지 함수들
// =================================================================

function isDataFile(pathname) {
    return pathname.includes('/data/Rev/') || 
           pathname.includes('/data/Isa/') ||
           pathname.endsWith('.txt');
}

function isImageFile(pathname) {
    return /\.(png|jpg|jpeg|gif|svg|webp|ico)$/i.test(pathname);
}

function isAppShellFile(pathname) {
    const appShellPaths = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];
    return appShellPaths.includes(pathname) || pathname === '';
}

// =================================================================
// 요청 처리 전략들
// =================================================================

// 데이터 요청 처리 (네트워크 우선, 캐시 백업)
async function handleDataRequest(request) {
    const cache = await caches.open(DATA_CACHE_NAME);
    
    try {
        console.log('[SW] 데이터 파일 네트워크 요청:', request.url);
        
        // 네트워크에서 최신 데이터 가져오기 시도
        const networkResponse = await fetchWithTimeout(request, 5000);
        
        if (networkResponse && networkResponse.ok) {
            // 성공시 캐시에 저장
            cache.put(request, networkResponse.clone());
            console.log('[SW] 데이터 파일 캐시 업데이트:', request.url);
            return networkResponse;
        }
        
        throw new Error(`Network response not ok: ${networkResponse?.status}`);
        
    } catch (error) {
        console.log('[SW] 네트워크 실패, 캐시에서 데이터 반환:', request.url);
        
        // 네트워크 실패시 캐시에서 반환
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 캐시에도 없으면 오프라인 메시지 반환
        return createOfflineDataResponse();
    }
}

// 이미지 요청 처리 (캐시 우선, 네트워크 백업)
async function handleImageRequest(request) {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    
    // 캐시에서 먼저 확인
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        console.log('[SW] 이미지 캐시에서 반환:', request.url);
        
        // 백그라운드에서 업데이트 시도
        updateImageCacheInBackground(request, cache);
        
        return cachedResponse;
    }
    
    // 캐시에 없으면 네트워크에서 가져오기
    try {
        const networkResponse = await fetchWithTimeout(request, 3000);
        
        if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            console.log('[SW] 새로운 이미지 캐시 저장:', request.url);
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
        
    } catch (error) {
        console.log('[SW] 이미지 로드 실패:', request.url);
        return createOfflineImageResponse();
    }
}

// 앱 셸 요청 처리 (캐시 우선, 네트워크 백업)
async function handleAppShellRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    
    // 캐시에서 먼저 확인
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        console.log('[SW] 앱 셸 캐시에서 반환:', request.url);
        
        // 백그라운드에서 업데이트 시도
        updateAppShellCacheInBackground(request, cache);
        
        return cachedResponse;
    }
    
    // 캐시에 없으면 네트워크에서 가져오기
    try {
        const networkResponse = await fetchWithTimeout(request, 3000);
        
        if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
            console.log('[SW] 새로운 앱 셸 캐시 저장:', request.url);
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
        
    } catch (error) {
        console.log('[SW] 앱 셸 로드 실패:', request.url);
        
        // 오프라인 페이지 반환
        if (request.destination === 'document') {
            return cache.match('/offline.html');
        }
        
        return new Response('Service Unavailable', { status: 503 });
    }
}

// 일반 요청 처리
async function handleGenericRequest(request) {
    try {
        const networkResponse = await fetchWithTimeout(request, 5000);
        
        if (networkResponse && networkResponse.ok) {
            return networkResponse;
        }
        
        throw new Error('Network response not ok');
        
    } catch (error) {
        console.log('[SW] 일반 요청 실패:', request.url);
        
        // 문서 요청이면 오프라인 페이지 반환
        if (request.destination === 'document') {
            const cache = await caches.open(CACHE_NAME);
            return cache.match('/offline.html');
        }
        
        return new Response('Network Error', { status: 503 });
    }
}

// =================================================================
// 유틸리티 함수들
// =================================================================

// 타임아웃이 있는 fetch
function fetchWithTimeout(request, timeout = 5000) {
    return Promise.race([
        fetch(request),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Fetch timeout')), timeout)
        )
    ]);
}

// 백그라운드 캐시 업데이트
async function updateAppShellCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            await cache.put(request, networkResponse);
            console.log('[SW] 백그라운드 앱 셸 캐시 업데이트:', request.url);
        }
    } catch (error) {
        console.log('[SW] 백그라운드 앱 셸 업데이트 실패:', request.url);
    }
}

async function updateImageCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            await cache.put(request, networkResponse);
            console.log('[SW] 백그라운드 이미지 캐시 업데이트:', request.url);
        }
    } catch (error) {
        console.log('[SW] 백그라운드 이미지 업데이트 실패:', request.url);
    }
}

// 오프라인 응답 생성
function createOfflineDataResponse() {
    const offlineMessage = `오프라인 상태입니다.
강해 내용을 불러올 수 없습니다.
인터넷 연결을 확인해주세요.

캐시된 다른 강해 내용은 이용 가능합니다.`;
    
    return new Response(offlineMessage, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
}

function createOfflineImageResponse() {
    // SVG 기본 이미지 반환
    const offlineSVG = `
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="#287f6e"/>
        <text x="100" y="100" font-family="Arial" font-size="60" fill="white" text-anchor="middle">📱</text>
        <text x="100" y="140" font-family="Arial" font-size="14" fill="white" text-anchor="middle">오프라인</text>
    </svg>`;
    
    return new Response(offlineSVG, {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'image/svg+xml' }
    });
}

// =================================================================
// 백그라운드 동기화
// =================================================================

self.addEventListener('sync', event => {
    console.log('[SW] 백그라운드 동기화 이벤트:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    } else if (event.tag === 'cache-update') {
        event.waitUntil(updateAllCaches());
    }
});

// 백그라운드 동기화 실행
async function doBackgroundSync() {
    try {
        console.log('[SW] 백그라운드 동기화 시작');
        
        // 데이터 파일들 사전 캐싱
        await preloadDataFiles();
        
        // 캐시 정리
        await cleanupExpiredCache();
        
        console.log('[SW] 백그라운드 동기화 완료');
    } catch (error) {
        console.error('[SW] 백그라운드 동기화 실패:', error);
    }
}

// 데이터 파일 사전 로드
async function preloadDataFiles() {
    const dataCache = await caches.open(DATA_CACHE_NAME);
    const maxPreloadFiles = 10; // 한 번에 최대 10개 파일만 사전 로드
    
    let preloadCount = 0;
    
    for (const dataFile of DATA_FILES) {
        if (preloadCount >= maxPreloadFiles) break;
        
        try {
            const cachedResponse = await dataCache.match(dataFile);
            if (!cachedResponse) {
                const response = await fetch(dataFile);
                if (response && response.ok) {
                    await dataCache.put(dataFile, response);
                    console.log('[SW] 데이터 파일 사전 캐시:', dataFile);
                    preloadCount++;
                }
            }
        } catch (error) {
            console.log('[SW] 데이터 파일 사전 캐시 실패:', dataFile);
        }
        
        // CPU 부하 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

// 만료된 캐시 정리
async function cleanupExpiredCache() {
    const maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7일
    const now = Date.now();
    
    const cacheNames = [CACHE_NAME, DATA_CACHE_NAME, IMAGE_CACHE_NAME];
    
    for (const cacheName of cacheNames) {
        try {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const cachedDate = response.headers.get('date');
                    if (cachedDate) {
                        const cacheAge = now - new Date(cachedDate).getTime();
                        if (cacheAge > maxCacheAge) {
                            await cache.delete(request);
                            console.log('[SW] 만료된 캐시 삭제:', request.url);
                        }
                    }
                }
            }
        } catch (error) {
            console.log('[SW] 캐시 정리 실패:', cacheName);
        }
    }
}

// =================================================================
// 푸시 알림
// =================================================================

self.addEventListener('push', event => {
    console.log('[SW] 푸시 알림 수신:', event);
    
    const defaultOptions = {
        title: '성경 강해집',
        body: '새로운 강해 내용이 업데이트되었습니다.',
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 'bible-study-notification',
            url: './'
        },
        actions: [
            {
                action: 'open',
                title: '앱 열기',
                icon: './icon-192.png'
            },
            {
                action: 'close',
                title: '닫기'
            }
        ],
        tag: 'bible-study',
        renotify: true,
        requireInteraction: false,
        silent: false
    };
    
    let notificationOptions = defaultOptions;
    
    // 푸시 데이터가 있으면 파싱
    if (event.data) {
        try {
            const pushData = event.data.json();
            notificationOptions = {
                ...defaultOptions,
                ...pushData
            };
        } catch (error) {
            console.log('[SW] 푸시 데이터 파싱 실패, 기본값 사용');
            notificationOptions.body = event.data.text() || defaultOptions.body;
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationOptions.title, notificationOptions)
    );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
    console.log('[SW] 알림 클릭:', event);
    event.notification.close();
    
    const urlToOpen = event.notification.data?.url || './';
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                // 이미 열린 창이 있으면 포커스
                for (const client of clientList) {
                    if (client.url.includes(self.registration.scope) && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // 새 창 열기
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    }
});

// =================================================================
// 클라이언트 메시지 처리
// =================================================================

self.addEventListener('message', event => {
    console.log('[SW] 클라이언트 메시지 수신:', event.data);
    
    if (event.data && event.data.type) {
        switch (event.data.type) {
            case 'CACHE_MANAGEMENT':
                handleCacheManagement(event);
                break;
            case 'SKIP_WAITING':
                self.skipWaiting();
                break;
            case 'GET_VERSION':
                event.ports[0].postMessage({ version: CACHE_VERSION });
                break;
            case 'PRELOAD_DATA':
                event.waitUntil(preloadDataFiles());
                break;
            default:
                console.log('[SW] 알 수 없는 메시지 타입:', event.data.type);
        }
    }
});

// 캐시 관리 명령 처리
async function handleCacheManagement(event) {
    const { action } = event.data;
    
    try {
        switch (action) {
            case 'CLEAR_CACHE':
                await clearAllCaches();
                event.ports[0].postMessage({ success: true, message: '모든 캐시 삭제 완료' });
                break;
                
            case 'UPDATE_CACHE':
                await updateAllCaches();
                event.ports[0].postMessage({ success: true, message: '모든 캐시 업데이트 완료' });
                break;
                
            case 'GET_CACHE_SIZE':
                const size = await getCacheSize();
                event.ports[0].postMessage({ size });
                break;
                
            case 'CLEAR_DATA_CACHE':
                await caches.delete(DATA_CACHE_NAME);
                event.ports[0].postMessage({ success: true, message: '데이터 캐시 삭제 완료' });
                break;
                
            default:
                event.ports[0].postMessage({ success: false, message: '알 수 없는 액션' });
        }
    } catch (error) {
        console.error('[SW] 캐시 관리 실패:', error);
        event.ports[0].postMessage({ success: false, message: error.message });
    }
}

// 모든 캐시 지우기
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('[SW] 모든 캐시 삭제 완료');
}

// 모든 캐시 업데이트
async function updateAllCaches() {
    await Promise.all([
        updateAppShellCache(),
        updateDataCache(),
        updateImageCache()
    ]);
    console.log('[SW] 모든 캐시 업데이트 완료');
}

// 앱 셸 캐시 업데이트
async function updateAppShellCache() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_CACHE_URLS);
}

// 데이터 캐시 업데이트
async function updateDataCache() {
    const cache = await caches.open(DATA_CACHE_NAME);
    const maxUpdateFiles = 20;
    let updateCount = 0;
    
    for (const dataFile of DATA_FILES) {
        if (updateCount >= maxUpdateFiles) break;
        
        try {
            const response = await fetch(dataFile);
            if (response && response.ok) {
                await cache.put(dataFile, response);
                updateCount++;
            }
        } catch (error) {
            console.log('[SW] 데이터 파일 업데이트 실패:', dataFile);
        }
    }
}

// 이미지 캐시 업데이트
async function updateImageCache() {
    const cache = await caches.open(IMAGE_CACHE_NAME);
    
    for (const iconFile of ICON_FILES) {
        try {
            const response = await fetch(iconFile);
            if (response && response.ok) {
                await cache.put(iconFile, response);
            }
        } catch (error) {
            console.log('[SW] 이미지 파일 업데이트 실패:', iconFile);
        }
    }
}

// 캐시 크기 계산
async function getCacheSize() {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    
    for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const requests = await cache.keys();
        totalSize += requests.length;
    }
    
    return totalSize;
}

// =================================================================
// 에러 처리
// =================================================================

self.addEventListener('error', event => {
    console.error('[SW] Service Worker 에러:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] 처리되지 않은 Promise 거부:', event.reason);
    event.preventDefault();
});

// =================================================================
// Service Worker 정보 로그
// =================================================================

console.log(`[SW] 성경 강해집 PWA Service Worker v${CACHE_VERSION} 로드 완료`);
console.log('[SW] 지원 기능: 오프라인 캐싱, 백그라운드 동기화, 푸시 알림');
console.log('[SW] 캐시 전략: 앱셸(캐시우선), 데이터(네트워크우선), 이미지(캐시우선)');

/**
 * =================================================================
 * Service Worker 완료 - 성경 강해집 PWA v2.0
 * 
 * 주요 기능:
 * - 완전한 오프라인 지원 (앱 셸 + 데이터 캐싱)
 * - 스마트 캐시 전략 (파일 유형별 최적화)
 * - 백그라운드 동기화 (자동 캐시 업데이트)
 * - 푸시 알림 지원
 * - 캐시 관리 API (클라이언트와 통신)
 * - 만료된 캐시 자동 정리
 * - 상세한 로깅 및 에러 처리
 * 
 * 캐시 전략:
 * - 앱 셸: Cache First (빠른 로딩)
 * - 데이터: Network First (최신 내용 우선)
 * - 이미지: Cache First (대역폭 절약)
 * 
 * 지원 브라우저: Chrome 40+, Firefox 44+, Safari 11.1+
 * =================================================================
 */
