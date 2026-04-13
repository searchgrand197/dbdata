import React, { memo, useEffect, useState } from 'react'
import api from '../api'
import toast from 'react-hot-toast'

function SettingsPanelInner({ onSaved }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    business_name: '',
    address: '',
    mobile: '',
    gst_number: '',
    dl_number: '',
    email: '',
    website: '',
    default_gst_percent: '5',
  })

  useEffect(() => {
    let cancelled = false
    api
      .get('/pharmacy/settings/')
      .then((res) => {
        const raw = res.data
        const d = raw && typeof raw === 'object' && 'business_name' in raw ? raw : raw?.data ?? raw?.entity
        if (!cancelled && d)
          setForm((f) => ({
            ...f,
            business_name: d.business_name || '',
            address: d.address || '',
            mobile: d.mobile || '',
            gst_number: d.gst_number || '',
            dl_number: d.dl_number || '',
            email: d.email || '',
            website: d.website || '',
            default_gst_percent:
              d.default_gst_percent != null && d.default_gst_percent !== ''
                ? String(d.default_gst_percent)
                : '5',
          }))
      })
      .catch(() => {
        if (!cancelled) toast.error('Could not load settings')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api.patch('/pharmacy/settings/', form)
      toast.success('Settings saved')
      onSaved?.(form)
    } catch {
      toast.error('Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-xs text-slate-500 p-4">Loading settings…</div>
  }

  const fields = [
    ['business_name', 'Business name'],
    ['address', 'Address (multiline)', true],
    ['mobile', 'Mobile'],
    ['gst_number', 'GST number'],
    ['default_gst_percent', 'Default GST % (sales & purchase rows)'],
    ['dl_number', 'D.L. number'],
    ['email', 'Email'],
    ['website', 'Website'],
  ]

  return (
    <div className="h-full overflow-y-auto p-4 max-w-xl">
      <h2 className="text-sm font-bold text-slate-800 mb-3">Pharmacy outlet & invoice header</h2>
      <div className="space-y-2">
        {fields.map(([key, label, multiline]) =>
          multiline ? (
            <label key={key} className="block">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">{label}</span>
              <textarea
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                rows={3}
                className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1 text-xs"
              />
            </label>
          ) : (
            <label key={key} className="block">
              <span className="text-[10px] font-semibold text-slate-500 uppercase">{label}</span>
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1 text-xs"
              />
            </label>
          )
        )}
      </div>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="mt-4 bg-blue-600 text-white text-xs font-semibold px-4 py-2 rounded"
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  )
}

export default memo(SettingsPanelInner)
