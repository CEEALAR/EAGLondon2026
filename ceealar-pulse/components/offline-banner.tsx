'use client'

import { useEffect, useState } from 'react'

/**
 * Top-fixed banner that appears when the browser reports navigator.onLine === false.
 * Conference WiFi drops; this turns silent fetch failures into something the user can see.
 *
 * navigator.onLine is best-effort (false negatives possible — a Wi-Fi-connected device
 * with no upstream DNS can still report `true`), so individual fetch calls should still
 * handle their own errors. This banner catches the common "tunnel killed my connection"
 * case where the OS has marked the interface down.
 */
export function OfflineBanner() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    setOnline(navigator.onLine)
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[200] bg-amber-500 text-white text-xs text-center py-1.5 font-medium"
      style={{ paddingTop: 'max(0.375rem, env(safe-area-inset-top))' }}
    >
      You&apos;re offline. Changes won&apos;t save until you reconnect.
    </div>
  )
}
