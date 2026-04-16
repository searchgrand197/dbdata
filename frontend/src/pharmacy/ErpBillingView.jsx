import React, { memo, useCallback, useMemo, useRef, useState } from 'react'
import { Search, Trash2 } from 'lucide-react'
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
import { computeBaseQtyFromPacksLoose, expiryBadgeClass, expiryMeta } from './billingUtils'

const MIN_ROWS = 5
const TAIL_EMPTY = 1

function newBillingRowId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `br-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

/** # | Product | Batch | HSN | PACK | EXP | MRP | Pack | Loose | Rate | Disc | GST | Margin | Amount | Del */
const GRID_BILL =
  'grid-cols-[1.25rem_minmax(0,2fr)_1.1fr_0.9fr_0.9fr_0.9fr_0.9fr_0.8fr_0.8fr_0.9fr_0.8fr_0.8fr_0.9fr_1fr_1.25rem]'

const INP_NUM = 'w-full min-w-0 bg-transparent text-right tabular-nums text-[11px] outline-none py-1 px-1'
const CELL_NUM = 'px-0.5 text-right tabular-nums border-r border-slate-100 flex items-center justify-end min-w-0'
const CELL_INP_WRAP = 'px-0.5 border-r border-slate-100 flex items-center justify-end min-w-0'

const RupeesCell = memo(function RupeesCell({ value }) {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return (
    <div className={`${CELL_NUM} font-semibold text-slate-900`}>
      <div className="flex w-full justify-end items-center gap-0.5">
        <span className="text-slate-500 shrink-0 text-[8px]">₹</span>
        <span className="tabular-nums text-[9px]">{n.toFixed(2)}</span>
      </div>
    </div>
  )
})

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
    packs: '',
    loose: '',
    pack_size: 1,
    qty: 0,
    rate: 0,
    amount: 0,
    hsn: '',
    pack: '',
    gst_percent: '',
    gst_type: 'exclusive',
    no_gst: false,
    line_discount: 0,
    expiry_status: null,
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

function rowExpiryStatus(row) {
  if (row.expiry_status) return row.expiry_status
  return expiryMeta(row.batch?.expiry_date).status
}

const SearchHitRow = memo(function SearchHitRow({ pick, disabled, onPick }) {
  const st = pick.expiry_status
  const badge =
    st === 'expired' ? (
      <span className="text-[7px] font-bold px-1 py-0.5 rounded border bg-rose-100 text-rose-800 border-rose-200">EXP</span>
    ) : st === 'expiring' ? (
      <span className="text-[7px] font-bold px-1 py-0.5 rounded border bg-amber-100 text-amber-900 border-amber-200">60d</span>
    ) : (
      <span className="text-[7px] text-slate-300">·</span>
    )
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(pick)}
      className={`w-full text-left px-3 py-2 hover:bg-blue-50 hover:border-l-2 hover:border-l-blue-500 flex gap-2 items-start border-b border-slate-100 transition-colors ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-[12px] uppercase text-slate-900 truncate">{pick.medicine.name}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-600">
          <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">Batch {pick.batch.batch_no}</span>
          <span className="font-medium">Exp {safeFormat(pick.batch.expiry_date, 'MM/yy')}</span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        {badge}
        <span className="text-[10px] tabular-nums text-slate-700">Stock {Number(pick.batch.stock).toFixed(0)}</span>
        <span className="text-[12px] font-semibold tabular-nums text-blue-700">₹{Number(pick.batch.sale_rate).toFixed(2)}</span>
      </div>
    </button>
  )
})

