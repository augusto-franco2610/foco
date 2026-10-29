// Service worker do Foco: recebe as notificações e abre o app ao tocar
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = {body: e.data && e.data.text()}; }
  e.waitUntil(self.registration.showNotification(d.title || 'Foco', {
    body: d.body || '', tag: d.tag || undefined, icon: 'icon-192.png', badge: 'favicon-32.png',
    data: {url: d.url || './'}, renotify: !!d.tag
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data && e.notification.data.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(list => {
    for (const c of list) { if (c.url.startsWith(self.registration.scope)) { c.navigate(url); return c.focus(); } }
    return self.clients.openWindow(url);
  }));
});
