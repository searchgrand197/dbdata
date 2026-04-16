import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [dismissed, setDismissed] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    function handleBeforeInstall(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    function handleAppInstalled() {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setDeferredPrompt(null)
  }

  if (isInstalled || dismissed || !deferredPrompt) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[300] bg-slate-900 text-white rounded-xl shadow-2xl px-4 py-2.5 flex items-center gap-3 max-w-sm animate-in">
      <Download size={18} className="text-blue-400 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold leading-tight">Install Pharmacy App</p>
        <p className="text-[10px] text-slate-400">Quick access from your home screen</p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-colors"
      >
        Install
      </button>
      <button onClick={() => setDismissed(true)} className="shrink-0 text-slate-500 hover:text-slate-300">
        <X size={14} />
      </button>
    </div>
  )
}
