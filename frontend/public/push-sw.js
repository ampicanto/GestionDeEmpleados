self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data?.text() || 'Tienes una nueva notificación' }
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Gestión Empleados', {
    body: data.body || 'Tienes una nueva solicitud',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: { url: data.url || '/admin' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = new URL(event.notification.data?.url || '/admin', self.location.origin).href

  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const existingClient = clients.find((client) => client.url.startsWith(self.location.origin))
    if (existingClient) {
      existingClient.navigate(targetUrl)
      return existingClient.focus()
    }
    return self.clients.openWindow(targetUrl)
  }))
})