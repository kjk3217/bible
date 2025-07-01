const CACHE_NAME = 'bible-study-v2.0';
const DATA_CACHE_NAME = 'bible-data-v2.0';

// 앱 셸 리소스 (항상 캐시)
const APP_SHELL_FILES = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json'
];

// 아이콘 파일들
const ICON_FILES = [
    './icon-192.png',
    './icon-512.png'
];

// 데이터 파일들 (동적으로 생성)
const DATA_FILES = [
    // 계시록 데이터 파일들
    ...Array.from({length: 22}, (_, i) => `./data/Rev/R-chapter${i + 1}.txt`),
    // 이사야 데이터 파일들  
    ...Array.from({length: 66}, (_, i) => `./data/Isa/I-chapter${i + 1}.txt`)
];

// 모든 캐시할 파일들
const urlsToCache = [...APP_SHELL_FILES, ...ICON_FILES];

// 서비스 워커 설치
self.addEventListener('install', event => {
    console.log('[SW] 서비스 워커 설치 중... v2.0');
    
    event.waitUntil(
        Promise.all([
            // 앱 셸 캐시
            caches.open(CACHE_NAME).then(cache => {
                console.log('[SW] 앱 셸 캐시 시작');
                return cache.addAll(urlsToCache);
            }),
            // 데이터 캐시 초기화
            caches.open(DATA_CACHE_NAME).then(cache => {
                console.log('[SW] 데이터 캐시 초기화');
                return cache;
            })
        ])
        .then(() => {
            console.log('[SW] 모든 리소스 캐시 완료');
            return self.skipWaiting();
        })
        .catch(error => {
            console.error('[SW] 캐시 저장 실패:', error);
        })
    );
});

// 서비스 워커 활성화
self.addEventListener('activate', event => {
    console.log('[SW] 서비스 워커 활성화 중...');
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    // 현재 버전이 아닌 캐시 삭제
                    if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
                        console.log('[SW] 이전 캐시 삭제:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => {
            console.log('[SW] 서비스 워커 활성화 완료');
            return self.clients.claim();
        })
    );
});

// 네트워크 요청 가로채기
self.addEventListener('fetch', event => {
    const requestUrl = new URL(event.request.url);
    
    // GET 요청만 처리
    if (event.request.method !== 'GET') {
        return;
    }

    // 데이터 파일 요청 처리
    if (isDataFile(requestUrl.pathname)) {
        event.respondWith(handleDataRequest(event.request));
        return;
    }

    // 앱 셸 및 기타 요청 처리
    event.respondWith(handleAppShellRequest(event.request));
});

// 데이터 파일인지 확인
function isDataFile(pathname) {
    return pathname.includes('/data/Rev/') || pathname.includes('/data/Isa/');
}

// 데이터 요청 처리 (네트워크 우선, 캐시 백업)
async function handleDataRequest(request) {
    const cache = await caches.open(DATA_CACHE_NAME);
    
    try {
        console.log('[SW] 데이터 파일 네트워크 요청:', request.url);
        
        // 네트워크에서 최신 데이터 가져오기 시도
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // 응답을 복제하여 캐시에 저장
            cache.put(request, networkResponse.clone());
            console.log('[SW] 새로운 리소스 캐시 저장:', request.url);
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] 네트워크 요청 실패:', error);
        
        // 오프라인 상태에서 기본 페이지 반환
        if (request.destination === 'document') {
            const offlineResponse = await cache.match('./index.html');
            if (offlineResponse) {
                return offlineResponse;
            }
        }
        
        // 기본 오프라인 응답
        return new Response('오프라인 상태입니다.', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

// 백그라운드 캐시 업데이트
async function updateCacheInBackground(request, cache) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            await cache.put(request, networkResponse);
            console.log('[SW] 백그라운드 캐시 업데이트:', request.url);
        }
    } catch (error) {
        // 백그라운드 업데이트 실패는 무시
        console.log('[SW] 백그라운드 업데이트 실패:', request.url);
    }
}

// 백그라운드 동기화
self.addEventListener('sync', event => {
    if (event.tag === 'background-sync') {
        console.log('[SW] 백그라운드 동기화 실행');
        event.waitUntil(doBackgroundSync());
    }
});

