/*
 * Service Worker der Fahrtverteilung.
 *
 * Zweck: die App laesst sich installieren, startet auch ohne Netz und laedt bei
 * wiederholten Aufrufen schneller. Mehr nicht - die Fahrtendaten kommen
 * weiterhin live aus Supabase. Es wird bewusst nichts zwischengespeichert, was
 * benutzerabhaengig ist.
 *
 * Regeln:
 *   /_next/static/*  cache-first. Die Dateinamen enthalten einen Build-Hash,
 *                    sind also unveraenderlich - ein Treffer im Cache kann nie
 *                    veraltet sein.
 *   Icons, Manifest  stale-while-revalidate. Sofort aus dem Cache, im
 *                    Hintergrund erneuert.
 *   Navigationen     network-first, im Fehlerfall die Offline-Seite. HTML wird
 *                    nie gespeichert: die Seiten haengen an der Anmeldung.
 *   /api/*, Supabase gar nicht angefasst. Das faellt durch zum Netz.
 *
 * Bei Aenderungen an diesen Regeln CACHE_VERSION erhoehen. Alte Caches werden
 * beim Aktivieren geloescht.
 */

const CACHE_VERSION = 'v1';
const ASSET_CACHE = `assets-${CACHE_VERSION}`;
const SHELL_CACHE = `shell-${CACHE_VERSION}`;
const AKTUELLE_CACHES = [ASSET_CACHE, SHELL_CACHE];

const OFFLINE_SEITE = '/offline.html';

/** Dateien unter /public, die sich lohnen vorzuhalten. */
const SHELL_DATEIEN = [
    OFFLINE_SEITE,
    '/manifest.json',
    '/favicon.svg',
    '/android-chrome-192.png',
    '/android-chrome-512.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(SHELL_CACHE)
            .then((cache) => cache.addAll(SHELL_DATEIEN))
            // Sofort uebernehmen. Unbedenklich, weil ausschliesslich
            // gehashte, unveraenderliche Dateien aus dem Cache kommen -
            // ein Wechsel mitten in der Sitzung kann keine Chunks mischen.
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((namen) => Promise.all(
                namen
                    .filter((name) => !AKTUELLE_CACHES.includes(name))
                    .map((name) => caches.delete(name))
            ))
            .then(() => self.clients.claim())
    );
});

/** Unveraenderliche Build-Artefakte von Next.js. */
function istBuildArtefakt(url) {
    return url.pathname.startsWith('/_next/static/');
}

/** Statisches aus /public, das sich zwischen Deployments aendern kann. */
function istStatischesAsset(url) {
    return SHELL_DATEIEN.includes(url.pathname)
        || /\.(?:png|svg|ico|webmanifest)$/.test(url.pathname);
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const treffer = await cache.match(request);
    if (treffer) return treffer;

    const antwort = await fetch(request);
    if (antwort.ok) cache.put(request, antwort.clone());
    return antwort;
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const treffer = await cache.match(request);

    const nachladen = fetch(request)
        .then((antwort) => {
            if (antwort.ok) cache.put(request, antwort.clone());
            return antwort;
        })
        .catch(() => treffer);

    return treffer || nachladen;
}

async function navigationMitOfflineFallback(request) {
    try {
        return await fetch(request);
    } catch (fehler) {
        const cache = await caches.open(SHELL_CACHE);
        const offline = await cache.match(OFFLINE_SEITE);
        return offline || new Response('Offline', {
            status: 503,
            headers: {'Content-Type': 'text/plain; charset=utf-8'},
        });
    }
}

self.addEventListener('fetch', (event) => {
    const {request} = event;

    // Nur GET. Alles Schreibende geht ungefiltert ans Netz.
    if (request.method !== 'GET') return;

    const url = new URL(request.url);

    // Fremde Herkunft (Supabase, CDNs) nicht anfassen.
    if (url.origin !== self.location.origin) return;

    // API-Routen nie zwischenspeichern - sie haengen an der Sitzung.
    if (url.pathname.startsWith('/api/')) return;

    if (request.mode === 'navigate') {
        event.respondWith(navigationMitOfflineFallback(request));
        return;
    }

    if (istBuildArtefakt(url)) {
        event.respondWith(cacheFirst(request, ASSET_CACHE));
        return;
    }

    if (istStatischesAsset(url)) {
        event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
    }
});
