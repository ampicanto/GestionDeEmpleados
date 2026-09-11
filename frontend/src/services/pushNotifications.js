const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function convertirClavePublica(clave) {
  const padding = '='.repeat((4 - (clave.length % 4)) % 4)
  const base64 = (clave + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)))
}

export async function activarNotificacionesPush() {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const token = localStorage.getItem('authToken')
  if (!publicKey || !token || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false

  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission
  if (permission !== 'granted') return false

  const registration = await navigator.serviceWorker.register('/push-sw.js')
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertirClavePublica(publicKey),
  })

  const response = await fetch(`${API_URL}/api/notificaciones/suscripcion`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(subscription),
  })

  if (!response.ok) throw new Error('No se pudo registrar la suscripción push')
  return true
}