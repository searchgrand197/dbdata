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
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
} from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import ErpBillingView from '../pharmacy/ErpBillingView'
import PharmacyInvoicePrint from '../pharmacy/PharmacyInvoicePrint'
import SettingsPanel from '../pharmacy/SettingsPanel'
import PurchaseChallanPanel from '../pharmacy/PurchaseChallanPanel'
import PurchaseHistoryDashboard from '../pharmacy/PurchaseHistoryDashboard'
import PharmacyDashboard from '../pharmacy/PharmacyDashboard'
import PharmacyCategoriesView from '../pharmacy/PharmacyCategoriesView'
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
  const [view, setView] = useState('dashboard')
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1200)

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

  useEffect(() => {
    const onResize = () => {
      setSidebarCollapsed(window.innerWidth < 1200)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function handleLogout() {
    localStorage.clear()
    window.location.href = '/login'
  }

  const brand = outletSettings?.business_name?.trim() || 'Pharmacy'

  return (
    <div className="h-screen w-screen flex bg-slate-50 text-slate-900 font-sans overflow-hidden text-[14px]">
      <aside className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-200 ${sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-60'}`}>
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
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'billing', label: 'Sales', icon: ShoppingBag },
            { id: 'purchase', label: 'Purchase', icon: Truck },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'categories', label: 'Categories', icon: Tags },
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
        <header className="h-11 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-50"
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            <span className="text-xs font-medium text-slate-500">Terminal · Pharmacy desk</span>
          </div>
          <span className="text-xs text-slate-400">v3.2</span>
        </header>

        <main className="flex-1 overflow-hidden p-3 min-h-0">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Loading…</div>
          ) : (
            <>
              <ErrorBoundary componentName="PharmacyDashboard">
                {view === 'dashboard' && <PharmacyDashboard />}
              </ErrorBoundary>
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
              <ErrorBoundary componentName="PharmacyCategoriesView">
                {view === 'categories' && <PharmacyCategoriesView />}
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

  const qLower = q.toLowerCase()
  const medicineById = new Map(medicines.map((m) => [String(m.id), m]))
  const medIdsWithBatch = new Set(batches.map((b) => String(b.medicine)))

  const filtered = batches.filter((b) => {
    const med = medicineById.get(String(b.medicine))
    const name = med?.name?.toLowerCase() ?? ''
    const bn = (b.batch_no ?? '').toLowerCase()
    return name.includes(qLower) || bn.includes(qLower)
  })

  const medicinesWithoutBatch = medicines.filter((m) => {
    if (medIdsWithBatch.has(String(m.id))) return false
    if (!qLower) return true
    return (
      (m.name || '').toLowerCase().includes(qLower) ||
      (m.sku || '').toLowerCase().includes(qLower)
    )
  })

  const totalRows = filtered.length + medicinesWithoutBatch.length

  return (
    <div className="h-full flex flex-col gap-2 overflow-hidden min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">Inventory</h2>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
            {totalRows} items
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[10px] text-slate-600 cursor-pointer">
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
            className="border border-blue-200 bg-blue-50 text-blue-700 px-2.5 py-1 rounded text-[11px] font-semibold hover:bg-blue-100"
          >
            + Medicine
          </button>
        </div>
      </div>
      <div className="flex-1 bg-white border border-slate-200 rounded overflow-hidden flex flex-col min-h-0 min-w-0">
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50/70 shrink-0">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name / batch"
            className="flex-1 bg-transparent text-[12px] font-medium outline-none min-w-0"
          />
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0">
          <table className="w-full text-left text-[11px] table-fixed border-collapse">
            <thead className="bg-slate-100 sticky top-0 z-10 font-bold text-slate-600 uppercase">
              <tr>
                <th className="px-2 py-1.5 w-[18%]">Product</th>
                <th className="px-2 py-1.5 w-[10%]">Batch</th>
                <th className="px-2 py-1.5 w-[8%]">Expiry</th>
                <th className="px-2 py-1.5 w-[16%]">Stock</th>
                <th className="px-2 py-1.5 w-[7%] text-right">MRP</th>
                <th className="px-2 py-1.5 w-[7%] text-right">Sale</th>
                <th className="px-2 py-1.5 w-[7%] text-right">Pur.</th>
                <th className="px-2 py-1.5 w-[14%] text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => {
                const med = medicineById.get(String(b.medicine))
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
                    className={`hover:bg-slate-50 ${low ? 'bg-amber-50/50' : ''} ${qty < 0 ? 'bg-rose-50/70' : ''}`}
                  >
                    <td className="px-2 py-1 align-top min-w-0">
                      <div className="font-semibold text-slate-900 truncate" title={med?.name}>
                        {med?.name ?? '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{med?.pack_info}</div>
                    </td>
                    <td className="px-2 py-1 align-top min-w-0">
                      <span className="font-mono text-[10px] bg-slate-100 px-1 py-0.5 rounded inline-block max-w-full truncate" title={b.batch_no}>
                        {b.batch_no}
                      </span>
                    </td>
                    <td className={`px-2 py-1 align-top tabular-nums ${expCls}`}>{safeFormat(b.expiry_date, 'MM/yy')}</td>
                    <td className="px-2 py-1 align-top text-emerald-800 font-medium leading-tight break-words">
                      <div>{stockLabel}</div>
                      <div className="text-[9px] text-slate-400 font-mono tabular-nums">
                        {qty % 1 === 0 ? qty : qty.toFixed(2)} {baseLabel} (base)
                      </div>
                      {qty < 0 && <div className="text-[9px] text-rose-600 font-semibold">Below zero</div>}
                      {low && qty >= 0 && <div className="text-[9px] text-amber-700">Low stock</div>}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums text-slate-700">₹{Number(b.mrp ?? 0).toFixed(2)}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-blue-700 font-semibold">₹{Number(b.sale_rate ?? 0).toFixed(2)}</td>
                    <td className="px-2 py-1 text-right tabular-nums text-slate-500">₹{Number(b.unit_cost ?? 0).toFixed(2)}</td>
                    <td className="px-1 py-1 align-top">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        <button
                          type="button"
                          title="View details"
                          onClick={() => setDetailBatch({ batch: b, medicine: med })}
                          className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          type="button"
                          title="Edit rate"
                          onClick={() => setRateBatch({ batch: b, medicine: med })}
                          className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <PencilLine size={12} />
                        </button>
                        <button
                          type="button"
                          title="Adjust stock"
                          onClick={() => setAdjustBatch({ batch: b, medicine: med })}
                          className="p-1 rounded border border-slate-200 text-slate-600 hover:bg-slate-100"
                        >
                          <SlidersHorizontal size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {medicinesWithoutBatch.map((m) => (
                <tr key={`no-batch-${m.id}`} className="bg-sky-50/30 hover:bg-sky-50/60">
                  <td className="px-2 py-1 align-top min-w-0">
                    <div className="font-semibold text-slate-900 truncate" title={m.name}>
                      {m.name || '—'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{m.pack_info}</div>
                  </td>
                  <td className="px-2 py-1 align-top text-[10px]">
                    <span className="inline-block rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-semibold">
                      No batch
                    </span>
                  </td>
                  <td className="px-2 py-1 align-top text-slate-400">--/--</td>
                  <td className="px-2 py-1 align-top text-slate-500">Add batch to start stock</td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-700">₹{Number(m.default_mrp ?? 0).toFixed(2)}</td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-500">₹0.00</td>
                  <td className="px-2 py-1 text-right tabular-nums text-slate-500">₹0.00</td>
                  <td className="px-1 py-1 align-top">
                    <div className="flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => toast('Create purchase/batch entry for this medicine')}
                        className="px-2 py-1 rounded border border-blue-200 bg-white text-[10px] font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Add Batch
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && medicinesWithoutBatch.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-[11px] text-slate-500">
                    No inventory records found.
                  </td>
                </tr>
              )}
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

const DEFAULT_PRODUCT_FORMS = [
  'Tablet', 'Syrup', 'Capsule', 'Injection', 'Cream', 'Powder', 'Drops', 'Surgicals', 'Liquid', 'Gel',
  'Suspension', 'Lotion', 'Soap', 'Oil', 'Ointment', 'Kit', 'Bandage', 'Device', 'Spray', 'Shampoo',
  'Sachet', 'Packet', 'Bottle', 'Solution', 'Unit', 'Infusion', 'Box', 'Elixir', 'Paste', 'Balm',
  'Strip', 'Vaccine', 'Suppository', 'Patch', 'Jar', 'Tonic', 'Vial', 'Ampules', 'Pen',
]

function uniqText(values) {
  const seen = new Set()
  const out = []
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

function AddMedicineModal({ onClose, onRefresh, defaultGstPercent }) {
  const fallbackGstStr = resolveNewMedicineDefaultGst(defaultGstPercent)
  const [data, setData] = useState({
    name: '',
    company_name: '',
    form: '',
    composition: '',
    mrp: '',
    mrp_input_type: 'unit',
    price_tax_mode: 'exclusive',
    units_per_pack: '',
    gst_percent: fallbackGstStr,
    no_gst: false,
    add_batch: true,
    batch_mode: 'new',
    existing_batch_id: '',
    batch_no: '',
    expiry_date: '',
  })
  const [units, setUnits] = useState([])
  const [forms, setForms] = useState([])
  const [batchOptions, setBatchOptions] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showFormOptions, setShowFormOptions] = useState(false)
  const [creatingForm, setCreatingForm] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([
      api.get('/units/?limit=100').catch(() => ({ data: [] })),
      api.get('/medicine-categories/?limit=500').catch(() => ({ data: [] })),
      api.get('/medicines/?limit=2000').catch(() => ({ data: [] })),
      api.get('/batches/?limit=1000').catch(() => ({ data: [] })),
    ])
      .then(([uRes, cRes, mRes, bRes]) => {
        if (cancelled) return
        const unitsList = uRes.data?.data || uRes.data?.results || []
        setUnits(Array.isArray(unitsList) ? unitsList : [])

        const catRows = cRes.data?.data || cRes.data?.results || []
        const catNames = Array.isArray(catRows) ? catRows.map((r) => r.name) : []

        const medRows = mRes.data?.data || mRes.data?.results || []
        const medForms = Array.isArray(medRows) ? medRows.map((m) => m.form) : []

        setForms(uniqText([...catNames, ...medForms, ...DEFAULT_PRODUCT_FORMS]))
        const bRows = bRes.data?.data || bRes.data?.results || []
        setBatchOptions(Array.isArray(bRows) ? bRows : [])
      })
      .catch(() => {
        if (cancelled) return
        setUnits([])
        setForms(DEFAULT_PRODUCT_FORMS)
        setBatchOptions([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAdd() {
    if (!data.name.trim()) return toast.error('Product name is required')
    if (!data.form.trim()) return toast.error('Product form is required')
    if (!(Number(data.mrp) > 0)) return toast.error('MRP is required')
    const unitsPerPack =
      data.mrp_input_type === 'unit'
        ? 1
        : Math.max(0, Number(data.units_per_pack) || 0)
    if (!(unitsPerPack > 0)) return toast.error('Units per pack is required')
    if (data.add_batch && data.batch_mode === 'new' && !data.batch_no.trim()) return toast.error('Batch number is required')
    if (data.add_batch && data.batch_mode === 'new' && !data.expiry_date) return toast.error('Expiry date is required')
    if (data.add_batch && data.batch_mode === 'existing' && !data.existing_batch_id) {
      return toast.error('Select an existing batch')
    }
    const unitId = units[0]?.id
    setSubmitting(true)
    try {
      const enteredMrp = Number(data.mrp) || 0
      const unitMrpRaw =
        data.mrp_input_type === 'pack' && unitsPerPack > 1
          ? enteredMrp / unitsPerPack
          : enteredMrp
      const unitMrp = Number(unitMrpRaw.toFixed(2))
      if (!(unitMrp > 0)) {
        toast.error('Derived unit price must be greater than zero')
        setSubmitting(false)
        return
      }
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
      const createdSku = `SKU-${Date.now()}`
      const medRes = await api.post('/medicines/', {
        sku: createdSku,
        name: data.name.trim(),
        company_name: data.company_name.trim(),
        form: data.form.trim(),
        composition: data.composition.trim(),
        strength: data.composition.trim(),
        pack_info: `1x${unitsPerPack}`,
        default_mrp: unitMrp.toFixed(2),
        unit_conversions: { strip: unitsPerPack },
        gst_percent: String(gstNum),
        ...(unitId ? { unit: unitId } : {}),
      })
      const createdMedicine = medRes?.data?.data || medRes?.data?.entity || medRes?.data
      let createdMedicineId = createdMedicine?.id
      if (!createdMedicineId) {
        const lookupRes = await api.get(`/medicines/?search=${encodeURIComponent(createdSku)}&limit=5`)
        const lookupRows = lookupRes?.data?.data || lookupRes?.data?.results || []
        const matched = Array.isArray(lookupRows)
          ? lookupRows.find((m) => String(m?.sku || '').trim() === createdSku)
          : null
        createdMedicineId = matched?.id
      }
      if (!createdMedicineId) {
        throw new Error('Medicine saved, but could not resolve created id for batch creation')
      }
      if (data.add_batch) {
        const existing = batchOptions.find((b) => String(b.id) === String(data.existing_batch_id))
        const batchNo = data.batch_mode === 'existing' ? (existing?.batch_no || '').trim() : data.batch_no.trim()
        const expiryDate = data.batch_mode === 'existing' ? existing?.expiry_date : data.expiry_date
        const unitCost = data.batch_mode === 'existing' ? String(existing?.unit_cost ?? '0') : '0'
        const batchMrp = data.batch_mode === 'existing' ? String(existing?.mrp ?? unitMrp.toFixed(2)) : unitMrp.toFixed(2)
        const batchSaleRate =
          data.batch_mode === 'existing' ? String(existing?.sale_rate ?? unitMrp.toFixed(2)) : unitMrp.toFixed(2)
        await api.post('/batches/', {
          medicine: createdMedicineId,
          batch_no: batchNo,
          expiry_date: expiryDate,
          unit_cost: unitCost,
          mrp: batchMrp,
          sale_rate: batchSaleRate,
        })
      }
      if (data.add_batch) {
        toast.success('Medicine and batch created')
      } else {
        toast.success('Medicine created (not visible in Inventory until a batch is added)')
      }
      onRefresh()
      onClose()
    } catch (e) {
      const detail =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        (typeof e?.response?.data === 'string' ? e.response.data : '') ||
        e?.message
      toast.error(detail || 'Could not create medicine')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredForms = forms.filter((f) =>
    f.toLowerCase().includes((data.form || '').toLowerCase().trim()),
  )
  const trimmedForm = (data.form || '').trim()
  const formExists = forms.some((f) => f.toLowerCase() === trimmedForm.toLowerCase())

  async function handleCreateForm() {
    const name = (data.form || '').trim()
    if (!name) {
      toast.error('Type a category name first')
      return
    }
    if (forms.some((f) => f.toLowerCase() === name.toLowerCase())) {
      toast('Category already exists')
      return
    }
    setCreatingForm(true)
    try {
      await api.post('/medicine-categories/', { name, is_active: true })
      setForms((prev) => uniqText([name, ...prev]))
      setData((d) => ({ ...d, form: name }))
      setShowFormOptions(false)
      toast.success('Category added')
    } catch {
      toast.error('Could not add category')
    } finally {
      setCreatingForm(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-2 md:p-3">
      <div className="bg-white w-[86vw] md:w-[64vw] lg:w-[50vw] max-w-3xl rounded-xl shadow-xl border border-slate-200 overflow-hidden origin-center scale-[0.88] md:scale-[0.92] lg:scale-[0.95]">
        <div className="p-2">
          <div className="flex justify-between items-center mb-1 border-b border-slate-100 pb-1">
            <h3 className="text-[15px] font-bold text-slate-900">Create New Product</h3>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-1.5">
            <section className="space-y-1">
              <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">Basic Info</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                <label className="block md:col-span-2">
                  <span className="text-[10px] font-semibold text-slate-700">Product Name*</span>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData({ ...data, name: e.target.value })}
                    placeholder="Type product name"
                    className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-700">Company Name</span>
                  <input
                    type="text"
                    value={data.company_name}
                    onChange={(e) => setData({ ...data, company_name: e.target.value })}
                    placeholder="Optional"
                    className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-700">Product Form*</span>
                  <div className="relative mt-1">
                    <input
                      value={data.form}
                      onFocus={() => setShowFormOptions(true)}
                      onBlur={() => setTimeout(() => setShowFormOptions(false), 120)}
                      onChange={(e) => {
                        setData({ ...data, form: e.target.value })
                        setShowFormOptions(true)
                      }}
                      placeholder="Search category..."
                      className="w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500 bg-white"
                    />
                    {showFormOptions && (
                      <div className="absolute z-30 mt-1 w-full max-h-36 overflow-auto rounded border border-slate-200 bg-white shadow-lg">
                        {filteredForms.length > 0 ? (
                          filteredForms.slice(0, 60).map((f) => (
                            <button
                              key={f}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setData((d) => ({ ...d, form: f }))
                                setShowFormOptions(false)
                              }}
                              className="w-full text-left px-2 py-1.5 text-xs hover:bg-slate-50"
                            >
                              {f}
                            </button>
                          ))
                        ) : (
                          <div className="px-2 py-2 text-xs text-slate-500">No matching category</div>
                        )}
                        {!formExists && trimmedForm && (
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleCreateForm}
                            disabled={creatingForm}
                            className="w-full text-left px-2 py-1.5 text-xs font-semibold text-blue-700 border-t border-slate-100 hover:bg-blue-50 disabled:opacity-50"
                          >
                            {creatingForm ? 'Adding category...' : `+ Add "${trimmedForm}" category`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </section>

            <section className="space-y-1 border-t border-slate-100 pt-1">
              <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">Batch Details</p>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={!!data.add_batch}
                  onChange={(e) => setData((d) => ({ ...d, add_batch: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                <span className="text-[10px] text-slate-700 font-medium">Add opening batch now</span>
              </label>
              {data.add_batch && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5 w-full max-w-[320px]">
                    <button
                      type="button"
                      onClick={() => setData((d) => ({ ...d, batch_mode: 'new' }))}
                      className={`border rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        data.batch_mode === 'new'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      Create new batch
                    </button>
                    <button
                      type="button"
                      onClick={() => setData((d) => ({ ...d, batch_mode: 'existing' }))}
                      className={`border rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        data.batch_mode === 'existing'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      Use existing batch
                    </button>
                  </div>
                  {data.batch_mode === 'new' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      <label className="block">
                        <span className="text-[10px] font-semibold text-slate-700">Batch No*</span>
                        <input
                          type="text"
                          value={data.batch_no}
                          onChange={(e) => setData({ ...data, batch_no: e.target.value })}
                          placeholder="e.g. BATCH-001"
                          className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500"
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-semibold text-slate-700">Expiry Date*</span>
                        <input
                          type="date"
                          value={data.expiry_date}
                          onChange={(e) => setData({ ...data, expiry_date: e.target.value })}
                          className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500"
                        />
                      </label>
                    </div>
                  ) : (
                    <label className="block">
                      <span className="text-[10px] font-semibold text-slate-700">Select Existing Batch*</span>
                      <select
                        value={data.existing_batch_id}
                        onChange={(e) => setData((d) => ({ ...d, existing_batch_id: e.target.value }))}
                        className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="">Choose batch...</option>
                        {batchOptions.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.batch_no} | exp {b.expiry_date || '--/--'} | ₹{Number(b.sale_rate || 0).toFixed(2)}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-[10px] text-slate-500">
                        Copies selected batch details (batch no, expiry, rates) to this new product.
                      </p>
                    </label>
                  )}
                </div>
              )}
            </section>

            <section className="space-y-1 border-t border-slate-100 pt-1">
              <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">Pricing</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                <label className="block md:col-span-2">
                  <span className="text-[10px] font-semibold text-slate-700">Price Input Type</span>
                  <div className="mt-1 grid grid-cols-2 gap-1.5 w-full max-w-[320px]">
                    <button
                      type="button"
                      onClick={() =>
                        setData((d) => ({ ...d, mrp_input_type: 'unit', units_per_pack: '1' }))
                      }
                      className={`border rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        data.mrp_input_type === 'unit'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      1 unit
                    </button>
                    <button
                      type="button"
                      onClick={() => setData((d) => ({ ...d, mrp_input_type: 'pack' }))}
                      className={`border rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        data.mrp_input_type === 'pack'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      Full pack
                    </button>
                  </div>
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-700">
                    Price* {data.mrp_input_type === 'pack' ? '(per pack)' : '(per unit)'}
                  </span>
                  <input
                    type="number"
                    value={data.mrp}
                    onChange={(e) => setData({ ...data, mrp: e.target.value })}
                    placeholder="0.00"
                    className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-700">Units / Pack*</span>
                  <input
                    type="number"
                    value={data.units_per_pack}
                    onChange={(e) => setData({ ...data, units_per_pack: e.target.value })}
                    placeholder={data.mrp_input_type === 'unit' ? '1 (fixed)' : 'e.g. 10'}
                    disabled={data.mrp_input_type === 'unit'}
                    className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </label>
                <label className="block">
                  <span className="text-[10px] font-semibold text-slate-700">Tax Mode</span>
                  <div className="mt-1 grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setData((d) => ({ ...d, price_tax_mode: 'exclusive' }))}
                      className={`border rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        data.price_tax_mode === 'exclusive'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      Excluded
                    </button>
                    <button
                      type="button"
                      onClick={() => setData((d) => ({ ...d, price_tax_mode: 'inclusive' }))}
                      className={`border rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                        data.price_tax_mode === 'inclusive'
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'bg-white border-slate-300 text-slate-700'
                      }`}
                    >
                      Included
                    </button>
                  </div>
                </label>
                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-700">GST %</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none">
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
                      <span className="text-[10px] text-slate-700">No GST</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    value={data.gst_percent}
                    onChange={(e) => setData({ ...data, gst_percent: e.target.value, no_gst: false })}
                    placeholder={fallbackGstStr}
                    disabled={!!data.no_gst}
                    className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </label>
                <p className="md:col-span-2 text-[10px] text-slate-500">
                  {(() => {
                    const unitsPerPack = Math.max(1, Number(data.units_per_pack) || 1)
                    const enteredMrp = Number(data.mrp) || 0
                    const unitMrp =
                      data.mrp_input_type === 'pack' && unitsPerPack > 1
                        ? enteredMrp / unitsPerPack
                        : enteredMrp
                    const gstPct = data.no_gst ? 0 : Math.max(0, Number(data.gst_percent || fallbackGstStr) || 0)
                    if (!(unitMrp > 0)) return 'Enter price and units/pack to preview unit price.'
                    if (gstPct <= 0) return `Unit price used for billing: ₹${unitMrp.toFixed(2)} (No GST)`
                    if (data.price_tax_mode === 'inclusive') {
                      const base = unitMrp / (1 + gstPct / 100)
                      const gstAmt = unitMrp - base
                      return `GST included ${gstPct}%: base ₹${base.toFixed(2)} + GST ₹${gstAmt.toFixed(2)}`
                    }
                    const gstAmt = unitMrp * (gstPct / 100)
                    return `GST excluded ${gstPct}%: base ₹${unitMrp.toFixed(2)} + GST ₹${gstAmt.toFixed(2)}`
                  })()}
                </p>
              </div>
            </section>

            <section className="space-y-1 border-t border-slate-100 pt-1">
              <p className="text-[10px] font-bold tracking-wide text-slate-500 uppercase">Additional Info</p>
              <label className="block">
                <span className="text-[10px] font-semibold text-slate-700">Composition</span>
                <input
                  type="text"
                  value={data.composition}
                  onChange={(e) => setData({ ...data, composition: e.target.value })}
                  placeholder="Optional"
                  className="mt-1 w-full h-7 border border-slate-300 rounded px-2 text-[11px] outline-none focus:border-blue-500"
                />
              </label>
            </section>
          </div>
          <div className="mt-1.5 border-t border-slate-100 pt-1.5 flex justify-end">
            <button
            type="button"
            onClick={handleAdd}
            disabled={submitting}
            className="bg-blue-600 text-white font-semibold h-8 rounded-md px-5 text-[13px] disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {submitting ? 'Creating…' : (
              <>
                <Plus size={16} /> Create
              </>
            )}
          </button>
          </div>
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