// 푸시 알림 처리
self.addEventListener('push', event => {
    console.log('[SW] 푸시 알림 수신:', event);
    
    const title = '성경 강해집';
    const options = {
        body: event.data ? event.data.text() : '새로운 강해 내용이 업데이트되었습니다.',
        icon: './icon-192.png',
        badge: './icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 'bible-study-notification'
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
        renotify: true
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// 알림 클릭 처리
self.addEventListener('notificationclick', event => {
    console.log('[SW] 알림 클릭:', event);
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then(clientList => {
                // 이미 열린 창이 있으면 포커스
                for (const client of clientList) {
                    if (client.url.includes(self.registration.scope) && 'focus' in client) {
                        return client.focus();
                    }
                }
                // 새 창 열기
                if (clients.openWindow) {
                    return clients.openWindow('./');
                }
            })
        );
    }
});

// 백그라운드 동기화 함수
async function doBackgroundSync() {
    try {
        console.log('[SW] 백그라운드 동기화 시작');
        
        // 데이터 파일들 사전 캐싱
        const dataCache = await caches.open(DATA_CACHE_NAME);
        
        for (const dataFile of DATA_FILES) {
            try {
                const response = await fetch(dataFile);
                if (response.ok) {
                    await dataCache.put(dataFile, response);
                    console.log('[SW] 데이터 파일 캐시:', dataFile);
                }
            } catch (error) {
                console.log('[SW] 데이터 파일 캐시 실패:', dataFile);
            }
        }
        
        console.log('[SW] 백그라운드 동기화 완료');
    } catch (error) {
        console.error('[SW] 백그라운드 동기화 실패:', error);
    }
}

// 캐시 관리 메시지 처리
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'CACHE_MANAGEMENT') {
        switch (event.data.action) {
            case 'CLEAR_CACHE':
                clearAllCaches().then(() => {
                    event.ports[0].postMessage({ success: true });
                });
                break;
            case 'UPDATE_CACHE':
                updateAllCaches().then(() => {
                    event.ports[0].postMessage({ success: true });
                });
                break;
            case 'GET_CACHE_SIZE':
                getCacheSize().then(size => {
                    event.ports[0].postMessage({ size });
                });
                break;
        }
    }
});

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
        updateDataCache()
    ]);
    console.log('[SW] 모든 캐시 업데이트 완료');
}

// 앱 셸 캐시 업데이트
async function updateAppShellCache() {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(urlsToCache);
}

// 데이터 캐시 업데이트
async function updateDataCache() {
    const cache = await caches.open(DATA_CACHE_NAME);
    for (const dataFile of DATA_FILES) {
        try {
            const response = await fetch(dataFile);
            if (response.ok) {
                await cache.put(dataFile, response);
            }
        } catch (error) {
            // 개별 파일 실패는 무시
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

// 에러 처리
self.addEventListener('error', event => {
    console.error('[SW] 서비스 워커 에러:', event.error);
});

self.addEventListener('unhandledrejection', event => {
    console.error('[SW] 처리되지 않은 Promise 거부:', event.reason);
});
            // 성공시 캐시에 저장
            cache.put(request, networkResponse.clone());
            console.log('[SW] 데이터 파일 캐시 업데이트:', request.url);
            return networkResponse;
        } else {
            throw new Error(`HTTP ${networkResponse.status}`);
        }
    } catch (error) {
        console.log('[SW] 네트워크 실패, 캐시에서 데이터 반환:', request.url);
        
        // 네트워크 실패시 캐시에서 반환
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // 캐시에도 없으면 오프라인 메시지 반환
        return new Response(
            '오프라인 상태입니다.\n강해 내용을 불러올 수 없습니다.\n인터넷 연결을 확인해주세요.',
            {
                status: 200,
                statusText: 'OK',
                headers: { 'Content-Type': 'text/plain; charset=utf-8' }
            }
        );
    }
}

// 앱 셸 요청 처리 (캐시 우선, 네트워크 백업)
async function handleAppShellRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    
    // 캐시에서 먼저 찾기
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        console.log('[SW] 캐시에서 반환:', request.url);
        
        // 백그라운드에서 네트워크 업데이트 시도
        updateCacheInBackground(request, cache);
        
        return cachedResponse;
    }

    // 캐시에 없으면 네트워크에서 가져오기
    try {
        console.log('[SW] 네트워크에서 가져오기:', request.url);
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
