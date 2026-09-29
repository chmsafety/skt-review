/* SKT 사옥점검 강평 — 서비스 워커
 * 화면 파일은 네트워크 먼저(항상 최신 — 브라우저 HTTP 캐시도 건너뛰고 서버에 확인), 끊기면 저장본. 서버(script.google.com) 통신은 건드리지 않음.
 * chmsafety.github.io 는 여러 앱이 같은 주소를 써서 캐시 이름을 skt-review- 로 구분 */
const CACHE = 'skt-review-v2';
const CDN = 'skt-review-cdn-v1';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-64.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('skt-review-') && k !== CACHE && k !== CDN).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const base = new URL('./', self.registration.scope);
  if (u.origin === base.origin && u.pathname.startsWith(base.pathname)) {
    e.respondWith(fetch(new Request(req.url, { cache: 'no-cache', credentials: 'same-origin' })).then(res => {
      if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
    return;
  }
  if (/(^|\.)cdnjs\.cloudflare\.com$|^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(caches.open(CDN).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    }));
  }
});