function ErpBillingViewInner({
  medicines: _medicines,
  batches: _batches,
  setInvoices,
  setPrintingInvoice,
  setShowAddMedicine,
  setShowAddPatient,
  fetchInitialData,
  selectedPt,
  setSelectedPt,
  outletSettings,
}) {
  const now = new Date()
  const defaultInvoiceDate = format(now, 'yyyy-MM-dd')
  const defaultInvoiceTime = format(now, 'HH:mm')
  const [rows, setRows] = useState(() => normalizeRows(Array.from({ length: MIN_ROWS }, () => createNewRow()), createNewRow))
  const [activeRow, setActiveRow] = useState(0)
  const [activeField, setActiveField] = useState('product')
  const [ptSearch, setPtSearch] = useState('')
  const debouncedPtSearch = useDebouncedValue(ptSearch, 320)
  const [ptResults, setPtResults] = useState([])
  const [pSearch, setPSearch] = useState('')
  const debouncedPSearch = useDebouncedValue(pSearch, 260)
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [gstEnabled, setGstEnabled] = useState(false)
  const [invoiceNo, setInvoiceNo] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(defaultInvoiceDate)
  const [invoiceTime, setInvoiceTime] = useState(defaultInvoiceTime)
  const [allowExpiredSale, setAllowExpiredSale] = useState(false)

  const productRefs = useRef({})
  const packRefs = useRef({})
  const looseRefs = useRef({})
  const rateRefs = useRef({})
  const discRefs = useRef({})
  const gstRefs = useRef({})

  const refreshInvoiceNo = useCallback(() => {
    api
      .get('/pharmacy/invoice/next-number/')
      .then((res) => {
        const d = res.data?.data ?? res.data
        setInvoiceNo(d?.invoice_no || '')
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    refreshInvoiceNo()
  }, [refreshInvoiceNo])

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
    if (debouncedPSearch.length < 2) {
      setSearchResults([])
      return
    }
    let cancelled = false
    setSearchLoading(true)
    api
      .get('/medicines/search/', { params: { q: debouncedPSearch } })
      .then((res) => {
        if (cancelled) return
        const raw = res.data?.data ?? res.data
        setSearchResults(Array.isArray(raw) ? raw : [])
      })
      .catch(() => {
        if (!cancelled) setSearchResults([])
      })
      .finally(() => {
        if (!cancelled) setSearchLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [debouncedPSearch])

  const defaultGst = parseOutletDefaultGstPercent(outletSettings?.default_gst_percent)

  const patchRowById = useCallback((rowId, partial) => {
    setRows((prev) => {
      const ix = prev.findIndex((r) => r.id === rowId)
      if (ix < 0) return prev
      const merged = { ...prev[ix], ...partial }
      if (Number(merged.pack_size) <= 1) {
        merged.loose = ''
      }
      if ('packs' in partial || 'loose' in partial || 'pack_size' in partial) {
        merged.qty = computeBaseQtyFromPacksLoose(merged.packs, merged.loose, merged.pack_size)
      }
      const nr = [...prev]
      nr[ix] = merged
      return normalizeRows(nr, createNewRow)
    })
  }, [])

  const updateRowById = useCallback(
    (rowId, field, value) => {
      patchRowById(rowId, { [field]: value })
    },
    [patchRowById],
  )

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

  const applySearchPick = useCallback((rowId, pick) => {
    const batchId = pick.batch.id
    setRows((prev) => {
      if (prev.some((r) => r.id !== rowId && String(r.batch?.id) === String(batchId))) {
        toast.error('This batch is already on the bill')
        return prev
      }
      const m = {
        id: pick.medicine.id,
        name: pick.medicine.name,
        sku: pick.medicine.sku,
        pack_info: pick.medicine.pack_info,
        hsn_code: pick.medicine.hsn_code,
        gst_percent: pick.medicine.gst_percent,
        unit_conversions: pick.medicine.unit_conversions,
        unit_name: pick.medicine.unit_name,
      }
      const b = {
        id: pick.batch.id,
        medicine: m.id,
        batch_no: pick.batch.batch_no,
        expiry_date: pick.batch.expiry_date,
        mrp: pick.batch.mrp,
        sale_rate: pick.batch.sale_rate,
        quantity: pick.batch.stock,
      }
      const ix = prev.findIndex((r) => r.id === rowId)
      if (ix < 0) return prev
      const packSize = Math.max(1, Number(pick.medicine.pack_size) || 1)
      const merged = {
        ...prev[ix],
        medicine: m,
        batch: b,
        packs: '',
        loose: '',
        pack_size: packSize,
        qty: 0,
        expiry_status: pick.expiry_status,
        hsn: m.hsn_code,
        pack: m.pack_info,
        rate: Number(b.sale_rate) || 0,
        gst_percent: m.gst_percent !== undefined && m.gst_percent !== null ? String(m.gst_percent) : '',
      }
      const nr = [...prev]
      nr[ix] = merged
      return normalizeRows(nr, createNewRow)
    })
    setPSearch('')
    setSearchResults([])
    setTimeout(() => packRefs.current[rowId]?.focus(), 50)
  }, [])

  function handleRowEnter(e, rowId, field) {
    const idx = rows.findIndex((r) => r.id === rowId)
    if (idx < 0) return
    if (e.key === 'Enter') {
      e.preventDefault()
      if (field === 'product') {
        const first =
          searchResults.find((p) => !(p.expiry_status === 'expired' && !allowExpiredSale)) ?? null
        if (first) applySearchPick(rowId, first)
      } else if (field === 'packs') {
        const row = rows[idx]
        if ((Number(row?.pack_size) || 1) <= 1) {
          setTimeout(() => rateRefs.current[rowId]?.focus(), 40)
        } else {
          setTimeout(() => looseRefs.current[rowId]?.focus(), 40)
        }
      } else if (field === 'loose') {
        setTimeout(() => rateRefs.current[rowId]?.focus(), 40)
      } else if (field === 'rate') {
        setTimeout(() => discRefs.current[rowId]?.focus(), 40)
      } else if (field === 'disc') {
        setTimeout(() => gstRefs.current[rowId]?.focus(), 40)
      } else if (field === 'gst') {
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
        invoice_no: invoiceNo || undefined,
        date: invoiceDate || undefined,
        gst_enabled: gstEnabled,
        subtotal: taxableSubtotal.toFixed(2),
        cgst: cgst.toFixed(2),
        sgst: sgst.toFixed(2),
        grand_total: grandTotal.toFixed(2),
        status: 'finalized',
      })
      const invoice = invData?.data || invData
      const allowQ = allowExpiredSale ? { allow_expired: '1' } : {}
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
          return api.post(
            '/pharmacy/items/',
            {
              invoice: invoice.id,
              medicine: r.medicine.id,
              batch: r.batch.id,
              qty: r.qty,
              mrp: r.batch?.mrp ?? 0,
              rate: r.rate,
              amount: marg.taxableAmount.toFixed(2),
              cgst_rate: half.toFixed(2),
              sgst_rate: half.toFixed(2),
            },
            { params: allowQ },
          )
        }),
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
      refreshInvoiceNo()
      toast.success('Invoice Generated')
    } catch (err) {
      toast.error(parseApiError(err))
    }
  }

  return (
    <div className="h-full flex gap-2 overflow-hidden min-h-0 min-w-0 text-[14px]">
      <div className="flex-1 flex flex-col gap-2 min-w-0 min-h-0 overflow-hidden">
        <div className="bg-white border border-slate-200 px-2 py-1.5 rounded flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <div className="min-w-0 flex-1 max-w-md">
              <p className="text-[8px] font-bold text-slate-500 uppercase mb-0.5">Patient</p>
              {selectedPt ? (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                  <span className="truncate text-blue-800">
                    {selectedPt.first_name} {selectedPt.last_name} ({selectedPt.uhid})
                  </span>
                  <button type="button" onClick={() => setSelectedPt(null)} className="text-blue-500 shrink-0 ml-1">
                    ×
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                  <input
                    type="text"
                    placeholder="NAME / UHID / MOBILE"
                    value={ptSearch}
                    onChange={(e) => setPtSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 pl-7 pr-2 py-0.5 rounded text-[11px] font-medium focus:bg-white focus:border-blue-500 outline-none uppercase"
                  />
                  {ptSearch.length > 2 && (
                    <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-slate-200 shadow-lg z-50 max-h-40 overflow-y-auto text-left">
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
                            className="w-full text-left px-2 py-1 hover:bg-slate-50 text-[11px]"
                          >
                            <div className="font-semibold text-slate-900">
                              {p.first_name} {p.last_name}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {p.phone} | {p.uhid}
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="p-2 text-center text-[10px] text-slate-600">
                          <button type="button" onClick={() => setShowAddPatient(true)} className="text-blue-600 font-medium">
                            + Add patient
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="shrink-0 border border-slate-200 rounded px-2 py-1 bg-slate-50">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Bill #</p>
              <p className="text-[11px] font-mono font-bold text-slate-900 leading-tight">{invoiceNo || '—'}</p>
            </div>
            <div className="shrink-0 border border-slate-200 rounded px-2 py-1 bg-slate-50 min-w-[146px]">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Invoice Date</p>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="mt-0.5 w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
              />
            </div>
            <div className="shrink-0 border border-slate-200 rounded px-2 py-1 bg-slate-50 min-w-[112px]">
              <p className="text-[8px] font-bold text-slate-500 uppercase">Invoice Time</p>
              <input
                type="time"
                value={invoiceTime}
                onChange={(e) => setInvoiceTime(e.target.value)}
                className="mt-0.5 w-full bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <label className="flex items-center gap-1 text-[8px] text-slate-600 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={allowExpiredSale} onChange={(e) => setAllowExpiredSale(e.target.checked)} />
              Sell expired
            </label>
            <div className="flex rounded border border-slate-200 overflow-hidden text-[8px] font-bold uppercase">
              <button
                type="button"
                onClick={() => setGstEnabled(true)}
                className={`px-1.5 py-0.5 ${gstEnabled ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}
              >
                GST
              </button>
              <button
                type="button"
                onClick={() => setGstEnabled(false)}
                className={`px-1.5 py-0.5 border-l border-slate-200 ${!gstEnabled ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}
              >
                Non-GST
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAddMedicine(true)}
              className="bg-blue-600 text-white px-2 py-0.5 rounded text-[9px] font-semibold"
            >
              + Medicine
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 bg-white border border-slate-200 rounded overflow-hidden min-w-0">
          <div className="overflow-x-hidden overflow-y-auto flex-1 min-h-0 min-w-0">
            <div
              className={`grid ${GRID_BILL} gap-0 text-[11px] font-bold text-slate-600 bg-slate-100 border-b border-slate-200 px-0.5 py-1 sticky top-0 z-20 min-w-0`}
            >
              <span className="text-center tabular-nums">#</span>
              <span>Product Name</span>
              <span className="text-center">Batch</span>
              <span className="text-center">HSN/SAC</span>
              <span className="text-center">PACK</span>
              <span className="text-center">Expiry</span>
              <span className="text-right pr-0.5">MRP</span>
              <span className="text-right pr-0.5">Qty/Pack</span>
              <span className="text-right pr-0.5">Loose</span>
              <span className="text-right pr-0.5">Rate</span>
              <span className="text-right pr-0.5">Disc</span>
              <span className={`text-right pr-0.5 ${gstEnabled ? '' : 'text-slate-300'}`}>GST</span>
              <span className="text-right pr-0.5">Margin</span>
              <span className="text-right pr-0.5">Amount</span>
              <span />
            </div>

            <div className="divide-y divide-slate-100 min-w-0">
              {rows.map((row, idx) => {
                const expSt = rowExpiryStatus(row)
                const badgeCls = expiryBadgeClass(expSt)
                const isSingleUnitPack = (Number(row.pack_size) || 1) <= 1
                return (
                  <div
                    key={row.id}
                    className={`grid ${GRID_BILL} gap-0 items-stretch text-[11px] min-h-[38px] min-w-0 ${
                      activeRow === idx ? 'bg-blue-50/60' : idx % 2 ? 'bg-slate-50/30' : ''
                    }`}
                  >
                    <span className="flex items-center justify-center text-slate-400 tabular-nums">{idx + 1}</span>

                    <div className="px-0.5 py-0.5 border-r border-slate-100 min-w-0">
                      {row.medicine ? (
                        <div className="flex flex-col min-w-0 gap-0.5">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="font-semibold text-slate-900 uppercase truncate text-[11px]">{row.medicine.name}</span>
                            {expSt === 'expired' && (
                              <span className="shrink-0 text-[6px] font-bold px-1 rounded bg-rose-600 text-white">EXPIRED</span>
                            )}
                            {expSt === 'expiring' && (
                              <span className="shrink-0 text-[6px] font-bold px-1 rounded bg-amber-500 text-white">EXP</span>
                            )}
                          </div>
                          <span className="text-[7px] text-slate-400 truncate">
                            {row.medicine.pack_info} | {row.medicine.hsn_code}
                          </span>
                        </div>
                      ) : (
                        <div className="relative min-h-[22px]">
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
                            className="w-full min-w-0 bg-transparent outline-none uppercase font-semibold text-slate-900 placeholder:text-slate-300 text-[11px] px-1"
                          />
                          {activeRow === idx && pSearch.length >= 2 && (
                            <div className="absolute top-full left-0 mt-0.5 w-[min(100vw-1.5rem,22rem)] max-w-[90vw] bg-white border border-slate-200 shadow-xl z-[60] max-h-48 overflow-y-auto rounded">
                              {searchLoading && <div className="p-2 text-[9px] text-slate-400">Searching…</div>}
                              {!searchLoading && searchResults.length === 0 && (
                                <div className="p-2 text-center text-[9px]">
                                  <button type="button" onClick={() => setShowAddMedicine(true)} className="text-blue-600 font-medium">
                                    + Add medicine
                                  </button>
                                </div>
                              )}
                              {!searchLoading &&
                                searchResults.map((pick, j) => {
                                  const dis = pick.expiry_status === 'expired' && !allowExpiredSale
                                  return <SearchHitRow key={`${pick.batch.id}-${j}`} pick={pick} disabled={dis} onPick={(p) => applySearchPick(row.id, p)} />
                                })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="px-0.5 py-0.5 text-center text-slate-600 font-mono text-[8px] tabular-nums truncate border-r border-slate-100 flex items-center justify-center">
                      {row.batch?.batch_no ?? '—'}
                    </div>
                    <div className="px-0.5 py-0.5 text-center font-mono text-[10px] tabular-nums border-r border-slate-100 flex items-center justify-center text-slate-600">
                      {row.hsn || row.medicine?.hsn_code || '—'}
                    </div>
                    <div className="px-0.5 py-0.5 text-center text-[10px] tabular-nums border-r border-slate-100 flex items-center justify-center text-slate-600">
                      {row.pack || row.medicine?.pack_info || '—'}
                    </div>
                    <div
                      className={`px-0.5 py-0.5 text-center font-mono text-[10px] tabular-nums border-r border-slate-100 flex items-center justify-center ${
                        expSt === 'expired' ? 'text-rose-700 bg-rose-50' : expSt === 'expiring' ? 'text-amber-800 bg-amber-50/80' : 'text-slate-500'
                      }`}
                    >
                      {safeFormat(row.batch?.expiry_date, 'MM/yy')}
                    </div>
                    <div className={`${CELL_NUM} text-[10px] text-slate-700`}>
                      {row.batch?.mrp != null ? Number(row.batch.mrp).toFixed(2) : ''}
                    </div>
                    <div className={CELL_INP_WRAP}>
                      <input
                        ref={(el) => {
                          if (el) packRefs.current[row.id] = el
                          else delete packRefs.current[row.id]
                        }}
                        disabled={!row.medicine}
                        autoFocus={activeRow === idx && activeField === 'packs'}
                        onFocus={() => {
                          setActiveRow(idx)
                          setActiveField('packs')
                        }}
                        inputMode="numeric"
                        value={row.packs}
                        onChange={(e) => patchRowById(row.id, { packs: e.target.value.replace(/\D/g, '') })}
                        onKeyDown={(e) => handleRowEnter(e, row.id, 'packs')}
                        className={INP_NUM}
                        title={isSingleUnitPack ? 'Quantity' : 'Packs (integer)'}
                        placeholder={isSingleUnitPack ? 'Qty' : 'Pack'}
                      />
                    </div>
                    <div className={CELL_INP_WRAP}>
                      {isSingleUnitPack ? (
                        <div className="w-full h-full min-h-[28px] flex items-center justify-center rounded bg-slate-200 text-slate-700 font-semibold select-none">
                          -
                        </div>
                      ) : (
                        <input
                          ref={(el) => {
                            if (el) looseRefs.current[row.id] = el
                            else delete looseRefs.current[row.id]
                          }}
                          disabled={!row.medicine}
                          onFocus={() => {
                            setActiveRow(idx)
                            setActiveField('loose')
                          }}
                          inputMode="decimal"
                          value={row.loose}
                          onChange={(e) => patchRowById(row.id, { loose: e.target.value })}
                          onKeyDown={(e) => handleRowEnter(e, row.id, 'loose')}
                          className={INP_NUM}
                          title="Loose units"
                        />
                      )}
                    </div>
                    <div className={CELL_INP_WRAP}>
                      <input
                        ref={(el) => {
                          if (el) rateRefs.current[row.id] = el
                          else delete rateRefs.current[row.id]
                        }}
                        disabled={!row.medicine}
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
                    <div className={CELL_INP_WRAP}>
                      <input
                        ref={(el) => {
                          if (el) discRefs.current[row.id] = el
                          else delete discRefs.current[row.id]
                        }}
                        disabled={!row.medicine}
                        type="number"
                        value={row.line_discount || ''}
                        onChange={(e) => patchRowById(row.id, { line_discount: Number(e.target.value) || 0 })}
                        onKeyDown={(e) => handleRowEnter(e, row.id, 'disc')}
                        className={INP_NUM}
                      />
                    </div>
                    <div className={CELL_INP_WRAP}>
                      <input
                        ref={(el) => {
                          if (el) gstRefs.current[row.id] = el
                          else delete gstRefs.current[row.id]
                        }}
                        type="text"
                        inputMode="decimal"
                        value={gstEnabled ? (row.gst_percent ?? '') : ''}
                        onChange={(e) => patchRowById(row.id, { gst_percent: e.target.value })}
                        disabled={!gstEnabled || row.no_gst}
                        onKeyDown={(e) => handleRowEnter(e, row.id, 'gst')}
                        className={`${INP_NUM} max-w-full`}
                        placeholder={gstEnabled ? '·' : '-'}
                      />
                    </div>
                    <div className={`${CELL_NUM} text-[10px] text-slate-700`}>
                      {row.batch && row.qty
                        ? ((Number(row.batch?.mrp || 0) - Number(row.rate || 0)) * Number(row.qty || 0)).toFixed(2)
                        : ''}
                    </div>
                    <RupeesCell value={lineMarg[idx]?.finalAmount} />
                    <div className="flex items-center justify-center">
                      {row.medicine && (
                        <button
                          type="button"
                          onClick={() => clearRowByIdAndNormalize(row.id, setRows, setActiveRow)}
                          className="p-0.5 text-slate-300 hover:text-rose-500"
                          title="Remove line"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="w-64 flex flex-col gap-2 shrink-0 min-h-0">
        <div className="bg-white border border-slate-200 rounded p-2 flex flex-col gap-2 sticky top-0 z-10">
          <div className="text-xs font-bold text-slate-500 uppercase">Summary</div>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-600">Items</span>
              <span className="font-semibold tabular-nums">{rows.filter((r) => r.medicine).length}</span>
            </div>
            <div className="flex justify-between items-baseline gap-2">
              <span className="text-slate-600">{gstEnabled ? 'Taxable' : 'Subtotal'}</span>
              <div className="flex justify-end items-center gap-0.5 min-w-0">
                <span className="text-slate-500 shrink-0 text-[9px]">₹</span>
                <span className="tabular-nums font-medium">{taxableSubtotal.toFixed(2)}</span>
              </div>
            </div>
            {gstEnabled ? (
              <>
                <div className="flex justify-between text-[9px] gap-2">
                  <span className="text-slate-600">CGST</span>
                  <span className="tabular-nums">₹{cgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[9px] gap-2">
                  <span className="text-slate-600">SGST</span>
                  <span className="tabular-nums">₹{sgst.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1 text-[9px] gap-2">
                  <span className="text-slate-600">GST</span>
                  <span className="tabular-nums">₹{gst.toFixed(2)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between border-b border-slate-100 pb-1 text-[9px] text-slate-500">
                <span>Non-GST</span>
                <span>No tax</span>
              </div>
            )}
            <div className="flex justify-end items-center gap-0.5 text-xl font-bold text-slate-900">
              <span className="text-slate-600 text-base font-semibold">₹</span>
              <span className="tabular-nums">{Math.round(grandTotal)}</span>
            </div>
          </div>
          <button type="button" onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold">
            Save & Print
          </button>
          <button
            type="button"
            onClick={() => setRows(normalizeRows(Array.from({ length: MIN_ROWS }, () => createNewRow()), createNewRow))}
            className="w-full border border-slate-200 py-1.5 rounded text-sm text-slate-600"
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
