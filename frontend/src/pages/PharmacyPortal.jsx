import React, { useCallback, useEffect, useState } from 'react'
import {
  ShoppingBag,
  Search,
  Plus,
  LogOut,
  X,
  Settings,
  FileText,
  UserPlus,
  Package,
  Truck,
  Eye,
  PencilLine,
  SlidersHorizontal,
} from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import ErpBillingView from '../pharmacy/ErpBillingView'
import PharmacyInvoicePrint from '../pharmacy/PharmacyInvoicePrint'
import SettingsPanel from '../pharmacy/SettingsPanel'
import PurchaseChallanPanel from '../pharmacy/PurchaseChallanPanel'
import PurchaseHistoryDashboard from '../pharmacy/PurchaseHistoryDashboard'
import { formatStripsAndTablets, parseApiError } from '../pharmacy/pharmacyCalculations'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo })
    console.error('ErrorBoundary', error, errorInfo)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: '#ffebee', color: '#c62828' }}>
          <h2>Something went wrong in {this.props.componentName || 'a component'}.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      )
    }
    return this.props.children
  }
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

export default function PharmacyPortal() {
  const [view, setView] = useState('billing')
  const [medicines, setMedicines] = useState([])
  const [batches, setBatches] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [printingInvoice, setPrintingInvoice] = useState(null)
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [showAddPatient, setShowAddPatient] = useState(false)
  const [outletSettings, setOutletSettings] = useState(null)
  const [billingPatient, setBillingPatient] = useState(null)
  const [purchaseSubView, setPurchaseSubView] = useState('entry')

  const fetchInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const [mResp, bResp, iResp, sResp] = await Promise.all([
        api.get('/medicines/?limit=1000'),
        api.get('/batches/?limit=1000'),
        api.get('/pharmacy/invoices/?limit=100'),
        api.get('/pharmacy/settings/').catch(() => ({ data: null })),
      ])
      setMedicines(mResp.data?.data || mResp.data?.results || [])
      setBatches(bResp.data?.data || bResp.data?.results || [])
      setInvoices(iResp.data?.data || iResp.data?.results || [])
      const rawS = sResp.data
      const sd =
        rawS && typeof rawS === 'object' && 'business_name' in rawS ? rawS : rawS?.data ?? rawS?.entity
      if (sd) setOutletSettings(sd)
    } catch {
      toast.error('Failed to load pharmacy data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchInitialData()
  }, [fetchInitialData])

  function handleLogout() {
    localStorage.clear()
    window.location.href = '/login'
  }

  const brand = outletSettings?.business_name?.trim() || 'Pharmacy'

  return (
    <div className="h-screen w-screen flex bg-slate-50 text-slate-900 font-sans overflow-hidden text-[13px]">
      <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="px-3 py-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
              Rx
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-bold text-slate-800 truncate leading-tight">{brand}</h1>
              <p className="text-[10px] text-slate-500">ERP</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-2 flex flex-col gap-0.5">
          {[
            { id: 'billing', label: 'Sales', icon: ShoppingBag },
            { id: 'purchase', label: 'Purchase', icon: Truck },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'history', label: 'Register', icon: FileText },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setView(item.id)
                if (item.id !== 'purchase') setPurchaseSubView('entry')
              }}
              className={`flex items-center gap-2 px-3 py-2 text-xs font-medium border-l-4 ${
                view === item.id
                  ? 'bg-blue-50 text-blue-700 border-blue-600'
                  : 'text-slate-600 border-transparent hover:bg-slate-50'
              }`}
            >
              <item.icon size={16} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-200">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-600 hover:text-rose-600 text-xs font-medium"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <header className="h-10 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
          <span className="text-[10px] font-medium text-slate-500">Terminal · Pharmacy desk</span>
          <span className="text-[10px] text-slate-400">v3.2</span>
        </header>

        <main className="flex-1 overflow-hidden p-3 min-h-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading…</div>
          ) : (
            <>
              <ErrorBoundary componentName="ErpBillingView">
                {view === 'billing' && (
                  <ErpBillingView
                    medicines={medicines}
                    batches={batches}
                    setInvoices={setInvoices}
                    setPrintingInvoice={setPrintingInvoice}
                    setShowAddMedicine={setShowAddMedicine}
                    setShowAddPatient={setShowAddPatient}
                    fetchInitialData={fetchInitialData}
                    selectedPt={billingPatient}
                    setSelectedPt={setBillingPatient}
                    outletSettings={outletSettings}
                  />
                )}
              </ErrorBoundary>
              {view === 'purchase' && (
                <div className="h-full flex flex-col gap-2 min-h-0">
                  <div className="shrink-0 flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
                    <button
                      type="button"
                      onClick={() => setPurchaseSubView('entry')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold ${
                        purchaseSubView === 'entry' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      New challan
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchaseSubView('history')}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-bold ${
                        purchaseSubView === 'history' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Purchase history
                    </button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-hidden">
                    {purchaseSubView === 'entry' ? (
                      <PurchaseChallanPanel onPosted={fetchInitialData} outletSettings={outletSettings} />
                    ) : (
                      <PurchaseHistoryDashboard />
                    )}
                  </div>
                </div>
              )}
              <ErrorBoundary componentName="InventoryView">
                {view === 'inventory' && (
                  <InventoryView
                    medicines={medicines}
                    batches={batches}
                    setShowAddMedicine={setShowAddMedicine}
                    fetchInitialData={fetchInitialData}
                  />
                )}
              </ErrorBoundary>
              <ErrorBoundary componentName="HistoryView">
                {view === 'history' && <HistoryView invoices={invoices} setPrintingInvoice={setPrintingInvoice} />}
              </ErrorBoundary>
              {view === 'settings' && (
                <SettingsPanel
                  onSaved={(f) => setOutletSettings((prev) => ({ ...prev, ...f }))}
                />
              )}
            </>
          )}
        </main>
      </div>

      {printingInvoice && (
        <PharmacyInvoicePrint
          invoice={printingInvoice}
          outlet={outletSettings}
          onClose={() => setPrintingInvoice(null)}
        />
      )}
      {showAddMedicine && (
        <AddMedicineModal
          onClose={() => setShowAddMedicine(false)}
          onRefresh={fetchInitialData}
          defaultGstPercent={outletSettings?.default_gst_percent}
        />
      )}
      {showAddPatient && (
        <AddPatientModal
          onClose={() => setShowAddPatient(false)}
          onAdd={(pt) => {
            const p = pt?.data || pt
            setBillingPatient(p)
            setShowAddPatient(false)
            toast.success('Patient selected for billing')
          }}
        />
      )}
    </div>
  )
}

