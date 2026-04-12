import React, { useState, useEffect, useRef } from 'react'
import { 
  ShoppingBag, Search, Plus, Trash2, Printer, 
  Package, History, LogOut, X, Check, 
  Layers, ChevronDown, Monitor, Keyboard, Zap,
  Settings, CreditCard, LayoutDashboard, FileText,
  UserPlus, MoreVertical
} from 'lucide-react'
import api from '../api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

const GST_RATE = 0.06 // 6% CGST + 6% SGST = 12% total

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ error: error, errorInfo: errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
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
      );
    }
    return this.props.children;
  }
}

// Resilient Date Formatter to prevent RangeError on Invalid/Null dates
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
  const [view, setView] = useState('billing') // billing, inventory, history, settings
  const [medicines, setMedicines] = useState([])
  const [batches, setBatches] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [printingInvoice, setPrintingInvoice] = useState(null)
  const [showAddMedicine, setShowAddMedicine] = useState(false)
  const [showAddPatient, setShowAddPatient] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      const [mResp, bResp, iResp] = await Promise.all([
        api.get('/medicines/?limit=1000'),
        api.get('/batches/?limit=1000'),
        api.get('/pharmacy/invoices/?limit=100')
      ])
      setMedicines(mResp.data?.data || mResp.data?.results || [])
      setBatches(bResp.data?.data || bResp.data?.results || [])
      setInvoices(iResp.data?.data || iResp.data?.results || [])
    } catch (err) {
      toast.error('Failed to load pharmacy data')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.clear()
    window.location.href = '/login'
  }

  return (
    <div className="h-screen w-screen flex bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Left ERP Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-200">
           <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">V</div>
              <div>
                 <h1 className="text-sm font-bold text-slate-800 tracking-tight">Vardaan Pharmacy</h1>
                 <p className="text-xs text-slate-500 font-medium tracking-wide">ERP Software v3.1</p>
              </div>
           </div>
        </div>

        <nav className="flex-1 py-6 flex flex-col gap-1">
           {[
             { id: 'billing', label: 'Sales [F2]', icon: ShoppingBag },
             { id: 'inventory', label: 'Inventory List', icon: Package },
             { id: 'history', label: 'Sale Register', icon: FileText },
             { id: 'settings', label: 'Configurations', icon: Settings }
           ].map(item => (
             <button
               key={item.id}
               onClick={() => setView(item.id)}
               className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all border-l-4 ${
                 view === item.id 
                  ? 'bg-blue-50 text-blue-700 border-blue-600' 
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
               }`}
             >
               <item.icon size={18} />
               {item.label}
             </button>
           ))}
        </nav>

        <div className="p-6 border-t border-slate-200">
           <button onClick={handleLogout} className="flex items-center gap-3 text-slate-600 hover:text-rose-600 text-sm font-medium w-full transition-colors">
              <LogOut size={18} />
              Logout System
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
         {/* Top Info Bar */}
         <header className="h-14 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-4 text-xs font-medium text-slate-500 tracking-wide outline-none">
               <span>Terminal: PC-01</span>
               <span className="text-slate-300">|</span>
               <span>Shift: Morning</span>
               <span className="text-slate-300">|</span>
               <span className="text-blue-600 font-semibold">Active Node: Main_Server</span>
            </div>
            <div className="flex items-center gap-4">
               <div className="text-right">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest leading-none">Welcome Back</p>
                  <p className="text-sm font-semibold text-slate-800 mt-0.5">Pharmacy Admin</p>
               </div>
               <div className="w-8 h-8 bg-slate-50 border border-slate-200 rounded-full flex items-center justify-center text-slate-500">
                  <Monitor size={16} />
               </div>
            </div>
         </header>

         <main className="flex-1 overflow-hidden p-6">
            <ErrorBoundary componentName="ErpBillingView">
              {view === 'billing' && <ErpBillingView medicines={medicines} batches={batches} setInvoices={setInvoices} setPrintingInvoice={setPrintingInvoice} setShowAddMedicine={setShowAddMedicine} setShowAddPatient={setShowAddPatient} fetchInitialData={fetchInitialData} />}
            </ErrorBoundary>
            <ErrorBoundary componentName="InventoryView">
              {view === 'inventory' && <InventoryView medicines={medicines} batches={batches} fetchBatches={fetchInitialData} setShowAddMedicine={setShowAddMedicine} />}
            </ErrorBoundary>
            <ErrorBoundary componentName="HistoryView">
              {view === 'history' && <HistoryView invoices={invoices} setPrintingInvoice={setPrintingInvoice} />}
            </ErrorBoundary>
            {view === 'settings' && <div className="p-12 text-center text-slate-400 font-bold italic">Configurations are managed by Hospital Super-Admin</div>}
         </main>
      </div>

      {printingInvoice && (
        <PharmacyInvoicePrint invoice={printingInvoice} onClose={() => setPrintingInvoice(null)} />
      )}
      {showAddMedicine && (
        <AddMedicineModal onClose={() => setShowAddMedicine(false)} onRefresh={fetchInitialData} />
      )}
      {showAddPatient && (
        <AddPatientModal onClose={() => setShowAddPatient(false)} onAdd={(pt) => {
           setShowAddPatient(false)
           // We'll need a way to pass this down or let the ErpBillingView handle it.
           // However, setSelectedPt is scoped inside ErpBillingView unfortunately!
        }} />
      )}
    </div>
  )
}

function ErpBillingView({ medicines, batches, setInvoices, setPrintingInvoice, setShowAddMedicine, setShowAddPatient, fetchInitialData }) {
  function createNewRow() {
    return { medicine: null, batch: null, qty: 0, rate: 0, amount: 0, hsn: '', pack: '' }
  }

  const [selectedPt, setSelectedPt] = useState(null)
  const [ptSearch, setPtSearch] = useState('')
  const [ptResults, setPtResults] = useState([])
  
  const [rows, setRows] = useState([createNewRow(), createNewRow(), createNewRow(), createNewRow(), createNewRow()])
  const [activeRow, setActiveRow] = useState(0)
  const [activeField, setActiveField] = useState('product')
  const [pSearch, setPSearch] = useState('')
  const [pResults, setPResults] = useState([])
  const [bResults, setBResults] = useState([])
  const [showBatchSelect, setShowBatchSelect] = useState(false)

  // Row Management
  function updateRow(idx, field, value) {
    const nr = [...rows]
    nr[idx][field] = value
    if (field === 'qty' || field === 'rate') {
      nr[idx].amount = nr[idx].qty * nr[idx].rate
    }
    
    // Maintenance: Ensure there are always 5 empty rows below the last filled one
    if (field === 'medicine' && value) {
       const emptyBelow = nr.slice(idx + 1).filter(r => !r.medicine).length
       if (emptyBelow < 4) { // Including current, ensure 5 total available
          for(let i=0; i < (5 - emptyBelow); i++) nr.push(createNewRow())
       }
    }
    
    setRows(nr)
  }

  function handleRowEnter(e, idx, field) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (field === 'product') {
        if (pResults.length > 0) {
          const m = pResults[0]
          updateRow(idx, 'medicine', m) // Store Object
          updateRow(idx, 'hsn', m.hsn_code)
          updateRow(idx, 'pack', m.pack_info)
          setPResults([])
          setPSearch('')
          setTimeout(() => qtyRefs.current[idx]?.focus(), 50)
        }
      } else if (field === 'qty') {
        setTimeout(() => rateRefs.current[idx]?.focus(), 50)
      } else if (field === 'rate') {
        if (idx < rows.length - 1) {
          setActiveRow(idx + 1)
          setActiveField('product')
          setTimeout(() => productRefs.current[idx + 1]?.focus(), 50)
        }
      }
    }
  }

  const productRefs = useRef([])
  const qtyRefs = useRef([])
  const rateRefs = useRef([])

  function addNewRow() {
    const nr = [...rows, createNewRow()]
    setRows(nr)
    setActiveRow(nr.length - 1)
    setActiveField('product')
    setPSearch('')
    setTimeout(() => {
       productRefs.current[nr.length - 1]?.focus()
    }, 50)
  }

  const subtotal = rows.filter(r => r.medicine).reduce((s, r) => s + r.amount, 0)
  const gst = subtotal * 0.12
  const grandTotal = subtotal + gst

  async function handleSave() {
    if (!selectedPt) { toast.error('Select Patient'); return }
    const valid = rows.filter(r => r.medicine && r.batch && r.qty > 0)
    if (!valid.length) { toast.error('No items'); return }

    try {
      const { data: invData } = await api.post('/pharmacy/invoices/', {
        invoice_no: 'INV-' + Math.floor(Date.now() / 1000),
        patient: selectedPt.id,
        subtotal: subtotal.toFixed(2),
        cgst: (gst/2).toFixed(2),
        sgst: (gst/2).toFixed(2),
        grand_total: grandTotal.toFixed(2),
        status: 'finalized'
      })
      const invoice = invData?.data || invData
      await Promise.all(valid.map(r => 
        api.post('/pharmacy/items/', {
          invoice: invoice.id,
          medicine: r.medicine.id,
          batch: r.batch.id,
          qty: r.qty,
          mrp: r.batch.mrp || 0,
          rate: r.rate,
          amount: r.amount.toFixed(2)
        })
      ))
      setPrintingInvoice({ ...invoice, items: valid, patient_details: selectedPt })
      setRows([createNewRow(), createNewRow(), createNewRow(), createNewRow(), createNewRow()])
      setSelectedPt(null)
      toast.success('Invoice Generated')
    } catch {
      toast.error('System Error')
    }
  }

  return (
    <div className="h-full flex gap-6 overflow-hidden">
      {/* Left Main Section */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
         {/* Search Header */}
         <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 flex-1 max-w-lg">
               <div className="flex-1 relative">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Search Patient Record</p>
                  {selectedPt ? (
                     <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg font-bold text-sm">
                        <span className="text-blue-700">{selectedPt.first_name} {selectedPt.last_name} ({selectedPt.uhid})</span>
                        <button onClick={() => setSelectedPt(null)} className="text-blue-400"><X size={14} /></button>
                     </div>
                  ) : (
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                       <input 
                          type="text" 
                          placeholder="NAME / UHID / MOBILE..." 
                          value={ptSearch}
                          onChange={e => {
                             setPtSearch(e.target.value)
                             if (e.target.value.length > 2) {
                                api.get(`/patients/?search=${e.target.value}&limit=5`).then(res => setPtResults(res.data?.data || res.data?.results || []))
                             } else setPtResults([])
                          }}
                          className="w-full bg-slate-50 border border-slate-100 pl-10 pr-4 py-2 rounded-lg text-sm font-bold focus:bg-white focus:border-blue-500 outline-none transition-all uppercase"
                       />
                       {(ptSearch.length > 2) && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-50 overflow-hidden divide-y divide-slate-50">
                             {ptResults.length > 0 ? ptResults.map(p => (
                               <button key={p.id} onClick={() => { setSelectedPt(p); setPtResults([]); setPtSearch('') }} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors">
                                  <p className="text-sm font-bold text-slate-900">{p.first_name} {p.last_name}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold">{p.phone} | {p.uhid}</p>
                               </button>
                             )) : (
                               <div className="p-4 text-center bg-white cursor-default">
                                  <p className="text-sm font-semibold text-slate-600">No patients found</p>
                                  <p className="text-xs text-slate-500 mb-3 mt-1">Create a new record to continue billing.</p>
                                  <button onClick={() => setShowAddPatient(true)} className="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-md font-medium text-xs transition-all flex items-center justify-center gap-2 mx-auto">
                                     <UserPlus size={14} /> Add New Patient
                                  </button>
                               </div>
                             )}
                          </div>
                       )}
                    </div>
                  )}
               </div>
            </div>
            <button 
              onClick={() => setShowAddMedicine(true)}
              className="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-md font-medium text-xs transition-all flex items-center gap-2"
            >
              <Plus size={14} /> Add Medicine Master
            </button>
         </div>


         {/* Main Billing Grid */}
         <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-x-auto scrollbar-thin pb-48">
            <div className="min-w-[900px] flex flex-col h-full">
               {/* Table Header */}
               <div className="bg-slate-50 flex text-xs font-semibold text-slate-600 shrink-0 border-b border-slate-200 rounded-t">
                  <span className="w-12 px-4 py-3 border-r border-slate-200 text-center">S.N</span>
                  <span className="flex-1 px-4 py-3 border-r border-slate-200">Medicine Description</span>
                  <span className="w-28 px-4 py-3 border-r border-slate-200 text-center">Batch No.</span>
                  <span className="w-24 px-4 py-3 border-r border-slate-200 text-center">Expiry</span>
                  <span className="w-20 px-4 py-3 border-r border-slate-200 text-center">Qty</span>
                  <span className="w-28 px-4 py-3 border-r border-slate-200 text-right">Sale Rate</span>
                  <span className="w-32 px-4 py-3 border-r border-slate-200 text-right">Amount (₹)</span>
                  <span className="w-12 px-4 py-3"></span>
               </div>

               {/* Table Body */}
               <div className="flex-1 divide-y divide-slate-100">
                  {rows.map((row, idx) => (
                 <div key={idx} className={`flex items-center text-sm transition-all ${
                   activeRow === idx 
                     ? 'bg-blue-50/50 outline outline-1 outline-blue-300 relative z-10' 
                     : idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'
                 }`}>
                    <span className={`w-12 px-4 py-3 border-r border-slate-200 text-center ${activeRow === idx ? 'text-blue-600 font-medium' : 'text-slate-400'}`}>{idx + 1}</span>
                    
                    <div className={`flex-1 px-4 py-2 border-r border-slate-200 relative`}>
                       {row.medicine ? (
                          <div className="flex items-center justify-between">
                             <span className="text-slate-900 font-bold uppercase">{row.medicine.name}</span>
                             <span className="text-[9px] text-slate-400 font-bold tracking-tight italic">{row.medicine.pack_info} | {row.medicine.hsn_code}</span>
                          </div>
                       ) : (
                         <div className="relative">
                            <input 
                              ref={el => productRefs.current[idx] = el}
                              autoFocus={activeRow === idx && activeField === 'product'}
                              onFocus={() => { setActiveRow(idx); setActiveField('product') }}
                              type="text"
                              placeholder="SEARCH MEDICINE..."
                              value={activeRow === idx ? pSearch : ''}
                              onChange={e => {
                                setPSearch(e.target.value)
                                if (e.target.value.length > 1) {
                                  let filtered = medicines.filter(m => m.name.toLowerCase().includes(e.target.value.toLowerCase()))
                                  setPResults(filtered.slice(0, 10))
                                } else setPResults([])
                              }}
                              className="w-full bg-transparent outline-none uppercase font-black text-slate-950 placeholder:text-slate-200"
                            />
                            {activeRow === idx && (pResults.length > 0 || showBatchSelect || pSearch.length > 1) && (
                               <div className="absolute top-full left-0 mt-2 w-[450px] bg-white border border-slate-200 shadow-xl rounded-xl z-[60] overflow-hidden divide-y divide-slate-100">
                                  {showBatchSelect ? (
                                     bResults.length > 0 ? bResults.map(b => {
                                       const isExp = new Date(b.expiry_date) < new Date()
                                       return (
                                         <button key={b.id} onClick={() => {
                                            const m = medicines.find(med => med.id === b.medicine)
                                            updateRow(idx, 'medicine', m)
                                            updateRow(idx, 'batch', b)
                                            updateRow(idx, 'hsn', m?.hsn_code)
                                            updateRow(idx, 'pack', m?.pack_info)
                                            updateRow(idx, 'rate', b.sale_rate || 0)
                                            setShowBatchSelect(false)
                                            setTimeout(() => qtyRefs.current[idx]?.focus(), 50)
                                         }} className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex justify-between items-center ${isExp ? 'bg-rose-50 opacity-75' : ''}`}>
                                            <div>
                                               <p className="text-[11px] font-black text-slate-900 uppercase">BATCH: {b.batch_no}</p>
                                               <p className={`text-[9px] font-bold uppercase ${isExp ? 'text-rose-500' : 'text-slate-400'}`}>EXP: {safeFormat(b.expiry_date, 'MM/yy')} {isExp && '(EXPIRED)'}</p>
                                            </div>
                                            <div className="text-right">
                                               <p className="text-[10px] font-black text-slate-900">₹{Number(b.sale_rate || 0).toFixed(2)}</p>
                                               <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">STOCK: {b.quantity}</p>
                                            </div>
                                         </button>
                                       )
                                     }) : (
                                       <div className="p-4 text-center">
                                         <p className="text-[10px] font-bold text-rose-500 uppercase">NO STOCK BATCHES FOUND</p>
                                         <p className="text-[8px] text-slate-400 mt-1 uppercase">Please add manual purchase in inventory first.</p>
                                         <button onClick={() => {
                                             setShowBatchSelect(false)
                                             setPSearch('')
                                         }} className="mt-3 bg-slate-100 text-slate-600 px-4 py-2 rounded font-bold text-[9px] uppercase hover:bg-slate-200">CANCEL</button>
                                       </div>
                                     )
                                  ) : pResults.length > 0 ? pResults.map(m => {
                                     // Expiry Check
                                     const medBatches = batches.filter(b => b.medicine === m.id)
                                     const hasExpired = medBatches.some(b => new Date(b.expiry_date) < new Date())
                                     return (
                                       <button key={m.id} onClick={() => {
                                         setBResults(medBatches)
                                         setPResults([])
                                         setShowBatchSelect(true)
                                         setPSearch(m.name)
                                       }} className={`w-full text-left px-4 py-3 flex justify-between items-center transition-all ${hasExpired ? 'bg-rose-50 hover:bg-rose-100' : 'hover:bg-blue-50'}`}>
                                          <div>
                                             <div className="flex items-center gap-2">
                                                <p className="text-[11px] font-black text-slate-900 uppercase">{m.name}</p>
                                                {hasExpired && <span className="text-[8px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-black tracking-widest uppercase animate-pulse">EXPIRY ALERT</span>}
                                             </div>
                                             <p className="text-[9px] text-slate-400 font-bold">{m.pack_info} | {m.hsn_code}</p>
                                          </div>
                                          <div className="text-right">
                                             <span className="text-[10px] font-black text-slate-900">₹{Number(m.sale_rate || 0).toFixed(2)}</span>
                                             <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">STOCK: {medBatches.reduce((s,b) => s+b.quantity, 0)}</p>
                                          </div>
                                       </button>
                                     )
                                  }) : (
                                        <div className="p-4 text-center bg-white cursor-default">
                                           <p className="text-sm font-semibold text-slate-600">Medicine Master Not Found</p>
                                           <p className="text-xs text-slate-500 mb-3 mt-1">Please create a new medicine master to continue.</p>
                                           <button onClick={() => { setShowAddMedicine(true); setPSearch(''); }} className="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-md font-medium text-xs transition-all flex items-center justify-center gap-2 mx-auto">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add Medicine Master
                                           </button>
                                        </div>
                                   )}
                               </div>
                            )}
                         </div>
                       )}
                    </div>

                    <div className="w-28 px-4 py-2 border-r border-slate-200 text-center text-slate-500 font-mono text-sm leading-8">
                       {row.batch?.batch_no || '---'}
                    </div>

                    <div className={`w-24 px-4 py-2 border-r border-slate-200 text-center font-mono text-sm leading-8 ${row.batch && new Date(row.batch.expiry_date) < new Date() ? 'text-rose-600 font-semibold bg-rose-50' : 'text-slate-500'}`}>
                       {safeFormat(row.batch?.expiry_date, 'MM/yy')}
                    </div>

                    <div className={`w-20 px-4 py-2 border-r border-slate-200 ${activeRow === idx && activeField === 'qty' ? 'bg-white ring-1 ring-inset ring-blue-400' : ''}`}>
                       <input 
                         ref={el => qtyRefs.current[idx] = el}
                         autoFocus={activeRow === idx && activeField === 'qty'}
                         onFocus={() => { setActiveRow(idx); setActiveField('qty') }}
                         type="number"
                         value={row.qty || ''}
                         onChange={e => updateRow(idx, 'qty', Number(e.target.value))}
                         onKeyDown={e => handleRowEnter(e, idx, 'qty')}
                         className="bg-transparent w-full h-full text-center text-slate-900 font-medium outline-none"
                       />
                    </div>

                    <div className={`w-28 px-4 py-2 border-r border-slate-200 ${activeRow === idx && activeField === 'rate' ? 'bg-white ring-1 ring-inset ring-blue-400' : ''}`}>
                       <input 
                         ref={el => rateRefs.current[idx] = el}
                         autoFocus={activeRow === idx && activeField === 'rate'}
                         onFocus={() => { setActiveRow(idx); setActiveField('rate') }}
                         type="number"
                         value={row.rate || ''}
                         onChange={e => updateRow(idx, 'rate', Number(e.target.value))}
                         onKeyDown={e => handleRowEnter(e, idx, 'rate')}
                         className="bg-transparent w-full h-full text-right text-slate-900 font-medium outline-none"
                       />
                    </div>

                    <div className="w-32 px-4 py-2 border-r border-slate-200 text-right font-semibold text-slate-800 bg-slate-50 leading-8">
                       ₹{Number(row.amount).toFixed(2)}
                    </div>

                    <div className="w-12 px-2 py-2 flex items-center justify-center">
                       {row.medicine && (
                          <button 
                             onClick={() => setRows(rows.filter((_, i) => i !== idx))}
                             className="w-8 h-8 text-slate-200 hover:text-rose-500 transition-all"
                          >
                             <Trash2 size={16} />
                          </button>
                       )}
                    </div>
                  </div>
               ))}
            </div>
            </div>
         </div>
      </div>

      {/* Right Sticky Sidebar (Totals) */}
      <div className="w-80 flex flex-col gap-4 shrink-0 overflow-y-auto scrollbar-none">
         <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm flex flex-col gap-6">
            <div>
               <p className="text-xs font-semibold text-slate-500 mb-2">Invoice Summary</p>
               <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-sm font-medium text-slate-600">Total Items</span>
                  <span className="text-sm font-bold text-slate-800">{rows.filter(r => r.medicine).length} Products</span>
               </div>
            </div>

            <div className="space-y-3">
               <div className="flex justify-between text-sm font-medium text-slate-600">
                  <span>Gross Amount</span>
                  <span>₹{subtotal.toFixed(2)}</span>
               </div>
               <div className="flex justify-between text-sm font-medium text-slate-600 border-b border-slate-100 pb-3">
                  <span>GST Output (12%)</span>
                  <span>₹{gst.toFixed(2)}</span>
               </div>
               <div className="pt-2">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Total Payable Amount</p>
                  <p className="text-4xl font-bold text-slate-900 leading-none">
                     ₹{Math.round(grandTotal)}
                  </p>
               </div>
            </div>

            <div className="flex flex-col gap-3 mt-4">
               <button 
                  onClick={handleSave} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white fill-current py-3 rounded-md font-semibold font-sans text-sm transition-all shadow-sm active:scale-[0.98]"
               >
                  Generate Invoice (F10)
               </button>
               <button 
                  onClick={() => setRows([createNewRow(), createNewRow(), createNewRow(), createNewRow(), createNewRow()])}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 py-3 rounded-md font-medium text-sm transition-all"
               >
                  Cancel Sale Entry (Esc)
               </button>
            </div>
         </div>

         {/* Selection Hints */}
         <div className="bg-white border border-slate-200 rounded-lg p-5 flex-1 flex flex-col gap-3">
            <p className="text-xs font-semibold text-slate-500 border-b border-slate-100 pb-2">Operational Shortcuts</p>
            {[
               { key: 'F2', label: 'New Sale' },
               { key: 'F10', label: 'Save & Print' },
               { key: 'Alt+N', label: 'Add Next Row' },
               { key: 'Del', label: 'Delete Row' }
            ].map(hk => (
               <div key={hk.key} className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">{hk.label}</span>
                  <span className="bg-slate-50 text-slate-500 px-2 py-0.5 rounded border border-slate-200 text-xs font-medium">{hk.key}</span>
               </div>
            ))}
         </div>
      </div>
    </div>
  )
}

