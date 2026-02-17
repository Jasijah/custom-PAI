const CACHE = "pai-control-shell-v1";
const ASSETS = ["/", "/index.html", "/manifest.webmanifest"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        const cloned = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, cloned));
        return response;
      }),
    ),
  );
});