const INV_ALLOW_NEG_KEY = 'pharmacy_inventory_allow_negative_stock'

function expiryRowClass(expiryDate) {
  if (!expiryDate) return 'text-slate-500'
  const d = new Date(expiryDate)
  if (Number.isNaN(d.getTime())) return 'text-slate-500'
  const days = (d.getTime() - Date.now()) / 86400000
  if (days < 0) return 'text-rose-600 font-semibold'
  if (days <= 90) return 'text-amber-700 font-medium'
  return 'text-slate-600'
}

function isLowStockRow(qty, stripSize) {
  const q = Number(qty) || 0
  const sp = Number(stripSize) || 0
  if (q <= 0) return true
  if (sp > 0) return q < sp * 2
  return q < 15
}

function InventoryView({ medicines, batches, setShowAddMedicine, fetchInitialData }) {
  const [q, setQ] = useState('')
  const [allowNegative, setAllowNegative] = useState(() => localStorage.getItem(INV_ALLOW_NEG_KEY) === '1')
  const [detailBatch, setDetailBatch] = useState(null)
  const [rateBatch, setRateBatch] = useState(null)
  const [adjustBatch, setAdjustBatch] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(INV_ALLOW_NEG_KEY, allowNegative ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [allowNegative])

  const filtered = batches.filter((b) => {
    const med = medicines.find((m) => m.id === b.medicine)
    const name = med?.name?.toLowerCase() ?? ''
    const bn = (b.batch_no ?? '').toLowerCase()
    return name.includes(q.toLowerCase()) || bn.includes(q.toLowerCase())
  })

  return (
    <div className="h-full flex flex-col gap-1.5 overflow-hidden min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <h2 className="text-sm font-bold text-slate-900">Inventory</h2>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-[9px] text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={allowNegative}
              onChange={(e) => setAllowNegative(e.target.checked)}
            />
            Allow negative stock (adjust)
          </label>
          <button
            type="button"
            onClick={() => setShowAddMedicine(true)}
            className="border border-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold"
          >
            + Medicine
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white border border-slate-200 rounded overflow-hidden flex flex-col min-h-0 min-w-0">
        <div className="px-2 py-1 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50 shrink-0">
          <Search size={12} className="text-slate-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / batch"
            className="flex-1 bg-transparent text-[11px] font-medium outline-none min-w-0"
          />
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <table className="w-full text-left text-[10px] table-fixed border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 font-bold text-slate-500 uppercase">
              <tr>
                <th className="px-1 py-1 w-[18%]">Product</th>
                <th className="px-1 py-1 w-[10%]">Batch</th>
                <th className="px-1 py-1 w-[8%]">Expiry</th>
                <th className="px-1 py-1 w-[16%]">Stock</th>
                <th className="px-1 py-1 w-[7%] text-right">MRP</th>
                <th className="px-1 py-1 w-[7%] text-right">Sale</th>
                <th className="px-1 py-1 w-[7%] text-right">Pur.</th>
                <th className="px-1 py-1 w-[14%] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => {
                const med = medicines.find((m) => m.id === b.medicine)
                const conv = med?.unit_conversions || {}
                const strip = Number(conv.strip ?? conv.STRIP) || 0
                const baseLabel = (med?.unit_name || 'tab').toLowerCase()
                const qty = Number(b.quantity ?? 0)
                const stockLabel = formatStripsAndTablets(qty, strip, baseLabel)
                const low = isLowStockRow(qty, strip)
                const expCls = expiryRowClass(b.expiry_date)
                return (
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-50/80 ${low ? 'bg-amber-50/60' : ''} ${qty < 0 ? 'bg-rose-50/70' : ''}`}
                  >
                    <td className="px-1 py-0.5 align-top min-w-0">
                      <div className="font-semibold text-slate-900 truncate" title={med?.name}>
                        {med?.name ?? '—'}
                      </div>
                      <div className="text-[9px] text-slate-400 truncate">{med?.pack_info}</div>
                    </td>
                    <td className="px-1 py-0.5 align-top min-w-0">
                      <span className="font-mono text-[9px] bg-slate-100 px-0.5 rounded inline-block max-w-full truncate" title={b.batch_no}>
                        {b.batch_no}
                      </span>
                    </td>
                    <td className={`px-1 py-0.5 align-top tabular-nums ${expCls}`}>{safeFormat(b.expiry_date, 'MM/yy')}</td>
                    <td className="px-1 py-0.5 align-top text-emerald-800 font-medium leading-tight break-words">
                      <div>{stockLabel}</div>
                      <div className="text-[8px] text-slate-400 font-mono tabular-nums">
                        {qty % 1 === 0 ? qty : qty.toFixed(2)} {baseLabel} (base)
                      </div>
                      {qty < 0 && <div className="text-[8px] text-rose-600 font-semibold">Below zero</div>}
                      {low && qty >= 0 && <div className="text-[8px] text-amber-700">Low stock</div>}
                    </td>
                    <td className="px-1 py-0.5 text-right tabular-nums text-slate-700">₹{Number(b.mrp ?? 0).toFixed(2)}</td>
                    <td className="px-1 py-0.5 text-right tabular-nums text-blue-700 font-semibold">₹{Number(b.sale_rate ?? 0).toFixed(2)}</td>
                    <td className="px-1 py-0.5 text-right tabular-nums text-slate-500">₹{Number(b.unit_cost ?? 0).toFixed(2)}</td>
                    <td className="px-0 py-0.5 align-top">
                      <div className="flex flex-wrap items-center justify-center gap-0.5">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => setDetailBatch({ batch: b, medicine: med })}
                          className="p-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          type="button"
                          title="Edit rate"
                          onClick={() => setRateBatch({ batch: b, medicine: med })}
                          className="p-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <PencilLine size={12} />
                        </button>
                        <button
                          type="button"
                          title="Adjust stock"
                          onClick={() => setAdjustBatch({ batch: b, medicine: med })}
                          className="p-0.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <SlidersHorizontal size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailBatch && (
        <InventoryBatchDetailModal
          batch={detailBatch.batch}
          medicine={detailBatch.medicine}
          onClose={() => setDetailBatch(null)}
        />
      )}
      {rateBatch && (
        <InventoryEditRateModal
          batch={rateBatch.batch}
          medicine={rateBatch.medicine}
          onClose={() => setRateBatch(null)}
          onSaved={() => {
            setRateBatch(null)
            fetchInitialData?.()
          }}
        />
      )}
      {adjustBatch && (
        <InventoryAdjustStockModal
          batch={adjustBatch.batch}
          medicine={adjustBatch.medicine}
          allowNegative={allowNegative}
          onClose={() => setAdjustBatch(null)}
          onSaved={() => {
            setAdjustBatch(null)
            fetchInitialData?.()
          }}
        />
      )}
    </div>
  )
}

function InventoryBatchDetailModal({ batch, medicine, onClose }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .get(`/stock-ledgers/?batch=${batch.id}&limit=40`)
      .then((res) => {
        const raw = res.data
        const list = Array.isArray(raw) ? raw : raw?.data ?? raw?.results ?? []
        if (!cancelled) setRows(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) setRows([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [batch.id])

  const conv = medicine?.unit_conversions || {}
  const strip = Number(conv.strip ?? conv.STRIP) || 0
  const baseLabel = (medicine?.unit_name || 'tab').toLowerCase()
  const qty = Number(batch.quantity ?? 0)

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[200] flex items-center justify-center p-4" onClick={onClose} role="presentation">
      <div
        className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col border border-slate-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Batch details"
      >
        <div className="px-3 py-2 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h3 className="text-xs font-bold text-slate-800">Batch details</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        <div className="p-3 overflow-y-auto text-[10px] space-y-2">
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1">
            <dt className="text-slate-500">Medicine</dt>
            <dd className="font-semibold text-slate-900">{medicine?.name ?? '—'}</dd>
            <dt className="text-slate-500">Batch</dt>
            <dd className="font-mono">{batch.batch_no}</dd>
            <dt className="text-slate-500">Expiry</dt>
            <dd className={expiryRowClass(batch.expiry_date)}>{safeFormat(batch.expiry_date, 'dd MMM yyyy')}</dd>
            <dt className="text-slate-500">Stock (base)</dt>
            <dd>
              {formatStripsAndTablets(qty, strip, baseLabel)}
              <span className="text-slate-400 ml-1 font-mono">
                ({qty % 1 === 0 ? qty : qty.toFixed(2)} {baseLabel})
              </span>
            </dd>
            <dt className="text-slate-500">MRP</dt>
            <dd className="tabular-nums">₹{Number(batch.mrp ?? 0).toFixed(2)}</dd>
            <dt className="text-slate-500">Sale rate</dt>
            <dd className="tabular-nums">₹{Number(batch.sale_rate ?? 0).toFixed(2)}</dd>
            <dt className="text-slate-500">Purchase (cost)</dt>
            <dd className="tabular-nums text-slate-600">₹{Number(batch.unit_cost ?? 0).toFixed(2)}</dd>
          </dl>
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Stock log (recent)</div>
            {loading && <div className="text-slate-400">Loading…</div>}
            {!loading && rows.length === 0 && <div className="text-slate-400">No ledger rows.</div>}
            {!loading && rows.length > 0 && (
              <ul className="space-y-1 max-h-40 overflow-y-auto">
                {rows.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2 border-b border-slate-50 pb-0.5">
                    <span className="text-slate-600 truncate">
                      {r.reason} {r.reference_id ? `· ${r.reference_id}` : ''}
                    </span>
                    <span className={`font-mono shrink-0 ${Number(r.qty_change) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {Number(r.qty_change) > 0 ? '+' : ''}
                      {r.qty_change}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="px-3 py-2 border-t border-slate-100">
          <button type="button" onClick={onClose} className="w-full py-1.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function InventoryEditRateModal({ batch, medicine, onClose, onSaved }) {
  const [mrp, setMrp] = useState(String(batch.mrp ?? ''))
  const [sale, setSale] = useState(String(batch.sale_rate ?? ''))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await api.patch(`/batches/${batch.id}/`, {
        mrp: Number(mrp) || 0,
        sale_rate: Number(sale) || 0,
      })
      toast.success('Rates updated')
      onSaved?.()
    } catch (e) {
      toast.error(parseApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[200] flex items-center justify-center p-4" onClick={onClose} role="presentation">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-slate-200 p-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Edit rates"
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-slate-800">Edit rate</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        <p className="text-[9px] text-slate-500 mb-2 truncate" title={medicine?.name}>
          {medicine?.name} · <span className="font-mono">{batch.batch_no}</span>
        </p>
        <p className="text-[9px] text-amber-800 bg-amber-50 border border-amber-100 rounded px-1.5 py-1 mb-2">
          Only MRP and sale rate can be changed. Stock, batch, expiry, and purchase cost come from purchase / system.
        </p>
        <label className="block mb-2">
          <span className="text-[9px] font-semibold text-slate-600">MRP (₹)</span>
          <input
            value={mrp}
            onChange={(e) => setMrp(e.target.value)}
            className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1 text-xs tabular-nums"
            inputMode="decimal"
          />
        </label>
        <label className="block mb-3">
          <span className="text-[9px] font-semibold text-slate-600">Sale rate (₹)</span>
          <input
            value={sale}
            onChange={(e) => setSale(e.target.value)}
            className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1 text-xs tabular-nums"
            inputMode="decimal"
          />
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 py-1.5 rounded border border-slate-200 text-[10px] font-semibold">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="flex-1 py-1.5 rounded bg-blue-600 text-white text-[10px] font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

function InventoryAdjustStockModal({ batch, medicine, allowNegative, onClose, onSaved }) {
  const [adjustQty, setAdjustQty] = useState('')
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const current = Number(batch.quantity ?? 0)
  const adj = adjustQty === '' || adjustQty === '-' ? 0 : Number(adjustQty)
  const projected = current + (Number.isFinite(adj) ? adj : 0)
  const invalidAdj = !Number.isFinite(adj) || adj === 0

  async function save() {
    if (!reason.trim()) {
      toast.error('Enter a reason for the adjustment')
      return
    }
    if (invalidAdj) {
      toast.error('Enter a non-zero adjustment (+ or −)')
      return
    }
    if (projected < 0 && !allowNegative) {
      toast.error('Would result in negative stock. Enable “Allow negative stock” or reduce the deduction.')
      return
    }
    setSaving(true)
    try {
      await api.post('/stock-ledgers/', {
        medicine: batch.medicine,
        batch: batch.id,
        reason: 'adjust',
        qty_change: String(adj),
        reference_type: 'inventory_adjust',
        reference_id: reason.trim().slice(0, 100),
        allow_negative_stock: allowNegative,
      })
      toast.success('Stock adjustment saved')
      onSaved?.()
    } catch (e) {
      toast.error(parseApiError(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-[200] flex items-center justify-center p-4" onClick={onClose} role="presentation">
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-sm border border-slate-200 p-3"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Adjust stock"
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-xs font-bold text-slate-800">Adjust stock</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X size={16} />
          </button>
        </div>
        <div className="space-y-2 text-[10px]">
          <div>
            <span className="text-slate-500">Medicine</span>
            <div className="font-semibold text-slate-900 truncate">{medicine?.name ?? '—'}</div>
          </div>
          <div>
            <span className="text-slate-500">Batch</span>
            <div className="font-mono">{batch.batch_no}</div>
          </div>
          <div>
            <span className="text-slate-500">Current stock (base)</span>
            <div className="font-mono font-semibold text-emerald-800">{current % 1 === 0 ? current : current.toFixed(3)}</div>
          </div>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-600">Adjust qty (+ in / − out)</span>
            <input
              value={adjustQty}
              onChange={(e) => setAdjustQty(e.target.value)}
              className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1 text-xs font-mono"
              placeholder="e.g. -5 or 10"
              inputMode="decimal"
            />
          </label>
          <div className="rounded border border-slate-100 bg-slate-50 px-2 py-1">
            <span className="text-slate-500">New stock</span>
            <div className={`font-mono font-semibold ${projected < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
              {Number.isFinite(projected) ? (projected % 1 === 0 ? projected : projected.toFixed(3)) : '—'}
            </div>
            {projected < 0 && !allowNegative && (
              <div className="text-[9px] text-rose-600 mt-0.5">Blocked: negative not allowed (see toolbar toggle).</div>
            )}
            {projected < 0 && allowNegative && (
              <div className="text-[9px] text-amber-700 mt-0.5">Warning: stock will be negative.</div>
            )}
          </div>
          <label className="block">
            <span className="text-[9px] font-semibold text-slate-600">Reason *</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="mt-0.5 w-full border border-slate-200 rounded px-2 py-1 text-xs resize-none"
              placeholder="e.g. Physical count variance, breakage…"
            />
          </label>
        </div>
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={onClose} className="flex-1 py-1.5 rounded border border-slate-200 text-[10px] font-semibold">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={save}
            className="flex-1 py-1.5 rounded bg-emerald-600 text-white text-[10px] font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save adjustment'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryView({ invoices, setPrintingInvoice }) {
  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden">
      <h2 className="text-sm font-bold text-slate-900 shrink-0">Sale register</h2>
      <div className="flex-1 bg-white border border-slate-200 rounded overflow-y-auto min-h-0">
        <table className="w-full text-left text-[11px]">
          <thead className="bg-slate-100 sticky top-0 z-10 text-[10px] font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Invoice</th>
              <th className="px-3 py-2">Patient</th>
              <th className="px-3 py-2">Tax</th>
              <th className="px-3 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr
                key={inv.id}
                className="hover:bg-slate-50 cursor-pointer"
                onClick={() => setPrintingInvoice(inv)}
              >
                <td className="px-3 py-2 text-blue-700 font-mono text-[10px]">#{inv.invoice_no}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">
                    {inv.patient_details?.first_name} {inv.patient_details?.last_name}
                  </div>
                  <div className="text-[10px] text-slate-400">{safeFormat(inv.created_at, 'dd MMM yy HH:mm')}</div>
                </td>
                <td className="px-3 py-2">₹{(Number(inv.cgst) + Number(inv.sgst)).toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-semibold">₹{Number(inv.grand_total).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function resolveNewMedicineDefaultGst(defaultGstPercent) {
  const s = defaultGstPercent != null && String(defaultGstPercent).trim() !== '' ? String(defaultGstPercent).trim() : ''
  if (s === '') return '5'
  const n = Number(s)
  return Number.isFinite(n) && n >= 0 ? String(n) : '5'
}

function AddMedicineModal({ onClose, onRefresh, defaultGstPercent }) {
  const fallbackGstStr = resolveNewMedicineDefaultGst(defaultGstPercent)
  const [data, setData] = useState({
    name: '',
    hsn_code: '',
    pack_info: '',
    gst_percent: fallbackGstStr,
    no_gst: false,
  })
  const [units, setUnits] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .get('/units/?limit=100')
      .then((res) => setUnits(res.data?.data || res.data?.results || []))
      .catch(() => setUnits([]))
  }, [])

  async function handleAdd() {
    if (!data.name || !data.pack_info) return toast.error('Enter name and pack')
    const unitId = units[0]?.id
    if (!unitId) return toast.error('No stock unit — seed units in inventory')
    setSubmitting(true)
    try {
      let gstNum
      if (data.no_gst) {
        gstNum = 0
      } else {
        const t = String(data.gst_percent ?? '').trim()
        gstNum = t === '' ? Number(fallbackGstStr) : Number(t)
        if (!Number.isFinite(gstNum) || gstNum < 0) {
          toast.error('GST % must be zero or a valid number')
          setSubmitting(false)
          return
        }
      }
      await api.post('/medicines/', {
        sku: `SKU-${Date.now()}`,
        name: data.name,
        hsn_code: data.hsn_code,
        pack_info: data.pack_info,
        gst_percent: String(gstNum),
        unit: unitId,
      })
      toast.success('Medicine created')
      onRefresh()
      onClose()
    } catch {
      toast.error('Could not create medicine')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-800">New medicine</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            {[
              ['name', 'Name', 'PARACETAMOL 500MG'],
              ['hsn_code', 'HSN', '3004.90'],
              ['pack_info', 'Pack', '10x15'],
            ].map(([field, label, ph]) => (
              <label key={field} className="block">
                <span className="text-[10px] font-semibold text-slate-600">{label}</span>
                <input
                  type="text"
                  value={data[field]}
                  onChange={(e) => setData({ ...data, [field]: e.target.value })}
                  placeholder={ph}
                  className="mt-0.5 w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                />
              </label>
            ))}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!!data.no_gst}
                onChange={(e) => {
                  const checked = e.target.checked
                  setData((d) => ({
                    ...d,
                    no_gst: checked,
                    gst_percent: checked ? '0' : d.gst_percent === '0' ? fallbackGstStr : d.gst_percent,
                  }))
                }}
                className="rounded border-slate-300"
              />
              <span className="text-xs text-slate-700">No GST on this product (0%)</span>
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold text-slate-600">GST %</span>
              <input
                type="text"
                value={data.gst_percent}
                onChange={(e) => setData({ ...data, gst_percent: e.target.value, no_gst: false })}
                placeholder={fallbackGstStr}
                disabled={!!data.no_gst}
                className="mt-0.5 w-full border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Default from outlet settings: {fallbackGstStr}% (leave blank to use it, or enter 0 for no tax)
              </span>
            </label>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded mt-4 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? 'Saving…' : (
              <>
                <Plus size={14} /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function AddPatientModal({ onClose, onAdd }) {
  const [data, setData] = useState({ first_name: '', last_name: '', phone: '', gender: 'M', date_of_birth: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd() {
    if (!data.first_name || !data.phone) {
      toast.error('Name & phone required')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post('/patients/', data)
      toast.success('Patient registered')
      onAdd(res.data?.data || res.data)
    } catch {
      toast.error('Registration failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden">
        <div className="p-5">
          <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-800">New patient</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3 grid grid-cols-2 gap-3">
            <label className="col-span-1">
              <span className="text-[10px] font-semibold text-slate-600">First name *</span>
              <input
                value={data.first_name}
                onChange={(e) => setData({ ...data, first_name: e.target.value })}
                className="mt-0.5 w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              />
            </label>
            <label className="col-span-1">
              <span className="text-[10px] font-semibold text-slate-600">Last name</span>
              <input
                value={data.last_name}
                onChange={(e) => setData({ ...data, last_name: e.target.value })}
                className="mt-0.5 w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              />
            </label>
            <label className="col-span-2">
              <span className="text-[10px] font-semibold text-slate-600">Mobile *</span>
              <input
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                className="mt-0.5 w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              />
            </label>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={submitting}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded mt-4 text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? 'Saving…' : (
              <>
                <UserPlus size={14} /> Register
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
