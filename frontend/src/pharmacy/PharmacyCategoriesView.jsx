import React, { memo, useEffect, useMemo, useState } from 'react'
import { Search, Plus, Pill, Trash2, ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

const DEFAULT_CATEGORIES = [
  'Tablet', 'Syrup', 'Capsule', 'Injection', 'Cream', 'Powder', 'Drops', 'Surgicals', 'Liquid', 'Gel',
  'Suspension', 'Lotion', 'Diaper', 'Soap', 'Oil', 'Ointment', 'Kit', 'Bandage', 'Device', 'Spray',
  'Shampoo', 'Sachet', 'Facewash', 'Packet', 'Bottle', 'Solution', 'Condom', 'Sanitary Pad', 'Unit', 'Infusion',
  'Box', 'Elixir', 'Paste', 'Bolus', 'Balm', 'Respule', 'Toothpaste', 'Inhaler', 'Toothbrush', 'Serum',
  'Syringe', 'Paint', 'Churna', 'Granules', 'Face Mask', 'Jelly', 'Deodorant', 'Strip', 'Plaster', 'Wipe',
  'Roll On', 'Gummies', 'Chyawanprash', 'Mouthwash', 'Tube', 'Pouch', 'Wash', 'Rotacap', 'Vaccine', 'Suppository',
  'Patch', 'Jar', 'Water', 'Card', 'Expectorant', 'Razor', 'Lozenges', 'Honey', 'Thermometer', 'Tincture',
  'Conditioner', 'Bar', 'Nebulisers', 'Handwash', 'Liniment', 'Foam', 'Gargle', 'Vial', 'Moisturiser', 'Gum',
  'Scrub', 'Ampules', 'Cleanser', 'Particles', 'Adhesive', 'Lozenge', 'Diskette', 'Pen', 'Pastilles', 'Soflets',
  'Transcap', 'Tonic', 'Grains', 'Linctus', 'Pellet', 'Respicap', 'Pessaries', 'Cartrige', 'Husk', 'Emulsion',
  'Pessary', 'Enema', 'Gummy', 'Lacquer', 'Rotahaler', 'Instacap', 'Captabs', 'Aerosol', 'Film', 'Redicap',
  'Novocart', 'Opticops', 'Solvent', 'Tabcaps', 'Particle', 'Rapitab', 'Caplets', 'Intrauterine System', 'Transpule',
  'Transhaler', 'Vegicaps', 'Aquanase', 'Autopen', 'Multihaler', 'Oxipule', 'Autohaler', 'Alicaps', 'Rheocap',
  'Nexcaps', 'Oxycaps',
]

function colorForText(text) {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) hash = text.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return {
    backgroundColor: `hsl(${hue} 85% 94%)`,
    borderColor: `hsl(${hue} 70% 76%)`,
    color: `hsl(${hue} 60% 30%)`,
  }
}

function normalize(v) {
  return (v || '').trim().toLowerCase()
}

function uniqCategories(values) {
  const out = []
  const seen = new Set()
  values.forEach((v) => {
    const raw = (v || '').trim()
    if (!raw) return
    const key = raw.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(raw)
  })
  return out
}

