import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Search, Plus, Trash2, UserPlus } from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  computeMargGstOnBase,
  computeSaleGstTotals,
  parseApiError,
  parseOutletDefaultGstPercent,
  resolveEffectiveGstPercent,
} from './pharmacyCalculations'
import { useDebouncedValue } from './useDebouncedValue'

const MIN_ROWS = 15
const TAIL_EMPTY = 5

/** Stable row id (no dependency on array index). */
function newBillingRowId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `br-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/**
 * Fixed numeric column widths (rem) keep alignment stable; product column flexes.
 * GST: # | product | batch | exp | qty | rate | gst% | T | ∅ | tax | gst | ₹ | ⌫
 */
const GRID_BILL_GST =
  'grid-cols-[1.25rem_minmax(0,1fr)_4.25rem_2.75rem_2.75rem_3.25rem_2.5rem_2.5rem_2rem_3.25rem_3.5rem_3.75rem_1.25rem]'
/** Non-GST: # | product | batch | exp | qty | rate | total | ⌫ */
const GRID_BILL_NO_GST =
  'grid-cols-[1.25rem_minmax(0,1fr)_4.25rem_2.75rem_2.75rem_3.25rem_4rem_1.25rem]'

const INP_NUM = 'w-full bg-transparent text-right tabular-nums text-[10px] outline-none py-0.5 px-1'
const CELL_NUM = 'px-0.5 text-right tabular-nums border-r border-slate-100 flex items-center justify-end min-w-0'
const CELL_INP_WRAP = 'px-0.5 border-r border-slate-100 flex items-center justify-end min-w-0'

function RupeesCell({ value }) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return (
    <div className={`${CELL_NUM} font-semibold text-slate-900`}>
      <div className="flex w-full justify-end items-center gap-1">
        <span className="text-slate-500 shrink-0">₹</span>
        <span className="tabular-nums">{n.toFixed(2)}</span>
      </div>
    </div>
  )
}

function safeFormat(dateVal, fmtStr) {
  if (!dateVal) return '--/--'
  try {
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return '--/--'
    return format(d, fmtStr)
  } catch {
    return '--/--'
  }
}

function createNewRow() {
  return {
    id: newBillingRowId(),
    medicine: null,
    batch: null,
    qty: 0,
    rate: 0,
    amount: 0,
    hsn: '',
    pack: '',
    gst_percent: '',
    gst_type: 'exclusive',
    no_gst: false,
    line_discount: 0,
  }
}

function normalizeRows(rows, createRow) {
  let lastMed = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i]?.medicine) lastMed = i
  }
  const target = lastMed < 0 ? MIN_ROWS : Math.max(MIN_ROWS, lastMed + 1 + TAIL_EMPTY)
  const next = [...rows]
  while (next.length < target) next.push(createRow())
  return next
}

function clearRowByIdAndNormalize(id, setRows, setActiveRow) {
  setRows((prev) => {
    const idx = prev.findIndex((r) => r.id === id)
    if (idx < 0) return prev
    const next = [...prev]
    // Keep the row slot stable; clear full product/batch payload.
    next[idx] = { ...createNewRow(), id }
    const normalized = normalizeRows(next, createNewRow)
    const nextLen = next.length
    queueMicrotask(() => {
      setActiveRow((ar) => {
        if (ar === idx) return idx
        return Math.min(ar, Math.max(0, nextLen - 1))
      })
    })
    return normalized
  })
}

function ErpBillingViewInner({
  medicines,
  batches,
  setInvoices,
  setPrintingInvoice,
  setShowAddMedicine,
  setShowAddPatient,
  fetchInitialData,
  selectedPt,
  setSelectedPt,
  outletSettings,
}) {
  const [rows, setRows] = useState(() => normalizeRows(Array.from({ length: MIN_ROWS }, () => createNewRow()), createNewRow))
  const [activeRow, setActiveRow] = useState(0)
  const [activeField, setActiveField] = useState('product')
  const [ptSearch, setPtSearch] = useState('')
  const debouncedPtSearch = useDebouncedValue(ptSearch, 320)
  const [ptResults, setPtResults] = useState([])
  const [pSearch, setPSearch] = useState('')
  const debouncedPSearch = useDebouncedValue(pSearch, 200)
  const [pResults, setPResults] = useState([])
  const [bResults, setBResults] = useState([])
  const [showBatchSelect, setShowBatchSelect] = useState(false)
  const [gstEnabled, setGstEnabled] = useState(true)

  const productRefs = useRef({})
  const qtyRefs = useRef({})
  const rateRefs = useRef({})

  React.useEffect(() => {
    if (debouncedPtSearch.length <= 2) {
      setPtResults([])
      return
    }
    let cancelled = false
    api
      .get(`/patients/?search=${encodeURIComponent(debouncedPtSearch)}&limit=8`)
      .then((res) => {
        if (!cancelled) setPtResults(res.data?.data || res.data?.results || [])
      })
      .catch(() => {
        if (!cancelled) setPtResults([])
      })
    return () => {
      cancelled = true
    }
  }, [debouncedPtSearch])

  React.useEffect(() => {
    if (debouncedPSearch.length <= 1) {
      setPResults([])
      return
    }
    const q = debouncedPSearch.toLowerCase()
    const filtered = medicines.filter((m) => m.name?.toLowerCase().includes(q))
    setPResults(filtered.slice(0, 12))
  }, [debouncedPSearch, medicines])

  const defaultGst = parseOutletDefaultGstPercent(outletSettings?.default_gst_percent)

  const updateRowById = useCallback((rowId, field, value) => {
    setRows((prev) => {
      const ix = prev.findIndex((r) => r.id === rowId)
      if (ix < 0) return prev
      const nr = [...prev]
      nr[ix] = { ...nr[ix], [field]: value }
      return normalizeRows(nr, createNewRow)
    })
  }, [])

  const patchRowById = useCallback((rowId, partial) => {
    setRows((prev) => {
      const ix = prev.findIndex((r) => r.id === rowId)
      if (ix < 0) return prev
      const nr = [...prev]
      nr[ix] = { ...nr[ix], ...partial }
      return normalizeRows(nr, createNewRow)
    })
  }, [])

  const { taxableSubtotal, gst, grandTotal, cgst, sgst } = useMemo(
    () => computeSaleGstTotals(rows, defaultGst, gstEnabled),
    [rows, defaultGst, gstEnabled],
  )

  const lineMarg = useMemo(() => {
    return rows.map((r) => {
      if (!r.medicine || !(Number(r.qty) > 0)) return null
      const base = (Number(r.qty) || 0) * (Number(r.rate) || 0)
      const disc = Number(r.line_discount) || 0
      if (!gstEnabled) {
        return computeMargGstOnBase({
          baseAmount: base,
          discount: disc,
          gstType: 'exclusive',
          gstPercent: 0,
          noGst: false,
        })
      }
      const resolved = resolveEffectiveGstPercent({
        rowGst: r.gst_percent,
        productGst: r.medicine?.gst_percent,
        defaultGst,
        noGst: !!r.no_gst,
      })
      return computeMargGstOnBase({
        baseAmount: base,
        discount: disc,
        gstType: r.gst_type,
        gstPercent: resolved,
        noGst: !!r.no_gst,
      })
    })
  }, [rows, defaultGst, gstEnabled])

  function handleRowEnter(e, rowId, field) {
    const idx = rows.findIndex((r) => r.id === rowId)
    if (idx < 0) return
    if (e.key === 'Enter') {
      e.preventDefault()
      if (field === 'product') {
        if (pResults.length > 0) {
          const m = pResults[0]
          patchRowById(rowId, {
            medicine: m,
            hsn: m.hsn_code,
            pack: m.pack_info,
            gst_percent: m?.gst_percent != null && m.gst_percent !== '' ? String(m.gst_percent) : '',
          })
          setPResults([])
          setPSearch('')
          setTimeout(() => qtyRefs.current[rowId]?.focus(), 50)
        }
      } else if (field === 'qty') {
        setTimeout(() => rateRefs.current[rowId]?.focus(), 50)
      } else if (field === 'rate') {
        if (idx < rows.length - 1) {
          const nextId = rows[idx + 1].id
          setActiveRow(idx + 1)
          setActiveField('product')
          setTimeout(() => productRefs.current[nextId]?.focus(), 50)
        }
      }
    }
    if (e.key === 'ArrowDown' && field === 'product' && idx < rows.length - 1) {
      e.preventDefault()
      const nextId = rows[idx + 1].id
      setActiveRow(idx + 1)
      setTimeout(() => productRefs.current[nextId]?.focus(), 0)
    }
    if (e.key === 'ArrowUp' && field === 'product' && idx > 0) {
      e.preventDefault()
      const prevId = rows[idx - 1].id
      setActiveRow(idx - 1)
      setTimeout(() => productRefs.current[prevId]?.focus(), 0)
    }
  }

  async function handleSave() {
    if (!selectedPt) {
      toast.error('Select Patient')
      return
    }
    const valid = rows.filter((r) => r.medicine && r.batch && Number(r.qty) > 0)
    if (!valid.length) {
      toast.error('No items')
      return
    }

    try {
      const { data: invData } = await api.post('/pharmacy/invoices/', {
        patient: selectedPt.id,
        gst_enabled: gstEnabled,
        subtotal: taxableSubtotal.toFixed(2),
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        status: 'finalized',
      })
      const invoice = invData?.data || invData
      const itemResults = await Promise.all(
        valid.map((r) => {
          const base = (Number(r.qty) || 0) * (Number(r.rate) || 0)
          const disc = Number(r.line_discount) || 0
          let marg
          let half = 0
          if (!gstEnabled) {
            marg = computeMargGstOnBase({
              baseAmount: base,
              discount: disc,
              gstType: 'exclusive',
              gstPercent: 0,
              noGst: false,
            })
          } else {
            const resolved = resolveEffectiveGstPercent({
              rowGst: r.gst_percent,
              productGst: r.medicine?.gst_percent,
              defaultGst,
              noGst: !!r.no_gst,
            })
            marg = computeMargGstOnBase({
              baseAmount: base,
              discount: disc,
              gstType: r.gst_type,
              gstPercent: resolved,
              noGst: !!r.no_gst,
            })
            half = resolved / 2
          }
          return api.post('/pharmacy/items/', {
            invoice: invoice.id,
            medicine: r.medicine.id,
            batch: r.batch.id,
            qty: r.qty,
            mrp: r.batch?.mrp ?? 0,
            rate: r.rate,
            amount: marg.taxableAmount.toFixed(2),
            cgst_rate: half.toFixed(2),
            sgst_rate: half.toFixed(2),
          })
        })
      )
      const builtItems = itemResults.map((res, i) => {
        const saved = res.data?.data || res.data
        const r = valid[i]
        return { ...r, ...saved, medicine: r.medicine, batch: r.batch }
      })
      setPrintingInvoice({
        ...invoice,
        gst_enabled: gstEnabled,
        items: builtItems,
        patient_details: selectedPt,
        subtotal: taxableSubtotal,
        cgst,
        sgst,
        grand_total: grandTotal,
      })
      setRows(normalizeRows(Array.from({ length: MIN_ROWS }, () => createNewRow()), createNewRow))
      setSelectedPt(null)
      setInvoices((prev) => [invoice, ...prev])
      fetchInitialData()
      toast.success('Invoice Generated')
    } catch (err) {
      toast.error(parseApiError(err))
    }
  }

  return (
    <div className="h-full flex gap-3 overflow-hidden min-h-0">
      <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0">
        <div className="bg-white border border-slate-200 px-3 py-2 rounded flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-lg min-w-0">
            <div className="flex-1 relative min-w-0">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-0.5 tracking-wide">Patient</p>
              {selectedPt ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-2 py-1 rounded text-xs font-semibold">
                  <span className="truncate text-blue-800">
                    {selectedPt.first_name} {selectedPt.last_name} ({selectedPt.uhid})
                  </span>
                  <button type="button" onClick={() => setSelectedPt(null)} className="text-blue-500 shrink-0 ml-1">
                    ×
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    type="text"
                    placeholder="NAME / UHID / MOBILE"
                    value={ptSearch}
                    onChange={(e) => setPtSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-8 pr-2 py-1 rounded text-xs font-medium focus:bg-white focus:border-blue-500 outline-none uppercase"
                  />
                  {ptSearch.length > 2 && (
                    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 shadow-lg z-50 max-h-48 overflow-y-auto text-left">
                      {ptResults.length > 0 ? (
                        ptResults.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setSelectedPt(p)
                              setPtResults([])
                              setPtSearch('')
                            }}
                            className="w-full text-left px-2 py-1.5 hover:bg-slate-50 text-xs"
                          >
                            <div className="font-semibold text-slate-900">
                              {p.first_name} {p.last_name}
                            </div>
                            <div className="text-[10px] text-slate-400">{p.phone} | {p.uhid}</div>
                          </button>
                        ))
                      ) : (
                        <div className="p-2 text-center text-xs text-slate-600">
                          <button
                            type="button"
                            onClick={() => setShowAddPatient(true)}
                            className="mt-1 text-blue-600 font-medium"
                          >
                            + Add patient
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex rounded border border-slate-200 overflow-hidden text-[9px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setGstEnabled(true)}
                className={`px-2 py-1 ${gstEnabled ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                GST bill
              </button>
              <button
                type="button"
                onClick={() => setGstEnabled(false)}
                className={`px-2 py-1 border-l border-slate-200 ${!gstEnabled ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Non-GST bill
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAddMedicine(true)}
              className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-semibold shrink-0"
            >
              + Medicine
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded overflow-hidden">
          <div
            className={`grid ${gstEnabled ? GRID_BILL_GST : GRID_BILL_NO_GST} gap-0 text-[8px] font-semibold text-slate-600 bg-slate-100 border-b border-slate-200 px-0.5 py-1 sticky top-0 z-20`}
          >
            <span className="text-center tabular-nums">#</span>
            <span>Product</span>
            <span className="text-center">Batch</span>
            <span className="text-center">Exp</span>
            <span className="text-right tabular-nums pr-1">Qty</span>
            <span className="text-right tabular-nums pr-1">Rate</span>
            {gstEnabled ? (
              <>
                <span className="text-right tabular-nums pr-1">GST%</span>
                <span className="text-center">T</span>
                <span className="text-center">∅</span>
                <span className="text-right tabular-nums pr-1">Tax</span>
                <span className="text-right tabular-nums pr-1">GST</span>
                <span className="text-right tabular-nums pr-1">₹</span>
              </>
            ) : (
              <span className="text-right tabular-nums pr-1">Total</span>
            )}
            <span className="w-full" />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-slate-100">
            {rows.map((row, idx) => (
              <div
                key={row.id}
                className={`grid ${gstEnabled ? GRID_BILL_GST : GRID_BILL_NO_GST} gap-0 items-stretch text-[9px] min-h-[28px] ${
                  activeRow === idx ? 'bg-blue-50/60' : idx % 2 ? 'bg-slate-50/40' : ''
                }`}
              >
                <span className="flex items-center justify-center text-slate-400 tabular-nums">{idx + 1}</span>

                <div className="px-0.5 py-0.5 border-r border-slate-100 min-w-0">
                  {row.medicine ? (
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-slate-900 uppercase truncate">{row.medicine.name}</span>
                      <span className="text-[9px] text-slate-400 truncate">
                        {row.medicine.pack_info} | {row.medicine.hsn_code}
                      </span>
                    </div>
                  ) : (
                    <div className="relative h-full min-h-[24px]">
                      <input
                        ref={(el) => {
                          if (el) productRefs.current[row.id] = el
                          else delete productRefs.current[row.id]
                        }}
                        autoFocus={activeRow === idx && activeField === 'product'}
                        onFocus={() => {
                          setActiveRow(idx)
                          setActiveField('product')
                        }}
                        type="text"
                        placeholder="Search…"
                        value={activeRow === idx ? pSearch : ''}
                        onChange={(e) => {
                          setPSearch(e.target.value)
                          setActiveRow(idx)
                        }}
                        onKeyDown={(e) => handleRowEnter(e, row.id, 'product')}
                        className="w-full bg-transparent outline-none uppercase font-semibold text-slate-900 placeholder:text-slate-300 text-[11px] px-0.5"
                      />
                      {activeRow === idx && (pResults.length > 0 || showBatchSelect || pSearch.length > 1) && (
                        <div className="absolute top-full left-0 mt-0.5 w-[min(100vw-2rem,28rem)] bg-white border border-slate-200 shadow-xl z-[60] max-h-52 overflow-y-auto">
                          {showBatchSelect ? (
                            bResults.length > 0 ? (
                              bResults.map((b) => {
                                const exp = b.expiry_date ? new Date(b.expiry_date) : null
                                const isExp = exp && !isNaN(exp.getTime()) && exp < new Date()
                                const stock = Number(b.quantity ?? 0)
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => {
                                      const m = medicines.find((med) => med.id === b.medicine)
                                      patchRowById(row.id, {
                                        medicine: m,
                                        batch: b,
                                        hsn: m?.hsn_code,
                                        pack: m?.pack_info,
                                        rate: Number(b.sale_rate ?? 0),
                                        gst_percent:
                                          m?.gst_percent != null && m.gst_percent !== ''
                                            ? String(m.gst_percent)
                                            : '',
                                      })
                                      setShowBatchSelect(false)
                                      setTimeout(() => qtyRefs.current[row.id]?.focus(), 50)
                                    }}
                                    className={`w-full text-left px-2 py-1 hover:bg-slate-50 flex justify-between gap-2 ${isExp ? 'bg-rose-50' : ''}`}
                                  >
                                    <div>
                                      <div className="font-bold text-[10px]">BATCH {b.batch_no}</div>
                                      <div className={`text-[9px] ${isExp ? 'text-rose-600' : 'text-slate-400'}`}>
                                        EXP {safeFormat(b.expiry_date, 'MM/yy')}
                                      </div>
                                    </div>
                                    <div className="text-right tabular-nums text-[10px]">
                                      <div className="flex justify-end items-center gap-0.5">
                                        <span className="text-slate-500">₹</span>
                                        <span>{Number(b.sale_rate ?? 0).toFixed(2)}</span>
                                      </div>
                                      <div className="text-[9px] text-slate-400">STK {Number.isFinite(stock) ? stock : 0}</div>
                                    </div>
                                  </button>
                                )
                              })
                            ) : (
                              <div className="p-2 text-center text-[10px] text-rose-600">No batches</div>
                            )
                          ) : pResults.length > 0 ? (
                            pResults.map((m) => {
                              const medBatches = batches.filter((b) => b.medicine === m.id)
                              const stockSum = medBatches.reduce((s, b) => s + (Number(b.quantity) || 0), 0)
                              return (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setBResults(medBatches)
                                    setPResults([])
                                    setShowBatchSelect(true)
                                    setPSearch(m.name)
                                  }}
                                  className="w-full text-left px-2 py-1 hover:bg-blue-50 flex justify-between"
                                >
                                  <div>
                                    <div className="font-bold text-[10px] uppercase">{m.name}</div>
                                    <div className="text-[9px] text-slate-400">{m.pack_info}</div>
                                  </div>
                                  <div className="text-[10px] font-mono tabular-nums">STK {stockSum}</div>
                                </button>
                              )
                            })
                          ) : (
                            <div className="p-2 text-center text-[10px]">
                              <button type="button" onClick={() => setShowAddMedicine(true)} className="text-blue-600 font-medium">
                                + Add medicine master
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="px-0.5 py-1 text-center text-slate-600 font-mono text-[10px] tabular-nums truncate border-r border-slate-100 flex items-center justify-center">
                  {row.batch?.batch_no ?? '—'}
                </div>
                <div
                  className={`px-0.5 py-1 text-center font-mono text-[10px] tabular-nums border-r border-slate-100 flex items-center justify-center ${
                    row.batch?.expiry_date && new Date(row.batch.expiry_date) < new Date()
                      ? 'text-rose-600 bg-rose-50'
                      : 'text-slate-500'
                  }`}
                >
                  {safeFormat(row.batch?.expiry_date, 'MM/yy')}
                </div>
                <div className={CELL_INP_WRAP}>
                  <input
                    ref={(el) => {
                      if (el) qtyRefs.current[row.id] = el
                      else delete qtyRefs.current[row.id]
                    }}
                    autoFocus={activeRow === idx && activeField === 'qty'}
                    onFocus={() => {
                      setActiveRow(idx)
                      setActiveField('qty')
                    }}
                    type="number"
                    value={row.qty || ''}
                    onChange={(e) => updateRowById(row.id, 'qty', Number(e.target.value))}
                    onKeyDown={(e) => handleRowEnter(e, row.id, 'qty')}
                    className={INP_NUM}
                  />
                </div>
                <div className={CELL_INP_WRAP}>
                  <input
                    ref={(el) => {
                      if (el) rateRefs.current[row.id] = el
                      else delete rateRefs.current[row.id]
                    }}
                    autoFocus={activeRow === idx && activeField === 'rate'}
                    onFocus={() => {
                      setActiveRow(idx)
                      setActiveField('rate')
                    }}
                    type="number"
                    value={row.rate || ''}
                    onChange={(e) => updateRowById(row.id, 'rate', Number(e.target.value))}
                    onKeyDown={(e) => handleRowEnter(e, row.id, 'rate')}
                    className={INP_NUM}
                  />
                </div>
                {gstEnabled ? (
                  <>
                    <div className={CELL_INP_WRAP}>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.gst_percent ?? ''}
                        onChange={(e) => patchRowById(row.id, { gst_percent: e.target.value })}
                        disabled={row.no_gst}
                        className={`${INP_NUM} max-w-full`}
                        placeholder="·"
                        title="Blank = product / outlet default"
                      />
                    </div>
                    <div className="px-0.5 border-r border-slate-100 flex items-center justify-center min-w-0">
                      <select
                        value={row.gst_type || 'exclusive'}
                        onChange={(e) => patchRowById(row.id, { gst_type: e.target.value })}
                        disabled={row.no_gst}
                        className="w-full max-w-full text-[8px] bg-transparent outline-none py-0.5 px-0.5 text-center"
                      >
                        <option value="exclusive">Ex</option>
                        <option value="inclusive">In</option>
                      </select>
                    </div>
                    <div className="px-0.5 border-r border-slate-100 flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={!!row.no_gst}
                        onChange={(e) => patchRowById(row.id, { no_gst: e.target.checked })}
                        title="No GST"
                        className="h-3 w-3"
                      />
                    </div>
                    <div className={`${CELL_NUM} text-[9px] text-slate-700`}>
                      {lineMarg[idx] ? lineMarg[idx].taxableAmount.toFixed(2) : ''}
                    </div>
                    <div className="px-0.5 text-right tabular-nums border-r border-slate-100 flex flex-col items-end justify-center leading-tight min-w-0 text-[7px] text-slate-700">
                      {lineMarg[idx] && lineMarg[idx].gstAmount > 0 ? (
                        <>
                          <span className="text-[9px] tabular-nums">{lineMarg[idx].gstAmount.toFixed(2)}</span>
                          <span className="text-slate-400 truncate text-right w-full">
                            C {lineMarg[idx].cgst.toFixed(2)} · S {lineMarg[idx].sgst.toFixed(2)}
                          </span>
                        </>
                      ) : lineMarg[idx] && lineMarg[idx].taxableAmount > 0 ? (
                        <span className="text-[9px] tabular-nums">0</span>
                      ) : null}
                    </div>
                    <RupeesCell value={lineMarg[idx]?.finalAmount} />
                  </>
                ) : (
                  <RupeesCell value={lineMarg[idx]?.finalAmount} />
                )}
                <div className="flex items-center justify-center border-l border-slate-100/0">
                  {row.medicine && (
                    <button
                      type="button"
                      onClick={() => clearRowByIdAndNormalize(row.id, setRows, setActiveRow)}
                      className="p-0.5 text-slate-300 hover:text-rose-500"
                      title="Remove line"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-64 flex flex-col gap-2 shrink-0 min-h-0">
        <div className="bg-white border border-slate-200 rounded p-3 flex flex-col gap-3 sticky top-0 z-10">
          <div className="text-[10px] font-bold text-slate-500 uppercase">Summary</div>
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600">Items</span>
              <span className="font-semibold tabular-nums">{rows.filter((r) => r.medicine).length}</span>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-slate-600">{gstEnabled ? 'Taxable' : 'Subtotal'}</span>
              <div className="flex justify-end items-center gap-1 min-w-0">
                <span className="text-slate-500 shrink-0">₹</span>
                <span className="tabular-nums font-medium">{taxableSubtotal.toFixed(2)}</span>
              </div>
            </div>
            {gstEnabled ? (
              <>
                <div className="flex justify-between items-baseline text-[10px] gap-2">
                  <span className="text-slate-600">CGST</span>
                  <div className="flex justify-end items-center gap-1">
                    <span className="text-slate-500">₹</span>
                    <span className="tabular-nums">{cgst.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between items-baseline text-[10px] gap-2">
                  <span className="text-slate-600">SGST</span>
                  <div className="flex justify-end items-center gap-1">
                    <span className="text-slate-500">₹</span>
                    <span className="tabular-nums">{sgst.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1 gap-2">
                  <span className="text-slate-600">GST total</span>
                  <div className="flex justify-end items-center gap-1">
                    <span className="text-slate-500">₹</span>
                    <span className="tabular-nums">{gst.toFixed(2)}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex justify-between border-b border-slate-100 pb-1 text-[10px] text-slate-500">
                <span>Non-GST bill</span>
                <span>No tax</span>
              </div>
            )}
            <div className="flex justify-end items-center gap-1 text-lg font-bold text-slate-900">
              <span className="text-slate-600 text-base font-semibold">₹</span>
              <span className="tabular-nums">{Math.round(grandTotal)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSave}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-xs font-semibold"
          >
            Save & Print (F10)
          </button>
          <button
            type="button"
            onClick={() => setRows(normalizeRows(Array.from({ length: MIN_ROWS }, () => createNewRow()), createNewRow))}
            className="w-full border border-slate-200 py-1.5 rounded text-[11px] text-slate-600"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}

const ErpBillingView = memo(ErpBillingViewInner)
export default ErpBillingView