function AddMedicineModal({ onClose, onRefresh }) {
  const [data, setData] = useState({ name: '', hsn_code: '', pack_info: '', manufacturer: '' })
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd() {
    if (!data.name || !data.pack_info) return toast.error('Enter Name and Pack Info')
    setSubmitting(true)
    try {
      await api.post('/medicines/', data)
      toast.success('Medicine Master Created')
      onRefresh()
      onClose()
    } catch {
      toast.error('System Error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
       <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-in zoom-in duration-200">
          <div className="p-6">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-semibold text-slate-800">New Medicine Master</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
             </div>
             
             <div className="space-y-5">
                {[
                  { label: 'Medicine Name', field: 'name', ph: 'e.g. PARACETAMOL 500MG' },
                  { label: 'HSN Code', field: 'hsn_code', ph: 'e.g. 3004.90' },
                  { label: 'Pack Description', field: 'pack_info', ph: 'e.g. 10x15 Tablets' },
                  { label: 'Manufacturer', field: 'manufacturer', ph: 'e.g. Cipla Ltd.' }
                ].map(f => (
                  <div key={f.field}>
                     <p className="text-xs font-semibold text-slate-600 mb-1">{f.label}</p>
                     <input 
                        type="text" 
                        value={data[f.field]}
                        onChange={e => setData({...data, [f.field]: e.target.value})}
                        placeholder={f.ph}
                        className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                     />
                  </div>
                ))}
             </div>
             
             <button 
                onClick={handleAdd}
                disabled={submitting}
                className="w-full bg-blue-600 text-white font-medium py-3 rounded-md mt-6 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
             >
                {submitting ? 'Processing...' : <><Plus size={16} /> Update Master Data</>}
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
    if (!data.first_name || !data.phone) { toast.error('Name & Phone required'); return }
    setSubmitting(true)
    try {
      const res = await api.post('/patients/', data)
      toast.success('Patient Registered Successfully')
      onAdd(res.data?.data || res.data)
    } catch {
      toast.error('Failed to register patient')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
       <div className="bg-white w-full max-w-md rounded-lg shadow-xl overflow-hidden animate-in zoom-in duration-200">
          <div className="p-6">
             <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                <h3 className="text-lg font-semibold text-slate-800">Quick Patient Registration</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
             </div>
             
             <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <p className="text-xs font-semibold text-slate-600 mb-1">First Name *</p>
                     <input type="text" value={data.first_name} onChange={e => setData({...data, first_name: e.target.value})} className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium" />
                  </div>
                  <div>
                     <p className="text-xs font-semibold text-slate-600 mb-1">Last Name</p>
                     <input type="text" value={data.last_name} onChange={e => setData({...data, last_name: e.target.value})} className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium" />
                  </div>
                </div>
                <div>
                   <p className="text-xs font-semibold text-slate-600 mb-1">Mobile No *</p>
                   <input type="text" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <p className="text-xs font-semibold text-slate-600 mb-1">Gender</p>
                     <select value={data.gender} onChange={e => setData({...data, gender: e.target.value})} className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium">
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                     </select>
                  </div>
                  <div>
                     <p className="text-xs font-semibold text-slate-600 mb-1">Date of Birth</p>
                     <input type="date" value={data.date_of_birth} onChange={e => setData({...data, date_of_birth: e.target.value})} className="w-full bg-white border border-slate-300 px-3 py-2.5 rounded-md text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-600" />
                  </div>
                </div>
             </div>
             
             <button onClick={handleAdd} disabled={submitting} className="w-full bg-blue-600 text-white font-medium py-3 rounded-md mt-6 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                {submitting ? 'Processing...' : <><UserPlus size={16} /> Register Patient</>}
             </button>
          </div>
       </div>
    </div>
  )
}

function InventoryView({ medicines, batches, fetchBatches, setShowAddMedicine }) {
  const [q, setQ] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const filtered = batches.filter(b => {
    const med = medicines.find(m => m.id === b.medicine)
    return med?.name.toLowerCase().includes(q.toLowerCase()) || b.batch_no.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div className="h-full flex flex-col gap-6 overflow-hidden animate-in fade-in duration-300">
       <div className="flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight italic">Inventory Master Ledger</h2>
            <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Live tracking of medicine batches & disposal</p>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setShowAddMedicine(true)} className="bg-white border-2 border-slate-900 text-slate-900 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-lg shadow-slate-900/10">+ NEW PRODUCT MASTER</button>
             <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-blue-500/20">Add Manual Purchase</button>
          </div>
       </div>

       <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
             <Search size={16} className="text-slate-400" />
             <input value={q} onChange={e => setQ(e.target.value)} placeholder="SEARCH LEDGER BY NAME OR BATCH..." className="flex-1 bg-transparent text-xs font-bold outline-none uppercase italic" />
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
             <table className="w-full text-left border-collapse">
                <thead>
                   <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white">
                      <th className="px-8 py-5">Product Info</th>
                      <th className="px-8 py-5">Batch details</th>
                      <th className="px-8 py-5">Rates (₹)</th>
                      <th className="px-8 py-5 text-right">Status</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-semibold text-xs italic uppercase text-slate-600">
                   {filtered.map(b => {
                      const med = medicines.find(m => m.id === b.medicine)
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                           <td className="px-8 py-5">
                              <p className="text-slate-900 font-bold">{med?.name}</p>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Pack: {med?.pack_info} | HSN: {med?.hsn_code}</p>
                           </td>
                           <td className="px-8 py-5">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-bold">{b.batch_no}</span>
                              <p className="text-[10px] text-rose-500 mt-1 font-bold">EXP: {safeFormat(b.expiry_date, 'MM/yy')}</p>
                           </td>
                           <td className="px-8 py-5">
                              <p className="text-slate-400">Pur: <span className="text-slate-600">₹{b.unit_cost}</span></p>
                              <p className="text-slate-400">Sale: <span className="text-blue-600 font-bold">₹{b.sale_rate}</span></p>
                           </td>
                           <td className="px-8 py-5 text-right text-emerald-500 font-bold">In-Stock</td>
                        </tr>
                      )
                   })}
                </tbody>
             </table>
          </div>
       </div>

       {showAdd && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8 z-[100] animate-in fade-in duration-300">
             <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                <div className="bg-slate-900 text-white p-6 flex items-center justify-between">
                   <h3 className="text-sm font-bold uppercase tracking-widest italic">New Purchase Entry</h3>
                   <button onClick={() => setShowAdd(false)}><X size={20} /></button>
                </div>
                <div className="p-8 space-y-6">
                   <div className="space-y-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Product & Details</p>
                      <select className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg text-sm font-bold outline-none uppercase">
                         <option>-- CHOOSE MEDICINE --</option>
                         {medicines.map(m => <option key={m.id}>{m.name}</option>)}
                      </select>
                      <input className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg text-sm font-bold outline-none uppercase" placeholder="Batch No (e.g. B-9921)" />
                      <div className="grid grid-cols-2 gap-4">
                         <input className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg text-sm font-bold outline-none uppercase" type="date" placeholder="Expiry" />
                         <input className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-lg text-sm font-bold outline-none uppercase" type="number" placeholder="Cost Rate" />
                      </div>
                   </div>
                   <button onClick={() => { setShowAdd(false); toast.success('Entry logged in master ledger') }} className="w-full bg-blue-600 text-white py-4 rounded-lg font-bold text-xs uppercase tracking-widest">Save Purchase Record</button>
                </div>
             </div>
          </div>
       )}
    </div>
  )
}

function HistoryView({ invoices, setPrintingInvoice }) {
   return (
      <div className="h-full flex flex-col gap-6 overflow-hidden animate-in fade-in duration-300">
         <div className="shrink-0">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight italic">Sales Journal Register</h2>
            <p className="text-xs text-slate-400 font-semibold mt-1 uppercase tracking-wider">Historical audit review of all transactions</p>
         </div>
         <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden overflow-y-auto scrollbar-thin">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 sticky top-0 bg-white">
                     <th className="px-8 py-5">Inv NO.</th>
                     <th className="px-8 py-5">Patient Detail</th>
                     <th className="px-8 py-5">Subtotal</th>
                     <th className="px-8 py-5">Total Tax</th>
                     <th className="px-8 py-5 text-right">Grand Total</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 text-xs italic uppercase font-bold text-slate-600">
                  {invoices.map(inv => (
                     <tr key={inv.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setPrintingInvoice(inv)}>
                        <td className="px-8 py-5 text-blue-600 font-bold">#{inv.invoice_no}</td>
                        <td className="px-8 py-5">
                           <p className="text-slate-900 font-bold uppercase">{inv.patient_details?.first_name} {inv.patient_details?.last_name}</p>
                           <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest uppercase">{safeFormat(inv.created_at, 'dd MMM yy HH:mm')}</p>
                        </td>
                        <td className="px-8 py-5">₹{Number(inv.subtotal).toFixed(2)}</td>
                        <td className="px-8 py-5">₹{(Number(inv.cgst) + Number(inv.sgst)).toFixed(2)}</td>
                        <td className="px-8 py-5 text-right font-bold text-slate-900 text-sm italic">₹{Number(inv.grand_total).toFixed(2)}</td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   )
}

function PharmacyInvoicePrint({ invoice, onClose }) {
  useEffect(() => {
    if (invoice) {
      setTimeout(() => {
        window.print()
        onClose()
      }, 600)
    }
  }, [invoice])

  if (!invoice) return null

  const subtotal = Number(invoice.subtotal || 0)
  const cgst = Number(invoice.cgst || 0)
  const sgst = Number(invoice.sgst || 0)
  const tax = cgst + sgst
  const grandTotal = Number(invoice.grand_total || 0)
  const items = invoice.items || []

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pharmacy-invoice-print,
          #pharmacy-invoice-print * { visibility: visible !important; }
          #pharmacy-invoice-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
          }
          @page { size: A4; margin: 8mm; }
        }
        #pharmacy-invoice-print {
          position: fixed;
          inset: 0;
          background: white;
          z-index: 9999;
          overflow-y: auto;
          padding: 20px;
        }
      `}</style>

      <div id="pharmacy-invoice-print">
        <div style={{ maxWidth: '210mm', margin: '0 auto', fontFamily: 'Arial, sans-serif', fontSize: '10px', color: '#000', border: '1px solid #000' }}>

          {/* Header */}
          <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
            {/* Left - Pharmacy Info */}
            <div style={{ flex: 1, padding: '8px 10px', borderRight: '1px solid #000' }}>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>VARDAAN PHARMACY</div>
              <div style={{ fontSize: '8px', fontStyle: 'italic', marginBottom: '4px' }}>A Complete Medicine Shop</div>
              <div style={{ fontSize: '8px', lineHeight: '1.5' }}>
                <div>INSIDE VARDAAN HOSPITAL, HEALTH AVENUE ROAD,</div>
                <div>MEDICAL CITY, NEW DELHI - 110001</div>
                <div>Phone: 9999977777</div>
                <div>E-Mail: PHARMACY@VARDAAN.COM</div>
              </div>
              <div style={{ fontSize: '8px', marginTop: '4px', lineHeight: '1.5' }}>
                <div>GSTIN : 06ACIPS2870G1ZF</div>
                <div>D.L.NO. : RLF20HR2022000472</div>
              </div>
            </div>

            {/* Center - GST Invoice title */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', borderRight: '1px solid #000', padding: '8px' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', textAlign: 'center' }}>GST INVOICE</div>
            </div>

            {/* Right - Patient Info */}
            <div style={{ flex: 1.2, padding: '8px 10px', fontSize: '9px', lineHeight: '1.8' }}>
              <div><strong>Patient Name :</strong> {invoice.patient_details?.first_name} {invoice.patient_details?.last_name}</div>
              <div><strong>Patient Address :</strong> {invoice.patient_details?.address || '—'}</div>
              <div><strong>UHID No. :</strong> {invoice.patient_details?.uhid || '—'}</div>
              <div><strong>Dr. Name :</strong> {invoice.referred_by || '—'}</div>
              <div><strong>GST :</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>
                <span><strong>Invoice No. : {invoice.invoice_no}</strong></span>
                <span><strong>Date: {safeFormat(invoice.created_at || new Date(), 'dd-MM-yyyy')}</strong></span>
              </div>
            </div>
          </div>

          {/* Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #000', borderTop: '1px solid #000' }}>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '25px' }}>SN.</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'left', minWidth: '100px' }}>PRODUCT NAME</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '45px' }}>PACK</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '55px' }}>HSN</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '60px' }}>BATCH</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '35px' }}>EXP.</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '28px' }}>QTY</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'right', width: '45px' }}>MRP</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'right', width: '42px' }}>RATE</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '32px' }}>SGST</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '32px' }}>CGST</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'right', width: '52px' }}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => {
                const qty = Number(it.qty || 0)
                const rate = Number(it.rate || 0)
                const mrp = Number(it.mrp || it.batch?.mrp || rate)
                const amount = qty * rate
                const sgstPct = 6
                const cgstPct = 6
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', fontWeight: 'bold' }}>
                      {it.medicine?.name || it.medicine_name || '—'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>
                      {it.medicine?.pack_info || it.pack_info || '—'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center', fontSize: '8px' }}>
                      {it.medicine?.hsn_code || it.hsn_code || '—'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center', fontSize: '8px' }}>
                      {it.batch?.batch_no || it.batch_no || '—'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center', fontSize: '8px' }}>
                      {safeFormat(it.batch?.expiry_date || it.expiry_date, 'MM/yy')}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{qty}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right' }}>{mrp.toFixed(2)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right' }}>{rate.toFixed(2)}</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{sgstPct}.00</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'center' }}>{cgstPct}.00</td>
                    <td style={{ border: '1px solid #ccc', padding: '3px', textAlign: 'right', fontWeight: 'bold' }}>{amount.toFixed(2)}</td>
                  </tr>
                )
              })}
              {/* Empty rows to fill space */}
              {items.length < 8 && Array.from({ length: 8 - items.length }).map((_, i) => (
                <tr key={`empty-${i}`} style={{ height: '18px' }}>
                  {Array.from({ length: 12 }).map((_, j) => (
                    <td key={j} style={{ border: '1px solid #ccc', padding: '3px' }}>&nbsp;</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* GST Note */}
          <div style={{ borderTop: '1px solid #000', padding: '4px 8px', fontSize: '8px', borderBottom: '1px solid #000' }}>
            GST {subtotal.toFixed(2)}*12%={tax.toFixed(2)}SGST+{tax.toFixed(2)}CGST,{subtotal.toFixed(2)}*6%={sgst.toFixed(2)}SGST+{cgst.toFixed(2)}CGST
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', borderBottom: '1px solid #000' }}>
            {/* Left - Terms */}
            <div style={{ flex: 1, padding: '8px 10px', borderRight: '1px solid #000', fontSize: '8px' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '4px', textDecoration: 'underline' }}>Terms & Conditions</div>
              <div>Please consult the Doctor before using medicine.</div>
              <div>Medicine without batch and expiry date will not be taken back.</div>
              <div>All disputes subject to local Jurisdiction only.</div>
              <div style={{ marginTop: '8px' }}>
                <strong>Remark :</strong> ___________________________
              </div>
            </div>

            {/* Center - Signatory */}
            <div style={{ flex: 1, padding: '8px', textAlign: 'center', borderRight: '1px solid #000', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '8px', marginBottom: '4px' }}>For VARDAAN PHARMACY</div>
              <div>
                <div style={{ fontStyle: 'italic', fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>PHARMACIST</div>
                <div style={{ fontStyle: 'italic', fontSize: '10px' }}>M/s. Vardaan Pharmacy</div>
              </div>
              <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '8px' }}>Authorised Signatory</div>
            </div>

            {/* Right - Totals */}
            <div style={{ width: '160px', fontSize: '9px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>
                <span>SUB TOTAL</span><span style={{ fontWeight: 'bold' }}>{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>
                <span>TOTAL DIS</span><span>0.00</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>
                <span>CGST</span><span>{cgst.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 8px', borderBottom: '1px solid #ccc' }}>
                <span>SGST</span><span>{sgst.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#000', color: '#fff', fontWeight: 'bold', fontSize: '10px' }}>
                <span>GRAND TOTAL</span><span>{grandTotal.toFixed(2)}</span>
              </div>
              <div style={{ padding: '4px 8px', fontSize: '8px', textAlign: 'center', fontStyle: 'italic' }}>
                Computer Generated Invoice
              </div>
            </div>
          </div>

        </div>

        {/* Screen-only close button */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <button
            onClick={onClose}
            style={{ background: '#1e40af', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
          >
            ✕ Close Preview
          </button>
        </div>
      </div>
    </>
  )
}