function PharmacyCategoriesView() {
  const [medicines, setMedicines] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [categorySearch, setCategorySearch] = useState('')
  const [medicineSearch, setMedicineSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [customCategories, setCustomCategories] = useState([])
  const [newCategory, setNewCategory] = useState('')

  useEffect(() => {
    let cancelled = false
    setCategoriesLoading(true)
    api
      .get('/medicine-categories/?limit=1000')
      .then((res) => {
        if (cancelled) return
        const list = res.data?.data || res.data?.results || []
        setCustomCategories(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load categories')
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get('/medicines/?limit=2000')
      .then((res) => {
        if (cancelled) return
        const list = res.data?.data || res.data?.results || []
        setMedicines(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) toast.error('Failed to load medicines')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const categories = useMemo(() => {
    const fromMedicines = medicines.map((m) => m.form).filter(Boolean)
    const fromApi = customCategories.map((c) => c.name).filter(Boolean)
    return uniqCategories([...DEFAULT_CATEGORIES, ...fromMedicines, ...fromApi])
  }, [medicines, customCategories])

  const visibleCategories = useMemo(() => {
    const q = normalize(categorySearch)
    if (!q) return categories
    return categories.filter((c) => normalize(c).includes(q))
  }, [categories, categorySearch])

  const visibleMeds = useMemo(() => {
    const q = normalize(medicineSearch)
    if (!selectedCategory) return []
    return medicines.filter((m) => {
      const inCategory = normalize(m.form) === normalize(selectedCategory)
      if (!inCategory) return false
      if (!q) return true
      const hay = `${m.name || ''} ${m.sku || ''} ${m.pack_info || ''} ${m.hsn_code || ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [medicines, selectedCategory, medicineSearch])

  function addCategory() {
    const raw = newCategory.trim()
    if (!raw) return
    if (categories.some((c) => normalize(c) === normalize(raw))) {
      toast('Category already exists')
      return
    }
    api
      .post('/medicine-categories/', { name: raw, is_active: true })
      .then((res) => {
        const created = res.data?.data || res.data
        setCustomCategories((prev) => [...prev, created])
        setNewCategory('')
        setSelectedCategory(raw)
        toast.success('Category added')
      })
      .catch((e) => {
        toast.error(e?.response?.data?.detail || 'Failed to add category')
      })
  }

  function removeCustomCategory(cat) {
    const row = customCategories.find((c) => normalize(c.name) === normalize(cat))
    if (!row?.id) return
    api
      .delete(`/medicine-categories/${row.id}/`)
      .then(() => {
        setCustomCategories((prev) => prev.filter((c) => c.id !== row.id))
        if (normalize(selectedCategory) === normalize(cat)) {
          setSelectedCategory('All')
        }
        toast.success(`Deleted category: ${cat}`)
      })
      .catch((e) => {
        toast.error(e?.response?.data?.detail || 'Failed to delete category')
      })
  }

  function assignCategory(medicineId, categoryName) {
    api
      .patch(`/medicines/${medicineId}/`, { form: categoryName })
      .then(() => {
        setMedicines((prev) =>
          prev.map((m) => (String(m.id) === String(medicineId) ? { ...m, form: categoryName } : m)),
        )
      })
      .catch(() => {
        toast.error('Failed to assign category')
      })
  }

  return (
    <div className="h-full min-h-0 flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Medicine Categories</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search category..."
              className="pl-8 pr-3 py-1.5 text-sm rounded border border-slate-200 bg-white"
            />
          </div>
          <input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Add category"
            className="px-3 py-1.5 text-sm rounded border border-slate-200 bg-white"
          />
          <button
            type="button"
            onClick={addCategory}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-1"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      {!selectedCategory ? (
        <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-xl bg-white p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
            {visibleCategories.map((cat) => {
              const count = medicines.filter((m) => normalize(m.form) === normalize(cat)).length
              const css = colorForText(cat)
              const isCustom = customCategories.some((c) => normalize(c.name) === normalize(cat))
              return (
                <div key={cat} className="rounded-xl border px-3 py-3 min-h-[86px] transition" style={css}>
                  <button type="button" onClick={() => setSelectedCategory(cat)} className="w-full text-left">
                    <div className="text-base font-bold leading-tight">{cat}</div>
                    <div className="text-xs opacity-75 mt-1">{count} items</div>
                  </button>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() => removeCustomCategory(cat)}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="p-2 border-b border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('')
                  setMedicineSearch('')
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 text-sm text-slate-700 hover:bg-slate-50"
              >
                <ArrowLeft size={14} /> Back
              </button>
              <div className="text-sm font-semibold text-slate-700">
                {selectedCategory} Medicines ({visibleMeds.length})
              </div>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={medicineSearch}
                onChange={(e) => setMedicineSearch(e.target.value)}
                placeholder="Search medicine..."
                className="pl-8 pr-3 py-1 text-sm rounded border border-slate-200"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {loading || categoriesLoading ? (
              <div className="p-4 text-sm text-slate-500">Loading medicines...</div>
            ) : visibleMeds.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Pill className="mx-auto mb-2 text-slate-300" size={24} />
                No medicines found for this category.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-100 text-slate-600">
                  <tr>
                    <th className="text-left px-3 py-2">Medicine</th>
                    <th className="text-left px-3 py-2">Category</th>
                    <th className="text-left px-3 py-2">Pack</th>
                    <th className="text-left px-3 py-2">HSN</th>
                    <th className="text-left px-3 py-2">Assign Category</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleMeds.map((m) => (
                    <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td className="px-3 py-2 text-slate-600">{m.form || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{m.pack_info || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{m.hsn_code || '—'}</td>
                      <td className="px-3 py-2">
                        <select
                          value={m.form || ''}
                          onChange={(e) => assignCategory(m.id, e.target.value)}
                          className="w-full border border-slate-200 rounded px-2 py-1 text-sm bg-white"
                        >
                          <option value="">Uncategorized</option>
                          {categories.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(PharmacyCategoriesView)

