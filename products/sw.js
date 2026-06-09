const CACHE = 'kfos-v1';
const ASSETS = [
  '/products/kitchenfounder-os.html',
  '/products/food-cost-calculator-app.html',
  '/products/break-even-calculator-v2.html',
  '/products/labour-planner.html',
  '/products/cash-flow-forecast.html',
  '/products/menu-engineering-matrix.html',
  '/products/daily-prep-sheet.html',
  '/products/waste-tracker.html',
  '/products/temp-log.html',
  '/products/shift-handover.html',
  '/products/restaurant-opening-checklist.html',
  '/products/preopening-timeline.html',
  '/products/lease-negotiation.html',
  '/products/supplier-negotiation.html',
  '/products/opening-week-runsheet.html',
  '/products/staff-onboarding.html',
  '/products/liquor-license-guide.html',
  '/products/investor-pitch.html',
  '/products/competitor-analysis.html',
  '/products/social-media-launch.html',
  '/products/health-inspection-prep.html',
  '/products/nut-allergen-training.html',
  '/products/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/products/kitchenfounder-os.html'));
    })
  );
});
