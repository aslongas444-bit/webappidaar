// service-worker.js (Versi offline sederhana)
const CACHE_NAME = 'versi-1';
const urlsToCache = [
  '/',
  'index.html'
  // Tambahkan file penting lain di sini, misal:
  // 'style.css',
  // 'app.js'
];

// Saat install, simpan file dasar ke cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache dibuka');
        return cache.addAll(urlsToCache);
      })
  );
});

// Saat ada request, cek cache dulu
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Jika ada di cache, pakai dari cache
        if (response) {
          return response;
        }
        // Jika tidak ada, ambil dari internet
        return fetch(event.request);
      }
    )
  );
});