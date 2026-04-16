/** Marg-style billing helpers (expiry, pack/loose → base qty). */

export function expiryMeta(isoDate) {
  if (!isoDate) return { status: 'ok', days: null }
  const exp = new Date(isoDate)
  if (Number.isNaN(exp.getTime())) return { status: 'ok', days: null }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  exp.setHours(0, 0, 0, 0)
  const diffDays = Math.round((exp.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return { status: 'expired', days: diffDays }
  if (diffDays <= 60) return { status: 'expiring', days: diffDays }
  return { status: 'ok', days: diffDays }
}

export function expiryBadgeClass(status) {
  if (status === 'expired') return 'bg-rose-100 text-rose-800 border-rose-200'
  if (status === 'expiring') return 'bg-amber-100 text-amber-900 border-amber-200'
  return ''
}

/** Base units = (integer packs × pack_size) + loose units */
export function computeBaseQtyFromPacksLoose(packs, loose, packSize) {
  const ps = Math.max(1, Number(packSize) || 1)
  const pRaw = String(packs ?? '').trim()
  const p = pRaw === '' ? 0 : Math.max(0, parseInt(pRaw, 10) || 0)
  const lRaw = String(loose ?? '').trim()
  const l = lRaw === '' ? 0 : Math.max(0, Number(lRaw) || 0)
  return p * ps + l
}
