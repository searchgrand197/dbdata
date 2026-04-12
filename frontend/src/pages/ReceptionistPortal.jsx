import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  Users, Printer, Plus, Tv, ArrowRight, Search, Monitor,
  Bed, AlertTriangle, FileText, UserPlus, Hospital, LogOut,
  ChevronDown, ChevronRight, ClipboardList, Activity,
  XCircle, CheckCircle, Clock, RefreshCw, Eye, PlusCircle,
  Wind, IndianRupee, Receipt, Trash2, CreditCard, Bell, Phone, X,
} from 'lucide-react'
import { getRoomsConfig, saveRoomsConfig, getTvGroupsConfig, saveTvGroupsConfig } from '../utils/rooms'
import BedSelector from '../components/BedSelector'
import OpdGeneratorTab from '../components/OpdTemplateEditor/OpdGeneratorTab'

// ─── Sidebar Nav Config ───────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: 'OPD',
    items: [
      { id: 'opd', label: 'Token Queue', icon: Users },
      { id: 'opd_template', label: 'OPD Template', icon: Printer },
    ],
  },
  {
    label: 'IPD',
    items: [
      { id: 'ipd', label: 'Active Admissions', icon: Bed },
      { id: 'new_admission', label: 'New Admission', icon: PlusCircle },
    ],
  },
  {
    label: 'Emergency',
    items: [{ id: 'emergency', label: 'Emergency Cases', icon: AlertTriangle }],
  },
  {
    label: 'Patients',
    items: [
      { id: 'patients', label: 'Patient List', icon: ClipboardList },
      { id: 'register', label: 'Register Patient', icon: UserPlus },
    ],
  },
  {
    label: 'Billing',
    items: [{ id: 'payment_slip', label: 'Payment Slip', icon: Receipt }],
  },
  {
    label: 'Discharge',
    items: [{ id: 'discharge', label: 'Discharge Summary', icon: FileText }],
  },
  {
    label: 'Setup',
    items: [{ id: 'tv', label: 'TV Screens', icon: Monitor }],
  },
  {
    label: 'Staff',
    items: [{ id: 'attendance', label: 'Attendance', icon: Clock }],
  },
]

// ─── Follow-Up Alert Banner ────────────────────────────────────────────────────
function FollowUpAlertBanner() {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  async function fetchAlerts() {
    try {
      const { data } = await api.get('/follow-up-alerts/');
      setAlerts(data);
    } catch { }
  }

  const visible = alerts.filter(a => !dismissed.has(a.id));
  const todayAlerts = visible.filter(a => a.is_today);
  const tomorrowAlerts = visible.filter(a => a.is_tomorrow);

  if (visible.length === 0) return null;

  return (
    <div className={`border-b shadow-sm ${
      todayAlerts.length > 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
    }`}>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          <div className={`relative flex items-center justify-center w-7 h-7 rounded-full ${
            todayAlerts.length > 0 ? 'bg-red-500' : 'bg-amber-500'
          } text-white`}>
            <Bell size={13} />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border-2 border-current text-[9px] font-black flex items-center justify-center ${
              todayAlerts.length > 0 ? 'text-red-600 border-red-500' : 'text-amber-600 border-amber-500'
            }">{visible.length}</span>
          </div>
          <span className={`text-xs font-extrabold uppercase tracking-wider ${
            todayAlerts.length > 0 ? 'text-red-700' : 'text-amber-700'
          }`}>
            {todayAlerts.length > 0 ? `🚨 ${todayAlerts.length} Follow-up Due TODAY` : ''}
            {todayAlerts.length > 0 && tomorrowAlerts.length > 0 ? '  •  ' : ''}
            {tomorrowAlerts.length > 0 ? `🔔 ${tomorrowAlerts.length} Follow-up Tomorrow` : ''}
          </span>
        </div>
        <button onClick={() => setMinimized(m => !m)}
          className="text-xs text-gray-500 hover:text-gray-800 font-bold px-2 py-1 rounded hover:bg-white/60 transition-all">
          {minimized ? 'Show ▼' : 'Hide ▲'}
        </button>
      </div>

      {/* Alert cards */}
      {!minimized && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 pt-1">
          {visible.map(alert => (
            <div key={alert.id} className={`flex-shrink-0 w-72 rounded-xl border p-3 shadow-sm relative ${
              alert.is_today
                ? 'bg-red-100 border-red-300'
                : 'bg-amber-100 border-amber-300'
            }`}>
              {/* Dismiss */}
              <button onClick={() => setDismissed(d => new Set([...d, alert.id]))}
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700">
                <X size={12} />
              </button>

              <div className="flex items-start gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0 ${
                  alert.is_today ? 'bg-red-500' : 'bg-amber-500'
                }`}>
                  {alert.is_today ? '🔔' : '📅'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800 truncate">{alert.patient_name}</p>
                  <p className="text-[10px] text-gray-500 font-mono">{alert.uhid}</p>
                </div>
              </div>

              <p className="text-[10px] text-gray-600 mb-1 line-clamp-2">
                {alert.visit_reason || alert.revisit_advice || 'Follow-up consultation'}
              </p>

              <div className="flex items-center justify-between mt-2">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  alert.is_today
                    ? 'bg-red-200 text-red-800'
                    : 'bg-amber-200 text-amber-800'
                }`}>
                  {alert.is_today ? 'DUE TODAY' : 'DUE TOMORROW'}
                </span>

                {alert.patient_phone && (
                  <a href={`tel:${alert.patient_phone}`}
                    className="flex items-center gap-1.5 text-[11px] font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-all shadow-sm">
                    <Phone size={11} /> Call
                  </a>
                )}
              </div>

              {alert.doctor_name && (
                <p className="text-[10px] text-gray-400 mt-1.5">Dr. {alert.doctor_name}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── OPD Slip Print ──────────────────────────────────────────────────────────
function PrintSlip({ visit, onClose }) {
  const [layoutFields, setLayoutFields] = useState([])
  const [fieldValues, setFieldValues] = useState({})
  const [loadingTemplate, setLoadingTemplate] = useState(true)

  useEffect(() => {
    const loadOpdLayout = async () => {
      try {
        const res = await fetch('/api/templates')
        if (res.ok) {
          const data = await res.json()
          const single = (data.templates || []).find(t => t.key === 'single')
          if (single?.layout?.fields) {
            const fields = Object.keys(single.layout.fields)
            setLayoutFields(fields)
            const initValues = {}
            for (const f of fields) {
              const lowerF = f.toLowerCase()
              if (lowerF.includes('name') || lowerF.includes('patient')) initValues[f] = visit.patient_name || ''
              else if (lowerF.includes('date')) initValues[f] = visit.visit_date || ''
              else if (lowerF.includes('reg') || lowerF.includes('uhid')) initValues[f] = visit.patient_uhid || ''
              else if (lowerF.includes('phone') || lowerF.includes('mobile') || lowerF.includes('contact')) initValues[f] = visit.patient_phone || ''
              else if (lowerF.includes('token') || lowerF.includes('queue') || lowerF.includes('no')) initValues[f] = String(visit.token_number || '')
              else if (lowerF.includes('complaint') || lowerF.includes('reason')) initValues[f] = visit.chief_complaint || ''
              else if (lowerF.includes('doctor') || lowerF.includes('doc')) initValues[f] = visit.doc_name || ''
              else if (lowerF.includes('age')) initValues[f] = visit.patient_age ? String(visit.patient_age) : ''
              else if (lowerF.includes('gender') || lowerF.includes('sex')) initValues[f] = visit.patient_gender || ''
              else if (lowerF.includes('address')) initValues[f] = visit.patient_address || ''
              else if (lowerF.includes('city') || lowerF.includes('town')) initValues[f] = visit.patient_city || ''
              else if (lowerF.includes('state')) initValues[f] = visit.patient_state || ''
              else initValues[f] = ''
            }
            setFieldValues(initValues)
          }
        }
      } catch (err) {
        // silently fail and fallback to basic slip
      } finally {
        setLoadingTemplate(false)
      }
    }
    loadOpdLayout()
  }, [visit])

  function printBasicSlip() {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>OPD Slip</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 300px; }
        .logo { font-size: 18px; font-weight: bold; color: #1d4ed8; border-bottom: 2px solid #1d4ed8; padding-bottom: 8px; margin-bottom: 12px; }
        .token { font-size: 64px; font-weight: 900; color: #1d4ed8; text-align: center; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
        .label { color: #6b7280; }
        .footer { margin-top: 16px; padding-top: 8px; border-top: 1px dashed #ccc; font-size: 11px; color: #9ca3af; text-align: center; }
      </style></head>
      <body>
      <div class="logo">🏥 HMS Hospital</div>
      <div class="token">${visit.room?.prefix || ''}${visit.token_number}</div>
      <div class="row"><span class="label">Patient</span><span>${visit.patient_name}</span></div>
      <div class="row"><span class="label">Date</span><span>${visit.visit_date}</span></div>
      <div class="row"><span class="label">Doctor</span><span>${visit.room?.label || visit.doc_name || 'OPD'}</span></div>
      <div class="row"><span class="label">Complaint</span><span>${visit.chief_complaint || '-'}</span></div>
      <div class="footer">Please wait for your token to be called<br>Keep this slip safe</div>
      <script>window.onload = function() { window.print(); };</script>
      </body></html>
    `)
    w.document.close()
    onClose()
  }

  function printFullOpdSheet() {
    const params = new URLSearchParams(fieldValues).toString()
    window.open(`/print-slip?${params}`, '_blank')
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-[500] p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md my-auto flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Printer size={18} className="text-emerald-600"/> Print Options
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <XCircle size={22} strokeWidth={1.8} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto">
          <div className="text-center mb-5 bg-blue-50/50 rounded-xl py-4 border border-blue-100/50">
            <div className="text-5xl font-black text-blue-600 mb-1">
              {visit.room?.prefix || ''}{visit.token_number || visit.queue_number || ''}
            </div>
            <p className="font-bold text-gray-900 text-lg">{visit.patient_name}</p>
            <p className="text-sm font-medium text-gray-500">{visit.room?.label || visit.doc_name || 'OPD'}</p>
          </div>

          {loadingTemplate ? (
            <div className="flex justify-center py-4">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : layoutFields.length > 0 ? (
            <div className="mt-2">
              <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                A4 OPD Print Fields <span className="px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-700 text-[10px] font-bold">LIVE</span>
              </h3>
              <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                These fields reflect your OPD template configuration. Fill in any missing details before printing the main OPD slip.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {layoutFields.map(f => (
                  <div key={f} className="flex flex-col">
                    <label className="text-xs font-bold text-gray-600 mb-1 capitalize tracking-tight">{f}</label>
                    <input
                      type="text"
                      className="border border-gray-200 bg-gray-50/50 rounded-lg px-3 py-2 text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      value={fieldValues[f] || ''}
                      onChange={e => setFieldValues({...fieldValues, [f]: e.target.value})}
                      placeholder={f}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="p-4 border-t border-gray-100 shrink-0 flex gap-2">
          <button onClick={printBasicSlip} className="flex-1 bg-white border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-bold hover:bg-gray-50 hover:border-gray-300 transition-colors flex items-center justify-center gap-2">
            Thermal Slip
          </button>
          <button onClick={printFullOpdSheet} className="flex-[2] bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-extrabold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-md transition-colors">
            <Printer size={16} strokeWidth={2.5} /> A4 Print Sheet
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── OPD Section ──────────────────────────────────────────────────────────────
function OPDSection({ rooms }) {
  const [visits, setVisits] = useState([])
  const [doctors, setDoctors] = useState([])
  const [queueSearch, setQueueSearch] = useState('')
  const [printVisit, setPrintVisit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showQueue, setShowQueue] = useState(false)

  // Unified patient+OPD form
  const emptyForm = {
    phone: '',
    patient_name: '',
    gender: 'male',
    age: '',
    address_line1: '',
    city: 'Jind',
    state: 'Haryana',
    doctor: '',
    chief_complaint: '',
    visit_date: format(new Date(), 'yyyy-MM-dd'),
  }
  const [form, setForm] = useState(emptyForm)
  const [matchedPatient, setMatchedPatient] = useState(null)  // existing patient found by phone
  const [opdNewPersonSamePhone, setOpdNewPersonSamePhone] = useState(false) // register different person; same mobile → family link
  const samePhoneModeDigitsRef = useRef(null)
  const [samePhoneFamilyModalOpen, setSamePhoneFamilyModalOpen] = useState(false)
  const samePhoneModalDismissedKeyRef = useRef('')
  const samePhoneFamilyUseConfirmedKeyRef = useRef('')
  /** All patients in this hospital sharing the entered mobile (from /patients/by-phone/). */
  const [samePhoneFamilyList, setSamePhoneFamilyList] = useState([])
  const [lookingUp, setLookingUp] = useState(false)
  const today = format(new Date(), 'yyyy-MM-dd')
  const pollingRef = useRef(null)

  const submitActionRef = useRef('thermal')
  const [layoutFields, setLayoutFields] = useState([])
  const [templateValues, setTemplateValues] = useState({})

  function startAddAnotherPersonSamePhone() {
    const ten = form.phone.replace(/\D/g, '').slice(-10)
    if (ten.length < 10) return
    samePhoneModeDigitsRef.current = ten
    setSamePhoneFamilyModalOpen(false)
    setOpdNewPersonSamePhone(true)
    setMatchedPatient(null)
    setSamePhoneFamilyList([])
    samePhoneModalDismissedKeyRef.current = ''
    samePhoneFamilyUseConfirmedKeyRef.current = ''
    setForm(f => ({
      ...f,
      patient_name: '',
      gender: 'male',
      age: '',
      address_line1: '',
      city: 'Jind',
      state: 'Haryana',
    }))
  }

  useEffect(() => {
    fetchQueue()
    fetchDoctors()
    pollingRef.current = setInterval(fetchQueue, 15000)

    const loadOpdLayout = async () => {
      try {
        const res = await fetch('/api/templates')
        if (res.ok) {
          const data = await res.json()
          const single = (data.templates || []).find(t => t.key === 'single')
          if (single?.layout?.fields) {
            setLayoutFields(Object.keys(single.layout.fields))
          }
        }
      } catch (err) {}
    }
    loadOpdLayout()

    return () => clearInterval(pollingRef.current)
  }, [])

  const isCustomField = f => {
    const lowerF = f.toLowerCase()
    const handled = [
      'name', 'patient', 'date', 'time', 'token', 'queue', 'complaint', 'reason',
      'doctor', 'doc', 'age', 'gender', 'sex', 'phone', 'mobile', 'contact',
      'address', 'city', 'state'
    ]
    if (lowerF === 'no' || lowerF === 'token no' || lowerF === 'queue no') return false
    return !handled.some(kw => lowerF.includes(kw))
  }
  const customFields = layoutFields.filter(isCustomField)

  async function fetchDoctors() {
    try {
      const { data } = await api.get('/doctor-profiles/?limit=500')
      setDoctors(Array.isArray(data?.data) ? data.data : (data?.results || data || []))
    } catch {}
  }

  async function fetchQueue() {
    setLoading(true)
    try {
      const [v, d] = await Promise.all([
        api.get(`/opd-visits/?visit_date=${today}&limit=500`),
        api.get('/doctor-profiles/?limit=500'),
      ])
      const rawVisits = Array.isArray(v.data?.data) ? v.data.data : (v.data?.results || v.data || [])
      const doctorRows = Array.isArray(d.data?.data) ? d.data.data : (d.data?.results || d.data || [])
      setDoctors(doctorRows)
      setVisits(rawVisits.map(vis => ({
        ...vis,
        doc_name: doctorRows.find(x => x.user === vis.doctor_user)?.name || vis.doctor_user || '—',
      })))
    } catch { toast.error('Failed to load OPD queue') }
    finally { setLoading(false) }
  }

  // Patient lookup by phone or UHID; then load full record so receptionist can edit all fields
  useEffect(() => {
    const raw = form.phone.trim()
    if (raw.length < 3) {
      setMatchedPatient(null)
      setSamePhoneFamilyList([])
      setOpdNewPersonSamePhone(false)
      samePhoneModeDigitsRef.current = null
      samePhoneModalDismissedKeyRef.current = ''
      samePhoneFamilyUseConfirmedKeyRef.current = ''
      setSamePhoneFamilyModalOpen(false)
      setForm(f => ({
        ...f,
        first_name: '',
        last_name: '',
        gender: 'male',
        age: '',
        address_line1: '',
        city: 'Jind',
        state: 'Haryana',
      }))
      return
    }
    const digitsOnly = raw.replace(/\D/g, '')
    const looksLikePhone = /^[\d\s\-+()]+$/.test(raw) && digitsOnly.length > 0
    if (looksLikePhone && digitsOnly.length < 10) {
      setMatchedPatient(null)
      setSamePhoneFamilyList([])
      setOpdNewPersonSamePhone(false)
      samePhoneModeDigitsRef.current = null
      samePhoneModalDismissedKeyRef.current = ''
      samePhoneFamilyUseConfirmedKeyRef.current = ''
      setSamePhoneFamilyModalOpen(false)
      return
    }

    if (opdNewPersonSamePhone && samePhoneModeDigitsRef.current) {
      const ten = digitsOnly.slice(-10)
      if (ten.length === 10 && ten !== samePhoneModeDigitsRef.current) {
        setOpdNewPersonSamePhone(false)
        samePhoneModeDigitsRef.current = null
        // fall through — phone changed; run normal search again
      } else if (ten.length === 10 && ten === samePhoneModeDigitsRef.current) {
        setLookingUp(false)
        return
      }
    }

    let cancelled = false
    const t = setTimeout(async () => {
      setLookingUp(true)
      try {
        const isTenDigitPhone =
          looksLikePhone && digitsOnly.length >= 10 && !/[a-zA-Z]/.test(raw)
        const ten = digitsOnly.slice(-10)

        async function hydratePatientIntoForm(pt) {
          if (!pt?.id) return
          try {
            const detail = await api.get(`/patients/${pt.id}/`)
            if (cancelled) return
            const p = detail.data?.data || detail.data
            if (p) {
              setForm(f => ({
                ...f,
                patient_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || '',
                gender: p.gender || 'male',
                age: p.age != null && p.age !== '' ? String(p.age) : '',
                address_line1: p.address_line1 || '',
                city: p.city || '',
                state: p.state || '',
              }))
            }
          } catch {
            setForm(f => ({
              ...f,
              patient_name: [pt.first_name, pt.last_name].filter(Boolean).join(' ') || '',
              gender: pt.gender || 'male',
            }))
          }
        }

        let familyList = []

        if (isTenDigitPhone) {
          try {
            const bp = await api.get(`/patients/by-phone/?phone=${encodeURIComponent(ten)}`)
            familyList = Array.isArray(bp.data?.data)
              ? bp.data.data
              : Array.isArray(bp.data?.entity)
                ? bp.data.entity
                : []
          } catch { /* use fallback below */ }

          if (familyList.length === 0) {
            const { data } = await api.get(`/patients/?search=${encodeURIComponent(raw)}&limit=50`)
            const rows = Array.isArray(data?.data) ? data.data : (data?.results || data || [])
            familyList = rows.filter(row => {
              const d = String(row.phone || '').replace(/\D/g, '')
              return d.length >= 10 && d.slice(-10) === ten
            })
          }
        }

        if (cancelled) return

        if (familyList.length > 0) {
          setSamePhoneFamilyList(familyList)
          const pt = familyList[0]
          setMatchedPatient(pt)
          await hydratePatientIntoForm(pt)
        } else {
          setSamePhoneFamilyList([])
          const { data } = await api.get(`/patients/?search=${encodeURIComponent(raw)}&limit=5`)
          const rows = Array.isArray(data?.data) ? data.data : (data?.results || data || [])
          if (cancelled) return
          if (rows.length > 0) {
            const pt = rows[0]
            setMatchedPatient(pt)
            await hydratePatientIntoForm(pt)
          } else {
            setMatchedPatient(null)
            setForm(f => ({
              ...f,
              patient_name: '',
              gender: 'male',
              age: '',
              address_line1: '',
              city: '',
              state: '',
            }))
          }
        }
      } catch {
        if (!cancelled) {
          setMatchedPatient(null)
          setSamePhoneFamilyList([])
        }
      } finally {
        if (!cancelled) setLookingUp(false)
      }
    }, 500)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [form.phone, opdNewPersonSamePhone])

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      let patientId = matchedPatient?.id
      const rawLookup = form.phone.trim()
      const digitsOnly = rawLookup.replace(/\D/g, '')
      const looksLikeUhid = /[a-zA-Z]/.test(rawLookup) || /^[A-Z0-9]+-[A-Z0-9-]+$/i.test(rawLookup.replace(/\s/g, ''))

      // UHID typed but no match — do not create a fake patient with UHID as phone
      if (!patientId && looksLikeUhid) {
        toast.error('No patient found for this UHID. Check the number or use a mobile number to register a new patient.')
        setSubmitting(false)
        return
      }

      // Create patient if not found (phone path only)
      if (!patientId) {
        if (digitsOnly.length < 10) {
          toast.error('Enter at least 10 digits for a new patient mobile number, or a valid UHID to find an existing patient.')
          setSubmitting(false)
          return
        }
        const nameParts = (form.patient_name || '').trim().split(' ');
        const fName = nameParts[0] || 'Patient';
        const lName = nameParts.slice(1).join(' ') || '';
        const patRes = await api.post('/patients/', {
          first_name: fName,
          last_name: lName,
          phone: digitsOnly.slice(-10),
          gender: form.gender,
          patient_type: 'outpatient',
          ...(opdNewPersonSamePhone ? { link_with_existing_phone_patients: true } : {}),
          ...(form.age         ? { age: parseInt(form.age, 10) }    : {}),
          ...(form.address_line1 ? { address_line1: form.address_line1 } : {}),
          ...(form.city        ? { city: form.city }            : {}),
          ...(form.state       ? { state: form.state }          : {}),
        })
        patientId = (patRes.data?.data || patRes.data)?.id
      } else {
        // Existing patient — save receptionist edits before OPD
        // Only patch name if the receptionist actually filled it in
        const patch = {
          gender: form.gender,
          address_line1: form.address_line1 || '',
          city: form.city || '',
          state: form.state || '',
        }
        const trimmedName = (form.patient_name || '').trim()
        if (trimmedName && trimmedName !== 'Patient') {
          const nameParts = trimmedName.split(' ')
          patch.first_name = nameParts[0]
          patch.last_name = nameParts.slice(1).join(' ') || ''
        }
        if (form.age !== '' && form.age != null) {
          const a = parseInt(form.age, 10)
          if (!Number.isNaN(a)) patch.age = a
        }
        if (digitsOnly.length >= 10 && !/[a-zA-Z]/i.test(rawLookup)) {
          patch.phone = digitsOnly.slice(-10)
        }
        await api.patch(`/patients/${patientId}/`, patch)
      }

      // Create OPD visit
      const { data } = await api.post('/opd-visits/', {
        patient: patientId,
        visit_date: form.visit_date,
        chief_complaint: form.chief_complaint,
        doctor_user: form.doctor || null,
        status: 'waiting',
      })
      const payload = data?.data || data
      const selectedDoc = doctors.find(d => d.user === form.doctor || d.id === form.doctor)
      // Use form.patient_name if filled; otherwise fall back to the matched patient's name
      const ptName = (form.patient_name || '').trim() ||
        [matchedPatient?.first_name, matchedPatient?.last_name].filter(Boolean).join(' ') ||
        'Patient'
      toast.success(`Token #${payload?.token_number || payload?.queue_number || ''} assigned!`)

      if (submitActionRef.current === 'a4') {
        let printUhid = matchedPatient?.uhid || '';
        let printPhone = matchedPatient?.phone || '';

        const finalValues = { ...templateValues }
        for (const f of layoutFields) {
          const lowerF = f.toLowerCase()
          if (lowerF.includes('name') || lowerF.includes('patient')) finalValues[f] = finalValues[f] || ptName
          else if (lowerF.includes('date')) finalValues[f] = finalValues[f] || form.visit_date
          else if (lowerF.includes('reg') || lowerF.includes('uhid')) finalValues[f] = finalValues[f] || payload?.patient_uhid || printUhid || ''
          else if (lowerF.includes('phone') || lowerF.includes('mobile') || lowerF.includes('contact')) finalValues[f] = finalValues[f] || payload?.patient_phone || printPhone || form.phone.replace(/\D/g, '') || ''
          else if (lowerF.includes('token') || lowerF.includes('queue') || lowerF.includes('no')) finalValues[f] = finalValues[f] || String(payload?.token_number || payload?.queue_number || '')
          else if (lowerF.includes('complaint') || lowerF.includes('reason')) finalValues[f] = finalValues[f] || form.chief_complaint || ''
          else if (lowerF.includes('doctor') || lowerF.includes('doc')) finalValues[f] = finalValues[f] || selectedDoc?.name || ''
          else if (lowerF.includes('age')) finalValues[f] = finalValues[f] || form.age || ''
          else if (lowerF.includes('gender') || lowerF.includes('sex')) finalValues[f] = finalValues[f] || form.gender || ''
          else if (lowerF.includes('address')) finalValues[f] = finalValues[f] || form.address_line1 || ''
          else if (lowerF.includes('city') || lowerF.includes('town')) finalValues[f] = finalValues[f] || form.city || ''
          else if (lowerF.includes('state')) finalValues[f] = finalValues[f] || form.state || ''
        }
        const params = new URLSearchParams(finalValues).toString()
        window.open(`/print-slip?${params}`, '_blank')
      } else {
        setPrintVisit({ ...payload, patient_name: ptName, doc_name: selectedDoc?.name || '' })
      }

      setForm(emptyForm)
      setTemplateValues({})
      setMatchedPatient(null)
      setOpdNewPersonSamePhone(false)
      samePhoneModeDigitsRef.current = null
      samePhoneModalDismissedKeyRef.current = ''
      samePhoneFamilyUseConfirmedKeyRef.current = ''
      setSamePhoneFamilyModalOpen(false)
      setSamePhoneFamilyList([])
      fetchQueue()
    } catch (err) {
      const detail = err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed'
      toast.error(detail)
    } finally { setSubmitting(false) }
  }

  const filteredVisits = visits.filter(v =>
    !queueSearch || (v.patient_name || '').toLowerCase().includes(queueSearch.toLowerCase()) ||
    String(v.token_number || v.queue_number || '').includes(queueSearch)
  )

  const statusBadge = {
    waiting: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    in_consultation: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-600',
  }

  const lookupRaw = form.phone.trim()
  const lookupDigits = lookupRaw.replace(/\D/g, '')
  const looksLikeUhidInput = /[a-zA-Z]/.test(lookupRaw)
  const showNewPatientHint = !matchedPatient && !opdNewPersonSamePhone && !lookingUp && lookupDigits.length >= 10 && !looksLikeUhidInput
  const showUhidNoMatchHint = !matchedPatient && !lookingUp && looksLikeUhidInput && lookupRaw.length >= 4
  const showSamePhoneNewHint = opdNewPersonSamePhone && !matchedPatient && lookupDigits.length >= 10 && !looksLikeUhidInput
  const phoneFamilySessionKey =
    !looksLikeUhidInput && lookupDigits.length >= 10
      ? `phone-${lookupDigits.slice(-10)}`
      : ''

  const canOfferSamePhoneNew = Boolean(
    (samePhoneFamilyList.length > 0 || matchedPatient) &&
      lookupDigits.length >= 10 &&
      !looksLikeUhidInput,
  )

  const showReopenSamePhoneFamilyModal = Boolean(
    phoneFamilySessionKey &&
      samePhoneFamilyList.length > 0 &&
      !samePhoneFamilyModalOpen &&
      !opdNewPersonSamePhone &&
      samePhoneModalDismissedKeyRef.current === phoneFamilySessionKey &&
      samePhoneFamilyUseConfirmedKeyRef.current !== phoneFamilySessionKey,
  )

  function closeSamePhoneFamilyModalBackdrop() {
    if (phoneFamilySessionKey && samePhoneFamilyList.length > 0) {
      samePhoneModalDismissedKeyRef.current = phoneFamilySessionKey
    }
    setSamePhoneFamilyModalOpen(false)
  }

  function confirmSamePhoneUseExistingPatient() {
    if (phoneFamilySessionKey) {
      samePhoneModalDismissedKeyRef.current = phoneFamilySessionKey
      samePhoneFamilyUseConfirmedKeyRef.current = phoneFamilySessionKey
    }
    setSamePhoneFamilyModalOpen(false)
  }

  function reopenSamePhoneFamilyModal() {
    samePhoneModalDismissedKeyRef.current = ''
    setSamePhoneFamilyModalOpen(true)
  }

  async function selectPatientFromFamilyModal(pt) {
    if (!pt?.id) return
    setMatchedPatient(pt)
    try {
      const detail = await api.get(`/patients/${pt.id}/`)
      const p = detail.data?.data || detail.data
      if (p) {
        const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ')
        setForm(f => ({
          ...f,
          patient_name: fullName || f.patient_name,
          gender: p.gender || 'male',
          age: p.age != null && p.age !== '' ? String(p.age) : '',
          address_line1: p.address_line1 || '',
          city: p.city || '',
          state: p.state || '',
        }))
      }
    } catch {
      const fullName = [pt.first_name, pt.last_name].filter(Boolean).join(' ')
      setForm(f => ({
        ...f,
        patient_name: fullName || f.patient_name,
        gender: pt.gender || 'male',
      }))
    }
  }

  useEffect(() => {
    if (lookingUp || opdNewPersonSamePhone || looksLikeUhidInput) return
    const ten = lookupDigits.slice(-10)
    if (ten.length < 10) return
    if (!samePhoneFamilyList.length) return
    const key = `phone-${ten}`
    if (samePhoneModalDismissedKeyRef.current === key) return
    setSamePhoneFamilyModalOpen(true)
  }, [lookingUp, opdNewPersonSamePhone, lookupDigits, looksLikeUhidInput, samePhoneFamilyList.length])

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-base font-semibold text-gray-900 placeholder:text-gray-400 placeholder:font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none'
  const lbl = 'text-sm font-bold text-gray-800 mb-1 block tracking-tight'
  // Light fill when record was loaded from lookup (receptionist sees “prefilled” fields)
  const filledBg = matchedPatient
    ? 'bg-emerald-50/90 border-emerald-200/90 ring-1 ring-inset ring-emerald-100/60 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-400'
    : opdNewPersonSamePhone
      ? 'bg-amber-50/90 border-amber-200/90 ring-1 ring-inset ring-amber-100/60 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-400'
      : ''
  const inpFilled = `${inp} ${filledBg}`
  const lblFilled = matchedPatient ? `${lbl} text-emerald-900` : opdNewPersonSamePhone ? `${lbl} text-amber-900` : lbl

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Body ── */}
      <div className="flex gap-0 flex-1 min-h-0 overflow-hidden">

      {/* ── LEFT: Quick OPD Form ── */}
      <form onSubmit={handleSubmit}
        className="flex-1 w-full min-w-0 bg-white flex flex-col min-h-0 overflow-hidden">

        {/* Form header — flush under top bar; queue toggle inline */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white shrink-0 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-extrabold text-lg flex items-center gap-2"><Plus size={20} strokeWidth={2.5} /> New OPD Visit</h3>
            <p className="text-sm font-semibold text-emerald-100/95 leading-snug mt-0.5">Search by mobile or UHID, or register a new patient</p>
          </div>
          <button
            type="button"
            onClick={() => setShowQueue(q => !q)}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-extrabold border-2 transition-all ${
              showQueue
                ? 'bg-white text-emerald-700 border-white'
                : 'bg-white/15 text-white border-white/50 hover:bg-white/25'
            }`}
          >
            <Activity size={16} strokeWidth={2.5} />
            Queue
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden p-4 grid grid-cols-12 gap-x-3 gap-y-3 content-start auto-rows-min">

          {/* Phone / UHID — compact input; hints on the right in wide layout */}
          <div className="col-span-3">
            <label className={`${lblFilled} flex items-center gap-1.5`}>
              Phone or UHID *
              {showSamePhoneNewHint && (
                <span title="Registering new family member on this number" className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5 leading-none">
                  <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                  New · Family link
                </span>
              )}
              {showNewPatientHint && (
                <span title="No existing record — will register as new patient" className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5 leading-none">
                  <span className="w-1 h-1 rounded-full bg-blue-400 shrink-0" />
                  New patient
                </span>
              )}
              {showUhidNoMatchHint && (
                <span title="No patient found for this UHID" className="inline-flex items-center gap-1 text-[10px] font-medium text-red-700 bg-red-50 border border-red-200 rounded-full px-1.5 py-0.5 leading-none">
                  <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />
                  No match
                </span>
              )}
            </label>
            <div className="relative max-w-[14rem]">
              <input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Mobile or UHID"
                maxLength={40}
                className={`${inpFilled} pr-8 w-full`}
                required
              />
              {lookingUp && (
                <span className="absolute right-2 top-2 w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {matchedPatient && looksLikeUhidInput && (
              <div className="mt-1 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-1 text-xs">
                <CheckCircle size={12} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
                <span className="font-medium text-emerald-800 truncate">
                  {[matchedPatient.first_name, matchedPatient.last_name].filter(Boolean).join(' ')} · {matchedPatient.uhid}
                </span>
              </div>
            )}
            {showReopenSamePhoneFamilyModal && (
              <button
                type="button"
                onClick={reopenSamePhoneFamilyModal}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-700 hover:text-emerald-900 hover:underline"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Family members on this number
              </button>
            )}
          </div>

          <div className="col-span-3">
            <label className={lblFilled}>Patient Name</label>
            <input value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} placeholder="Full Name" className={inpFilled} />
          </div>
          <div className="col-span-3">
            <label className={lblFilled}>Age</label>
            <input type="number" min="0" max="150" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="yrs" className={inpFilled} />
          </div>

          <div className="col-span-12">
            <label className={lblFilled}>Gender</label>
            <div className={`flex gap-2 max-w-md rounded-lg p-1 ${
              matchedPatient ? 'bg-emerald-50/80 ring-1 ring-inset ring-emerald-100/70'
                : opdNewPersonSamePhone ? 'bg-amber-50/80 ring-1 ring-inset ring-amber-100/70'
                : ''
            }`}>
              {[['male','Male'],['female','Female'],['other','Other']].map(([val, lblShort]) => (
                <button type="button" key={val}
                  onClick={() => setForm(f => ({ ...f, gender: val }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${
                    form.gender === val
                      ? opdNewPersonSamePhone
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-emerald-600 text-white border-emerald-600'
                      : matchedPatient
                        ? 'bg-emerald-50/90 text-emerald-900 border-emerald-200/90'
                        : opdNewPersonSamePhone
                          ? 'bg-amber-50/90 text-amber-900 border-amber-200/90'
                          : 'bg-white text-gray-600 border-gray-200'
                  }`}>
                  {lblShort}
                </button>
              ))}
            </div>
          </div>

          <div className="col-span-12">
            <label className={lblFilled}>Address</label>
            <input
              value={form.address_line1}
              onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))}
              placeholder="House / street / locality"
              className={`${inpFilled} mb-1`}
            />
            <div className={showQueue ? 'space-y-2' : 'grid grid-cols-2 gap-2'}>
              <input
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="City / town"
                className={inpFilled}
              />
              <select
                value={form.state}
                onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                className={inpFilled}
              >
                {[
                  'Andhra Pradesh',
                  'Arunachal Pradesh',
                  'Assam',
                  'Bihar',
                  'Chhattisgarh',
                  'Goa',
                  'Gujarat',
                  'Haryana',
                  'Himachal Pradesh',
                  'Jharkhand',
                  'Karnataka',
                  'Kerala',
                  'Madhya Pradesh',
                  'Maharashtra',
                  'Manipur',
                  'Meghalaya',
                  'Mizoram',
                  'Nagaland',
                  'Odisha',
                  'Punjab',
                  'Rajasthan',
                  'Sikkim',
                  'Tamil Nadu',
                  'Telangana',
                  'Tripura',
                  'Uttar Pradesh',
                  'Uttarakhand',
                  'West Bengal',
                  'Andaman and Nicobar Islands',
                  'Chandigarh',
                  'Dadra and Nagar Haveli and Daman and Diu',
                  'Delhi',
                  'Jammu and Kashmir',
                  'Ladakh',
                  'Lakshadweep',
                  'Puducherry',
                ].map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-span-3">
            <label className={lbl}>Visit date</label>
            <input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} className={inp} />
          </div>
          <div className="col-span-3">
            <label className={lbl}>Doctor</label>
            <select value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} className={inp}>
              <option value="">Walk-in / Any</option>
              {doctors.map(d => (
                <option key={d.user || d.id} value={d.user || d.id}>
                  {d.name}{d.consultation_fee > 0 ? ` · ₹${d.consultation_fee}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-6">
            <label className={lbl}>Chief complaint</label>
            <input value={form.chief_complaint} onChange={e => setForm(f => ({ ...f, chief_complaint: e.target.value }))} placeholder="e.g. fever, follow-up" className={inp} />
          </div>

          {customFields.length > 0 && (
            <div className="col-span-12 mt-2 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Printer size={16} className="text-emerald-600" /> Additional A4 OPD Fields
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {customFields.map(f => (
                  <div key={f} className="flex flex-col">
                    <label className={`${lblFilled} capitalize tracking-tight`}>{f}</label>
                    <input
                      type="text"
                      className={inpFilled}
                      value={templateValues[f] || ''}
                      onChange={e => setTemplateValues({...templateValues, [f]: e.target.value})}
                      placeholder={f}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="p-4 border-t border-gray-200 shrink-0 flex flex-col gap-2">
          <button type="submit" disabled={submitting} onClick={() => { submitActionRef.current = 'a4' }}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl text-base font-extrabold hover:bg-emerald-700 disabled:opacity-60 flex items-center justify-center gap-2 shadow-md">
            {submitting && submitActionRef.current === 'a4'
              ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
              : <><Printer size={18} strokeWidth={2.5} /> {matchedPatient ? 'Assign Token & Print A4 Sheet' : 'Register, Assign & Print A4 Sheet'}</>
            }
          </button>
          <button type="submit" disabled={submitting} onClick={() => { submitActionRef.current = 'thermal' }}
            className="w-full bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors">
            {submitting && submitActionRef.current === 'thermal'
              ? <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              : 'Assign Token & Show Thermal Option'
            }
          </button>
          <p className="text-center text-xs font-bold text-gray-500 leading-tight mt-1">
            {matchedPatient
              ? 'Patient found — edit details above if needed; saved when you assign token'
              : opdNewPersonSamePhone
                ? 'Registers a new patient on this number and links the family record (same mobile as an existing patient)'
                : 'Creates patient record if new'}
          </p>
        </div>
      </form>

      </div>{/* end body */}

      {/* ── Queue popup overlay ── */}
      {showQueue && (
        <div
          className="fixed inset-0 z-[150] flex items-start justify-end"
          onClick={() => setShowQueue(false)}
        >
          <div
            className="relative bg-white h-full w-full max-w-lg shadow-2xl flex flex-col border-l border-gray-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3 shrink-0 bg-gray-50/80">
              <Activity size={16} className="text-emerald-600 shrink-0" strokeWidth={2.5} />
              <span className="font-semibold text-gray-800 text-sm flex-1">Today's OPD Queue</span>
              <Search size={15} className="text-gray-400 shrink-0" strokeWidth={2} />
              <input
                value={queueSearch}
                onChange={e => setQueueSearch(e.target.value)}
                placeholder="Search…"
                className="text-sm outline-none w-36 border-b border-gray-200 pb-0.5 focus:border-emerald-500 placeholder:text-gray-400"
              />
              <button type="button" onClick={fetchQueue} className="text-gray-400 hover:text-emerald-600">
                <RefreshCw size={15} strokeWidth={2} />
              </button>
              <button type="button" onClick={() => setShowQueue(false)} className="text-gray-400 hover:text-gray-700 ml-1">
                <XCircle size={20} strokeWidth={1.8} />
              </button>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-12 px-4 py-2 bg-gray-100/80 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide shrink-0">
              <div className="col-span-1">Token</div>
              <div className="col-span-4">Patient</div>
              <div className="col-span-3">Doctor</div>
              <div className="col-span-2">Complaint</div>
              <div className="col-span-2 text-right">Status</div>
            </div>

            {/* Rows */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
              {loading ? (
                <div className="text-center py-12 text-sm text-gray-400">Loading…</div>
              ) : filteredVisits.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Activity size={36} className="mx-auto mb-3 opacity-30" strokeWidth={2} />
                  <p className="text-sm font-medium text-gray-500">No visits today yet</p>
                </div>
              ) : filteredVisits.map(v => (
                <div key={v.id} className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-gray-50 group transition-colors">
                  <div className="col-span-1">
                    <div className={`w-9 h-9 rounded-lg font-bold text-sm flex items-center justify-center ${
                      ['in_progress','in_consultation'].includes(v.status) ? 'bg-blue-600 text-white' :
                      v.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {v.token_number || v.queue_number || '—'}
                    </div>
                  </div>
                  <div className="col-span-4 pl-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.patient_name || 'Patient'}</p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-xs text-gray-500 truncate">{v.doc_name || '—'}</p>
                  </div>
                  <div className="col-span-2 min-w-0">
                    <p className="text-xs text-gray-400 truncate">{v.chief_complaint || '—'}</p>
                  </div>
                  <div className="col-span-2 flex items-center justify-end gap-1.5">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${statusBadge[v.status] || 'bg-gray-100 text-gray-600'}`}>
                      {v.status?.replace(/_/g, ' ')}
                    </span>
                    <button onClick={() => setPrintVisit(v)}
                      className="text-gray-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Printer size={14} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {printVisit && <PrintSlip visit={printVisit} onClose={() => setPrintVisit(null)} />}
      {samePhoneFamilyModalOpen && samePhoneFamilyList.length > 0 && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="same-phone-family-title"
          onClick={closeSamePhoneFamilyModalBackdrop}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
            style={{ maxHeight: 'min(90vh, 30rem)' }}
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100 shrink-0">
              <div>
                <p id="same-phone-family-title" className="text-base font-semibold text-gray-900">
                  {samePhoneFamilyList.length === 1 ? 'Patient on this number' : `${samePhoneFamilyList.length} patients on this number`}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">Select a patient or register a new one</p>
              </div>
              <button
                type="button"
                onClick={closeSamePhoneFamilyModalBackdrop}
                className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <XCircle size={20} strokeWidth={1.8} />
              </button>
            </div>

            {/* ── Patient list ── */}
            <ul className="px-4 py-3 space-y-2 overflow-y-auto flex-1 min-h-0">
              {samePhoneFamilyList.map((p, idx) => {
                const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Patient'
                const genderLabel = p.gender === 'female' ? 'Female' : p.gender === 'male' ? 'Male' : 'Other'
                const genderColor = p.gender === 'female'
                  ? 'bg-pink-50 text-pink-700 border-pink-200'
                  : p.gender === 'male'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200'
                const selected = matchedPatient?.id === p.id
                const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '#'
                const avatarColor = [
                  'bg-emerald-100 text-emerald-700',
                  'bg-violet-100 text-violet-700',
                  'bg-amber-100 text-amber-700',
                  'bg-sky-100 text-sky-700',
                  'bg-rose-100 text-rose-700',
                ][idx % 5]
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => selectPatientFromFamilyModal(p)}
                      className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 transition-all border ${
                        selected
                          ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                          : 'border-gray-100 bg-gray-50/60 hover:border-emerald-200 hover:bg-emerald-50/40'
                      }`}
                    >
                      {/* Avatar */}
                      <span className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${avatarColor}`}>
                        {initials}
                      </span>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm truncate ${selected ? 'font-semibold text-gray-900' : 'font-normal text-gray-800'}`}>
                            {name}
                          </p>
                          {selected && <CheckCircle size={14} className="text-emerald-500 shrink-0" strokeWidth={2.5} />}
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">{p.uhid}</p>
                      </div>
                      {/* Gender badge */}
                      <span className={`shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border ${genderColor}`}>
                        {genderLabel}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>

            {/* ── Actions ── */}
            <div className="px-4 pb-4 pt-2 space-y-2 border-t border-gray-100 shrink-0">
              <button
                type="button"
                onClick={confirmSamePhoneUseExistingPatient}
                disabled={!matchedPatient}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle size={16} strokeWidth={2} />
                Continue with selected patient
              </button>
              <button
                type="button"
                onClick={startAddAnotherPersonSamePhone}
                className="w-full py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 active:bg-gray-100 flex items-center justify-center gap-2 transition-colors"
              >
                <UserPlus size={16} strokeWidth={2} className="text-emerald-600" />
                Register new person on this number
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Staff Attendance ────────────────────────────────────────────────────────
function StaffAttendanceSection() {
  const [staff, setStaff] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    try {
      const [sRes, aRes] = await Promise.all([
        api.get('/staff/?limit=1000&employment_status=active'),
        api.get(`/attendance/daily-records/?attendance_date=${today}&limit=1000`)
      ])
      // Backend returns { success: true, data: [...] } or results: [...]
      const sData = sRes.data?.data || sRes.data?.results || sRes.data || []
      const aData = aRes.data?.data || aRes.data?.results || aRes.data || []
      setStaff(Array.isArray(sData) ? sData : [])
      setRecords(Array.isArray(aData) ? aData : [])
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }

  async function handlePunch(staffId, action) {
    try {
      await api.post(`/attendance/daily-records/${action}/`, { staff_id: staffId })
      toast.success(action === 'check-in' ? 'Staff clocked in' : 'Staff clocked out')
      fetchData()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Punch failed')
    }
  }

  const filteredStaff = staff.filter(s => 
    !search || 
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    (s.employee_code || '').toLowerCase().includes(search.toLowerCase())
  )

  const staffWithStatus = filteredStaff.map(s => {
    const record = records.find(r => r.staff === s.id)
    return { ...s, record }
  })

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col min-h-0 h-full overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <Clock size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-800 tracking-tight">Staff Attendance</h3>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest opacity-60">
              {format(new Date(), 'EEEE, dd MMMM')}
            </p>
          </div>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search staff..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-gray-700 shadow-sm transition-all"
          />
        </div>
        <button onClick={fetchData} className="p-2 text-gray-400 hover:text-emerald-600 transition-colors">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50/30">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-bold uppercase tracking-widest opacity-50">Syncing Records...</p>
          </div>
        ) : staffWithStatus.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400 opacity-60">
            <Users size={48} className="mb-4" />
            <p className="text-lg font-bold">No Staff Found</p>
            <p className="text-sm">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {staffWithStatus.map(s => {
              const checkedIn = s.record?.check_in_at
              const checkedOut = s.record?.check_out_at
              const initials = ((s.first_name?.[0] || '') + (s.last_name?.[0] || '')).toUpperCase()
              return (
                <div key={s.id} className={`group rounded-2xl border transition-all duration-300 relative overflow-hidden flex flex-col ${
                  checkedIn ? 'bg-white border-emerald-200 ring-4 ring-emerald-50 shadow-lg shadow-emerald-100/50 scale-[1.02] z-10' :
                  'bg-white border-gray-100 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-50 hover:-translate-y-1'
                }`}>
                  {/* Status Indicator Bar */}
                  <div className={`h-1 w-full absolute top-0 left-0 transition-colors ${
                    checkedIn ? 'bg-emerald-500' : 'bg-red-400'
                  }`} />

                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all shadow-md ${
                          checkedIn ? 'bg-emerald-600 text-white rotate-3 group-hover:rotate-0' :
                          'bg-red-600 text-white -rotate-3 group-hover:rotate-0'
                        }`}>
                          {initials || <User size={20} />}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-gray-800 text-sm truncate leading-tight">
                            {s.first_name} {s.last_name}
                          </h4>
                          <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest mt-0.5 truncate">
                            {s.designation_name || s.employee_code || 'Staff'}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest shadow-sm ${
                        checkedIn ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {checkedIn ? 'Present' : 'Absent'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100 text-center transition-colors group-hover:bg-white group-hover:shadow-inner">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-0.5 opacity-60 text-left">Shift Start</p>
                        <p className={`text-sm font-black ${checkedIn ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {checkedIn ? format(new Date(checkedIn), 'HH:mm') : '--:--'}
                        </p>
                      </div>
                      <div className="bg-gray-50/80 rounded-xl p-2 border border-gray-100 text-center transition-colors group-hover:bg-white group-hover:shadow-inner">
                        <p className="text-[9px] text-gray-400 font-black uppercase tracking-tighter mb-0.5 opacity-60 text-left">Shift End</p>
                        <p className={`text-sm font-black ${checkedOut ? 'text-emerald-700' : 'text-gray-400'}`}>
                          {checkedOut ? format(new Date(checkedOut), 'HH:mm') : '--:--'}
                        </p>
                      </div>
                    </div>

                    {!checkedOut ? (
                      <button
                        onClick={() => handlePunch(s.id, checkedIn ? 'check-out' : 'check-in')}
                        className={`w-full py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-2 ${
                          checkedIn 
                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600'
                            : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 hover:border-emerald-700 shadow-lg shadow-emerald-100'
                        }`}
                      >
                        {checkedIn ? <LogOut size={14} /> : <Clock size={14} />}
                        {checkedIn ? 'Punch Out' : 'Punch In Now'}
                      </button>
                    ) : (
                      <div className="py-3 text-center text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200 flex items-center justify-center gap-2">
                        <CheckCircle size={14} className="text-green-500" /> Complete
                      </div>
                    )}
                  </div>

                  {checkedIn && !checkedOut && (
                    <div className="px-4 py-2 bg-emerald-600 text-[9px] text-white font-black text-center uppercase tracking-widest">
                      Session Active
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── IPD Admissions ───────────────────────────────────────────────────────────
function IPDSection({ mode }) {
  const [admissions, setAdmissions] = useState([])
  const [patients, setPatients] = useState([])
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    patient: '', assigned_doctor: '', ward_name: '', bed_code: '',
    admission_date: format(new Date(), 'yyyy-MM-dd'), admission_diagnosis: '', admission_notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)
  const [showBedPicker, setShowBedPicker] = useState(false)
  const [pickedBed, setPickedBed] = useState(null)

  const [ptSearch, setPtSearch] = useState('')
  const [ptResults, setPtResults] = useState([])
  const [ptSearching, setPtSearching] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newPt, setNewPt] = useState({ name: '', phone: '', address: '' })

  const [showPayments, setShowPayments] = useState(null) // admission object
  const [showAddCharge, setShowAddCharge] = useState(null) // admission object

  useEffect(() => {
    fetchAdmissions()
    fetchPatients()
    fetchDoctors()
  }, [mode])

  async function fetchAdmissions() {
    setLoading(true)
    try {
      const { data } = await api.get('/ipd-admissions/?status=admitted&limit=500')
      setAdmissions(data?.data || data?.results || data || [])
    } catch { toast.error('Failed to load IPD admissions') }
    finally { setLoading(false) }
  }

  async function fetchPatients() {
    try {
      const { data } = await api.get('/patients/?limit=500')
      setPatients(data?.data || data?.results || data || [])
    } catch {}
  }

  async function fetchDoctors() {
    try {
      const { data } = await api.get('/doctor-profiles/?limit=500')
      setDoctors(data?.data || data?.results || data || [])
    } catch {}
  }

  useEffect(() => {
    if (ptSearch.trim().length < 2) { setPtResults([]); return }
    const t = setTimeout(async () => {
      setPtSearching(true)
      try {
        const { data } = await api.get(`/patients/?search=${encodeURIComponent(ptSearch)}&limit=8`)
        setPtResults(Array.isArray(data?.data) ? data.data : (data?.results || []))
      } catch { setPtResults([]) }
      finally { setPtSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [ptSearch])

  function handleBedSelect(bedInfo) {
    setPickedBed(bedInfo)
    setForm(f => ({
      ...f,
      bed_code: bedInfo.bed_code,
      ward_name: bedInfo.ward_name,
      room_name: bedInfo.room_name,
    }))
  }

  async function submitAdmission(e) {
    e.preventDefault()
    
    let targetPatientId = selectedPatient?.id

    if (isAddingNew) {
      if (!newPt.name.trim()) { toast.error('Patient name is required'); return }
      setSubmitting(true)
      try {
        const parts = newPt.name.trim().split(/\s+/)
        const payload = {
          first_name: parts[0] || 'New',
          last_name: parts.slice(1).join(' ') || 'Patient',
          phone: newPt.phone || '',
          address_line1: newPt.address || '',
        }
        const { data } = await api.post('/patients/', payload)
        const created = data?.data || data?.entity || data
        targetPatientId = created.id
      } catch (err) {
        toast.error('Failed to create new patient'); setSubmitting(false); return
      }
    }

    if (!targetPatientId) { toast.error('Select or Register a patient first'); return }
    if (!form.bed_code) { toast.error('Select a bed first'); return }

    setSubmitting(true)
    try {
      await api.post('/ipd-admissions/', { ...form, patient: targetPatientId })
      toast.success('Patient admitted successfully!')
      setForm({
        patient: '', assigned_doctor: '', ward_name: '', bed_code: '',
        admission_date: format(new Date(), 'yyyy-MM-dd'), admission_diagnosis: '', admission_notes: '',
      })
      setSelectedPatient(null)
      setIsAddingNew(false)
      setNewPt({ name: '', phone: '', address: '' })
      setPickedBed(null)
      fetchAdmissions()
    } catch (err) {
      toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Error admitting patient')
    } finally { setSubmitting(false) }
  }

  async function discharge(id) {
    if (!window.confirm('Mark patient as discharged?')) return
    try {
      await api.patch(`/ipd-admissions/${id}/`, { status: 'discharged' })
      toast.success('Patient discharged')
      fetchAdmissions()
    } catch { toast.error('Failed to discharge') }
  }

  const statusColors = {
    admitted: 'bg-blue-100 text-blue-700',
    discharged: 'bg-green-100 text-green-700',
    transferred: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  if (mode === 'new_admission') {
    return (
      <div className="max-w-2xl">
        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <PlusCircle size={20} className="text-blue-500" /> New IPD Admission
        </h2>
        <form onSubmit={submitAdmission} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-xs text-gray-500 mb-1 block">Patient *</label>
              
              {selectedPatient ? (
                <div className="flex items-center gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                    {(selectedPatient.first_name?.[0] || '') + (selectedPatient.last_name?.[0] || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{[selectedPatient.first_name, selectedPatient.last_name].filter(Boolean).join(' ')}</p>
                    <p className="text-xs text-gray-400">{selectedPatient.uhid} · {selectedPatient.phone || 'No phone'}</p>
                  </div>
                  <button type="button" onClick={() => setSelectedPatient(null)} className="text-gray-300 hover:text-red-500">
                    <XCircle size={16} />
                  </button>
                </div>
              ) : isAddingNew ? (
                <div className="space-y-2 border-2 border-blue-500/20 bg-blue-50/20 rounded-xl p-3 shadow-inner">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">New Registration Mode</p>
                    <button type="button" onClick={() => { setIsAddingNew(false); setPtSearch(newPt.name) }} className="text-[10px] text-gray-400 font-bold hover:text-red-500 underline uppercase tracking-widest leading-none">Cancel</button>
                  </div>
                  <input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 bg-gray-50/50" value={newPt.name} readOnly />
                  <input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    value={newPt.phone} onChange={e => setNewPt(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile Number (Optional)" />
                  <input className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                    value={newPt.address} onChange={e => setNewPt(p => ({ ...p, address: e.target.value }))} placeholder="Address (Optional)" />
                </div>
              ) : (
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    value={ptSearch}
                    onChange={e => setPtSearch(e.target.value)}
                    placeholder="Search by name or UHID..."
                    className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                    autoComplete="off"
                  />
                  {ptSearching && <RefreshCw size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                  
                  {(ptResults.length > 0 || (ptSearch.length > 1 && !ptSearching)) && (
                    <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-100 divide-y divide-gray-50 max-h-60 overflow-y-auto">
                      {ptResults.map(p => (
                        <li key={p.id}>
                          <button type="button" onClick={() => { setSelectedPatient(p); setPtSearch(''); setPtResults([]) }}
                            className="w-full text-left px-3 py-2.5 hover:bg-blue-50/50 flex items-center gap-3 group">
                            <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center font-bold text-xs uppercase transition-all shrink-0">
                              {(p.first_name?.[0] || '') + (p.last_name?.[0] || '')}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-gray-800">{[p.first_name, p.last_name].filter(Boolean).join(' ')}</p>
                              <p className="text-[10px] text-gray-400 font-mono italic">{p.uhid} · {p.phone || 'No phone'}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                      <li className="bg-blue-50/50">
                        <button type="button" onClick={() => { setIsAddingNew(true); setNewPt({ name: ptSearch, phone: '', address: '' }); setPtSearch(''); setPtResults([]) }}
                          className="w-full text-left px-3 py-3 flex items-center gap-3 group transition-all">
                          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                            <Plus size={16} strokeWidth={3} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Register & Admit As New</p>
                            <p className="text-xs text-blue-600 font-bold italic truncate opacity-70">"{ptSearch}"</p>
                          </div>
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Assigned Doctor</label>
              <select value={form.assigned_doctor} onChange={e => setForm(f => ({ ...f, assigned_doctor: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">-- Select doctor --</option>
                {doctors.map(d => (
                  <option key={d.user || d.id} value={d.user || d.id}>
                    {d.name || [d.first_name, d.last_name].filter(Boolean).join(' ') || d.user}
                  </option>
                ))}
              </select>
            </div>
            {/* Bed picker */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Bed Assignment *</label>
              {pickedBed ? (
                <div className="flex items-center gap-3 bg-blue-50 border-2 border-blue-300 rounded-xl p-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Bed size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800">
                      {pickedBed.bed_code} · {pickedBed.room_name}
                      {pickedBed.is_ac && (
                        <span className="ml-2 text-xs bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full font-semibold">
                          <Wind size={9} className="inline mr-0.5" />AC
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {pickedBed.floor_name} ·{' '}
                      <span className="text-emerald-600 font-semibold">₹{Number(pickedBed.daily_charge).toLocaleString()}/day</span>
                    </p>
                  </div>
                  <button type="button" onClick={() => { setPickedBed(null); setForm(f => ({ ...f, bed_code: '', ward_name: '' })) }}
                    className="text-gray-400 hover:text-red-500"><XCircle size={18} /></button>
                  <button type="button" onClick={() => setShowBedPicker(true)}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-200">
                    Change
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setShowBedPicker(true)}
                  className="w-full border-2 border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 rounded-xl py-4 text-sm text-blue-600 font-semibold flex items-center justify-center gap-2 transition-all hover:border-blue-400">
                  <Bed size={16} /> Select Floor & Bed
                </button>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Admission Date *</label>
              <input type="date" value={form.admission_date} onChange={e => setForm(f => ({ ...f, admission_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Admission Diagnosis</label>
              <input value={form.admission_diagnosis} onChange={e => setForm(f => ({ ...f, admission_diagnosis: e.target.value }))}
                placeholder="Primary diagnosis"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Admission Notes</label>
            <textarea value={form.admission_notes} onChange={e => setForm(f => ({ ...f, admission_notes: e.target.value }))}
              rows={3} placeholder="Additional notes..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
          </div>
          <button type="submit" disabled={submitting || (!selectedPatient && !isAddingNew) || !form.bed_code}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2">
            <Bed size={16} /> {submitting ? 'Processing…' : isAddingNew ? 'Register & Admit Patient' : 'Admit Patient'}
          </button>
        </form>

        {showBedPicker && (
          <BedSelector
            onSelect={handleBedSelect}
            onClose={() => setShowBedPicker(false)}
          />
        )}
      </div>
    )
  }

  // Active admissions list
  const filtered = admissions.filter(a => {
    const q = search.toLowerCase()
    return !q || (a.patient_name || '').toLowerCase().includes(q) || (a.bed_code || '').toLowerCase().includes(q) || (a.ward_name || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
          <p className="text-xs text-blue-500 font-semibold">Admitted</p>
          <p className="text-2xl font-black text-blue-700">{admissions.filter(a => a.status === 'admitted').length}</p>
        </div>
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
          <p className="text-xs text-amber-500 font-semibold">Expected Discharge Today</p>
          <p className="text-2xl font-black text-amber-700">
            {admissions.filter(a => a.expected_discharge_date === format(new Date(), 'yyyy-MM-dd')).length}
          </p>
        </div>
        <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
          <p className="text-xs text-purple-500 font-semibold">Total Active</p>
          <p className="text-2xl font-black text-purple-700">{admissions.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <Search size={16} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient, bed, ward…"
            className="flex-1 text-sm outline-none" />
          <button onClick={fetchAdmissions} className="text-gray-400 hover:text-blue-600"><RefreshCw size={14} /></button>
          <span className="text-xs text-gray-400">{filtered.length} patients</span>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No active IPD admissions</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto custom-scrollbar">
            {filtered.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Bed size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{a.patient_name || a.patient}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {a.ward_name || 'No Ward'} · Bed {a.bed_code || '—'} · Admitted {a.admission_date}
                  </p>
                  {a.admission_diagnosis && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">Dx: {a.admission_diagnosis}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${statusColors[a.status] || 'bg-gray-100 text-gray-600'}`}>
                  {a.status}
                </span>
                {a.status === 'admitted' && (
                  <button onClick={() => discharge(a.id)}
                    className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg hover:bg-green-200 font-semibold flex items-center gap-1">
                    <CheckCircle size={12} /> Discharge
                  </button>
                )}
                {a.status === 'admitted' && (
                  <button onClick={() => setShowPayments(a)}
                    className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg hover:bg-amber-200 font-semibold flex items-center gap-1">
                    <IndianRupee size={12} /> Payments
                  </button>
                )}
                {a.status === 'admitted' && (
                  <button onClick={() => setShowAddCharge(a)}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-200 font-semibold flex items-center gap-1">
                    <Plus size={12} /> Add Charge
                  </button>
                )}
                <button onClick={() => setSelected(selected?.id === a.id ? null : a)}
                  className="text-gray-400 hover:text-blue-500">
                  <Eye size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showPayments && (
        <AdmissionPaymentsModal
          admission={showPayments}
          onClose={() => setShowPayments(null)}
        />
      )}

      {showAddCharge && (
        <AddChargeModal
          admission={showAddCharge}
          onClose={() => setShowAddCharge(null)}
        />
      )}

      {selected && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Admission Details</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-red-500"><XCircle size={18} /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {[
              ['Patient', selected.patient_name || selected.patient],
              ['Ward', selected.ward_name || '—'],
              ['Bed', selected.bed_code || '—'],
              ['Admission Date', selected.admission_date],
              ['Expected Discharge', selected.expected_discharge_date || '—'],
              ['Status', selected.status],
            ].map(([label, value]) => (
              <div key={label} className="bg-gray-50 rounded-lg p-2">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-semibold text-gray-700 capitalize">{value}</p>
              </div>
            ))}
          </div>
          {selected.admission_diagnosis && (
            <p className="mt-3 text-sm text-gray-600"><span className="font-semibold">Diagnosis:</span> {selected.admission_diagnosis}</p>
          )}
          {selected.admission_notes && (
            <p className="mt-1 text-sm text-gray-600"><span className="font-semibold">Notes:</span> {selected.admission_notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

function AddChargeModal({ admission, onClose }) {
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleAdd(e) {
    e.preventDefault()
    if (!desc || !amount) return
    setSubmitting(true)
    try {
      await api.post(`/ipd-admissions/${admission.id}/add-charge/`, {
        description: desc, amount
      })
      toast.success('Charge added successfully!')
      onClose()
    } catch { toast.error('Failed to add charge') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white">
          <h3 className="font-bold">Add Service Charge</h3>
          <button onClick={onClose} className="hover:rotate-90 transition-transform"><X size={20} /></button>
        </div>
        <form onSubmit={handleAdd} className="p-6 space-y-4">
          <div>
            <div className="bg-blue-50 p-3 rounded-2xl mb-4 border border-blue-100">
              <p className="text-[10px] font-bold text-blue-400 uppercase">Patient</p>
              <p className="text-sm font-bold text-blue-900">{admission.patient_name}</p>
            </div>
            <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Service Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} required placeholder="e.g. Surgery Fee, Nursing Charge..."
              className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none mt-1" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-gray-400 uppercase ml-1">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00"
              className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none mt-1" />
          </div>
          <button type="submit" disabled={submitting}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95">
            {submitting ? 'Adding...' : <><Plus size={18} /> Confirm Charge</>}
          </button>
        </form>
      </div>
    </div>
  )
}

function AdmissionPaymentsModal({ admission, onClose }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [amount, setAmount] = useState('')
  const [mode, setMode] = useState('cash')
  const [ref, setRef] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { fetchPayments() }, [admission.id])

  async function fetchPayments() {
    setLoading(true)
    try {
      const { data } = await api.get(`/ipd-admissions/${admission.id}/payments/`)
      setPayments(data)
    } catch { toast.error('Failed to load payments') }
    finally { setLoading(false) }
  }

  async function handleAddAdvance(e) {
    e.preventDefault()
    if (!amount || parseFloat(amount) <= 0) return
    setSubmitting(true)
    try {
      await api.post(`/ipd-admissions/${admission.id}/capture-advance/`, {
        amount, payment_mode: mode, reference: ref
      })
      toast.success('Advance captured successfully!')
      setAmount(''); setRef('')
      fetchPayments()
    } catch (err) { toast.error('Failed to capture advance') }
    finally { setSubmitting(false) }
  }

  const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0)

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
              <IndianRupee size={24} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">{admission.patient_name}</h3>
              <p className="text-amber-100 text-xs">IPD Payments & Advances · {admission.bed_code}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <XCircle size={26} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* History Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Clock size={16} className="text-amber-500" /> Payment History
              </h4>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-wider">
                Total Paid: ₹{totalPaid.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="py-10 text-center text-xs text-gray-400">Loading history...</div>
              ) : payments.length === 0 ? (
                <div className="py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center">
                  <p className="text-xs text-gray-400">No payments recorded yet</p>
                </div>
              ) : (
                payments.map(p => (
                  <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm flex items-center justify-between group hover:border-amber-200 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-gray-800">₹{parseFloat(p.amount).toLocaleString()}</p>
                      <p className="text-[10px] text-gray-400">{format(new Date(p.created_at), 'dd MMM, HH:mm')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-500 uppercase px-1.5 py-0.5 bg-gray-50 rounded border border-gray-100">{p.payment_mode}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Advance Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <PlusCircle size={16} className="text-emerald-500" /> Record New Advance
            </h4>
            <form onSubmit={handleAddAdvance} className="bg-gray-50/50 rounded-2xl border border-gray-200 p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Amount (₹) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number" value={amount} onChange={e => setAmount(e.target.value)} required
                    placeholder="0.00"
                    className="w-full pl-7 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Payment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'upi', 'card'].map(m => (
                    <button
                      key={m} type="button" onClick={() => setMode(m)}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                        mode === m ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-500 uppercase mb-1.5 block">Reference / Remarks</label>
                <input
                  value={ref} onChange={e => setRef(e.target.value)}
                  placeholder="Txn ID, Cheque no, etc."
                  className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none transition-all"
                />
              </div>

              <button
                type="submit" disabled={submitting || !amount}
                className="w-full py-3 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 disabled:opacity-40 shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} strokeWidth={2.5} />
                {submitting ? 'Processing...' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Emergency Cases ──────────────────────────────────────────────────────────
function EmergencySection() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ patient_name: '', contact: '', complaint: '', triage: 'yellow' })

  useEffect(() => { loadCases() }, [])

  function loadCases() {
    setLoading(true)
    const raw = JSON.parse(localStorage.getItem('emergency_cases') || '[]')
    setCases(raw)
    setLoading(false)
  }

  function addCase(e) {
    e.preventDefault()
    const entry = {
      id: Date.now(),
      ...form,
      arrived_at: new Date().toISOString(),
      status: 'waiting',
    }
    const updated = [entry, ...cases]
    localStorage.setItem('emergency_cases', JSON.stringify(updated))
    setCases(updated)
    toast.success('Emergency case logged')
    setForm({ patient_name: '', contact: '', complaint: '', triage: 'yellow' })
  }

  function updateStatus(id, status) {
    const updated = cases.map(c => c.id === id ? { ...c, status } : c)
    localStorage.setItem('emergency_cases', JSON.stringify(updated))
    setCases(updated)
  }

  const triageColors = {
    red: 'bg-red-100 text-red-700 border-red-200',
    yellow: 'bg-amber-100 text-amber-700 border-amber-200',
    green: 'bg-green-100 text-green-700 border-green-200',
  }

  const triageDot = { red: 'bg-red-500', yellow: 'bg-amber-400', green: 'bg-green-500' }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {['red', 'yellow', 'green'].map(t => (
          <div key={t} className={`rounded-2xl p-4 border ${triageColors[t]}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${triageDot[t]}`} />
              <p className="text-xs font-bold capitalize">{t === 'red' ? 'Critical' : t === 'yellow' ? 'Moderate' : 'Minor'}</p>
            </div>
            <p className="text-2xl font-black">{cases.filter(c => c.triage === t && c.status === 'waiting').length}</p>
          </div>
        ))}
      </div>

      <form onSubmit={addCase} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-500" /> Log Emergency Case
        </h3>
        <div className="grid grid-cols-4 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Patient Name *</label>
            <input value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} required
              placeholder="Enter patient name"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Contact</label>
            <input value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))}
              placeholder="Phone number"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Triage Level</label>
            <select value={form.triage} onChange={e => setForm(f => ({ ...f, triage: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none">
              <option value="red">🔴 Critical</option>
              <option value="yellow">🟡 Moderate</option>
              <option value="green">🟢 Minor</option>
            </select>
          </div>
          <div className="col-span-4">
            <label className="text-xs text-gray-500 mb-1 block">Chief Complaint *</label>
            <input value={form.complaint} onChange={e => setForm(f => ({ ...f, complaint: e.target.value }))} required
              placeholder="Brief complaint description"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:outline-none" />
          </div>
        </div>
        <button type="submit"
          className="mt-3 bg-red-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-red-700 flex items-center gap-2">
          <AlertTriangle size={14} /> Log Case
        </button>
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Active Emergency Cases ({cases.filter(c => c.status === 'waiting').length})</p>
        </div>
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto custom-scrollbar">
          {cases.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No emergency cases</div>
          ) : cases.map(c => (
            <div key={c.id} className="px-4 py-3 flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${triageDot[c.triage]}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">{c.patient_name}</p>
                <p className="text-xs text-gray-400">{c.complaint} · {format(new Date(c.arrived_at), 'HH:mm')} · {c.contact || 'No contact'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${triageColors[c.triage]}`}>
                {c.triage === 'red' ? 'Critical' : c.triage === 'yellow' ? 'Moderate' : 'Minor'}
              </span>
              {c.status === 'waiting' ? (
                <button onClick={() => updateStatus(c.id, 'attended')}
                  className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold hover:bg-green-200">
                  Mark Attended
                </button>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg">Attended</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Patient List ─────────────────────────────────────────────────────────────
function PatientListSection() {
  const [patients, setPatients] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [selected, setSelected] = useState(null)
  const PAGE_SIZE = 50
  const debounceRef = useRef(null)

  useEffect(() => {
    setPage(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchPatients(0, search), 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  useEffect(() => { fetchPatients(page, search) }, [page])

  async function fetchPatients(pg = 0, q = '') {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: PAGE_SIZE, offset: pg * PAGE_SIZE })
      if (q.trim()) params.set('search', q.trim())
      const { data } = await api.get(`/patients/?${params}`)
      setPatients(data?.data || data?.results || data || [])
      setTotal(data?.count ?? data?.total ?? (data?.data?.length ?? 0))
    } catch { toast.error('Failed to load patients') }
    finally { setLoading(false) }
  }

  function pName(p) {
    return [p.first_name, p.last_name].filter(Boolean).join(' ') || p.uhid || 'Patient'
  }

  function calcAge(dob) {
    if (!dob) return null
    const d = new Date(dob), t = new Date()
    let age = t.getFullYear() - d.getFullYear()
    if (t.getMonth() < d.getMonth() || (t.getMonth() === d.getMonth() && t.getDate() < d.getDate())) age--
    return age
  }

  const genderColor = { male: 'bg-blue-50 text-blue-700 border-blue-200', female: 'bg-pink-50 text-pink-700 border-pink-200', other: 'bg-purple-50 text-purple-700 border-purple-200' }
  const genderLabel = { male: 'Male', female: 'Female', other: 'Other' }
  const avatarColor = ['bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700', 'bg-amber-100 text-amber-700', 'bg-sky-100 text-sky-700', 'bg-rose-100 text-rose-700']
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {[['Total Patients', total, 'text-gray-900'], ['Showing', patients.length, 'text-emerald-600']].map(([l, v, c]) => (
          <div key={l} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{l}</p>
              <p className={`text-2xl font-black ${c}`}>{v}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search bar */}
        <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-3 bg-gray-50/60">
          <Search size={15} className="text-gray-400 shrink-0" strokeWidth={2} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, UHID, phone…"
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
          />
          {loading && <span className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />}
          <button onClick={() => fetchPatients(page, search)} className="text-gray-400 hover:text-emerald-600 shrink-0">
            <RefreshCw size={14} strokeWidth={2} />
          </button>
          <span className="text-xs text-gray-400 shrink-0">{total} total</span>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-12 px-4 py-2 bg-gray-100/80 border-b border-gray-200 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          <div className="col-span-4">Patient</div>
          <div className="col-span-3">UHID</div>
          <div className="col-span-2">Phone</div>
          <div className="col-span-1 text-center">Gender</div>
          <div className="col-span-1 text-center">Age</div>
          <div className="col-span-1 text-right">Registered</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-50 max-h-[calc(100vh-360px)] overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
          ) : patients.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-400">No patients found</div>
          ) : patients.map((p, idx) => {
            const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '?'
            const age = p.age ?? calcAge(p.dob)
            const regDate = p.created_at ? p.created_at.slice(0, 10) : '—'
            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className="grid grid-cols-12 px-4 py-2.5 items-center hover:bg-emerald-50/40 cursor-pointer group transition-colors"
              >
                <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${avatarColor[idx % 5]}`}>
                    {initials}
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate group-hover:text-emerald-800">{pName(p)}</p>
                </div>
                <div className="col-span-3 text-xs text-gray-500 font-mono truncate">{p.uhid}</div>
                <div className="col-span-2 text-xs text-gray-500">{p.phone || '—'}</div>
                <div className="col-span-1 flex justify-center">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${genderColor[p.gender] || 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                    {genderLabel[p.gender]?.[0] || '—'}
                  </span>
                </div>
                <div className="col-span-1 text-center text-xs text-gray-500">{age ?? '—'}</div>
                <div className="col-span-1 text-right text-xs text-gray-400">{regDate}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1 py-1">
        {/* Left: showing count */}
        <span className="text-sm text-gray-400 font-medium">
          {total === 0
            ? 'No patients found'
            : `Showing ${page * PAGE_SIZE + 1}–${Math.min((page + 1) * PAGE_SIZE, total)} of ${total}`}
        </span>

        {/* Right: prev / page info / next */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-1.5 rounded-full text-sm font-semibold bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 font-medium px-1">
            Page {page + 1} of {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1 || totalPages === 0}
            className="px-4 py-1.5 rounded-full text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      </div>


      {/* ── Patient detail modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4 flex items-center gap-4">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-black shrink-0 ${avatarColor[0]}`}>
                {((selected.first_name?.[0] || '') + (selected.last_name?.[0] || '')).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-lg truncate">{pName(selected)}</p>
                <p className="text-emerald-100 text-sm">{selected.uhid}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-white/70 hover:text-white shrink-0">
                <XCircle size={22} strokeWidth={1.8} />
              </button>
            </div>

            {/* Details grid */}
            <div className="p-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Phone', selected.phone || '—', '📞'],
                  ['Gender', genderLabel[selected.gender] || selected.gender || '—', '🧬'],
                  ['Age', (selected.age ?? calcAge(selected.dob) ?? '—') + (selected.age || calcAge(selected.dob) ? ' yrs' : ''), '🎂'],
                  ['Date of Birth', selected.dob || '—', '📅'],
                  ['Blood Group', selected.blood_group || '—', '🩸'],
                  ['Email', selected.email || '—', '✉️'],
                  ['Address', [selected.address_line1, selected.city, selected.state].filter(Boolean).join(', ') || '—', '📍'],
                  ['Registered', selected.created_at ? selected.created_at.slice(0, 10) : '—', '🗓️'],
                ].map(([label, value, icon]) => (
                  <div key={label} className="bg-gray-50 rounded-xl px-3 py-2.5 flex items-start gap-2">
                    <span className="text-base shrink-0 mt-0.5">{icon}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                      <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selected.emergency_tags && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.emergency_tags.split(',').filter(Boolean).map(t => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">{t.trim()}</span>
                  ))}
                </div>
              )}
            </div>

            <div className="px-5 pb-4">
              <button onClick={() => setSelected(null)}
                className="w-full py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 font-medium">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Register Patient ─────────────────────────────────────────────────────────
function RegisterPatientSection() {
  const EMPTY = { first_name: '', last_name: '', dob: '', gender: 'male', phone: '', email: '', blood_group: '' }
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const payload = {
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender,
        dob: form.dob || undefined,
        phone: form.phone,
        email: form.email,
        blood_group: form.blood_group,
      }
      const { data } = await api.post('/patients/', payload)
      const patient = data?.data || data
      toast.success(`Patient registered! UHID: ${patient?.uhid || '—'}`)
      setForm(EMPTY)
    } catch (err) {
      const errData = err.response?.data
      const msg = errData?.detail || (errData?.errors ? JSON.stringify(errData.errors) : null) || 'Registration failed'
      toast.error(msg)
    } finally { setSubmitting(false) }
  }

  const tf = (label, key, type = 'text', placeholder = '', required = false) => (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}{required && ' *'}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder} required={required}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <UserPlus size={20} className="text-emerald-500" /> Register New Patient
      </h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {tf('First Name', 'first_name', 'text', 'First name', true)}
          {tf('Last Name', 'last_name', 'text', 'Last name', true)}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Gender</label>
            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          {tf('Date of Birth', 'dob', 'date')}
          {tf('Phone', 'phone', 'tel', '10-digit mobile number')}
          {tf('Email', 'email', 'email', 'optional')}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Blood Group</label>
            <select value={form.blood_group} onChange={e => setForm(f => ({ ...f, blood_group: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none">
              <option value="">Unknown</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" disabled={submitting}
          className="bg-emerald-600 text-white px-8 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-2">
          <UserPlus size={14} /> {submitting ? 'Registering…' : 'Register Patient'}
        </button>
      </form>
    </div>
  )
}

function DischargeSection() {
  const [admissions, setAdmissions] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [journey, setJourney] = useState(null) // { admission, step: 'form'|'billing' }
  const [summary, setSummary] = useState({
    summary_notes: '', treatment_given: '', condition_at_discharge: '',
    medications_on_discharge: '', follow_up_advice: ''
  })
  const [billing, setBilling] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { 
    fetchActive() 
    fetchDischarged()
  }, [])

  async function fetchActive() {
    try {
      const { data } = await api.get('/ipd-admissions/?status=admitted&limit=500')
      setAdmissions(data?.data || data?.results || data || [])
    } catch {}
  }

  async function fetchDischarged() {
    setLoading(true)
    try {
      const { data } = await api.get('/summaries/?limit=500')
      setRecords(data?.data || data?.results || data || [])
    } catch { toast.error('Failed to load discharge records') }
    finally { setLoading(false) }
  }

  async function startDischarge(adm) {
    setJourney({ admission: adm, step: 'form' })
    setSummary({
      summary_notes: adm.admission_notes || '',
      treatment_given: '',
      condition_at_discharge: 'Stable',
      medications_on_discharge: '',
      follow_up_advice: ''
    })
  }

  async function goToBilling() {
    setSubmitting(true)
    try {
      const { data } = await api.get(`/summaries/billing-summary/?admission_id=${journey.admission.id}`)
      setBilling(data)
      setJourney(j => ({ ...j, step: 'billing' }))
    } catch { toast.error('Failed to fetch billing summary') }
    finally { setSubmitting(false) }
  }

  async function finalizeDischarge() {
    setSubmitting(true)
    try {
      const payload = {
        admission: journey.admission.id,
        ...summary,
        total_billed: billing.total_billed,
        total_paid: billing.total_paid,
        outstanding_balance: billing.outstanding
      }
      await api.post('/summaries/', payload)
      toast.success('Discharge finalized successfully!')
      setJourney(null)
      fetchActive()
      fetchDischarged()
    } catch { toast.error('Failed to finalize discharge') }
    finally { setSubmitting(false) }
  }

  const updateBilling = (key, val) => {
    setBilling(prev => {
      const next = { ...prev, [key]: Number(val) || 0 }
      next.total_billed = next.total_services + next.room_total
      next.outstanding = next.total_billed - next.total_paid
      return next
    })
  }

  function printSummary(rec) {
    const w = window.open('', '_blank')
    const adm = rec.admission_detail || rec
    w.document.write(`
      <html><head><title>Discharge Summary — ${rec.patient_name}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; padding: 50px; max-width: 900px; margin: 0 auto; color: #1f2937; line-height: 1.5; background: #fff; }
        .hosp-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 4px solid #10b981; padding-bottom: 25px; margin-bottom: 30px; }
        .hosp-brand h2 { font-size: 28px; font-weight: 800; color: #065f46; margin: 0; letter-spacing: -0.5px; }
        .hosp-brand p { font-size: 12px; color: #6b7280; font-weight: 600; margin: 2px 0 0; text-transform: uppercase; }
        .doc-meta { text-align: right; font-size: 12px; color: #6b7280; }
        .doc-title { font-size: 20px; text-align: center; font-weight: 800; text-transform: uppercase; letter-spacing: 3px; color: #065f46; margin: 30px 0; background: #f0fdf4; padding: 12px; border-radius: 12px; border: 1px solid #d1fae5; }
        
        .patient-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 35px; background: #f9fafb; padding: 25px; border-radius: 16px; border: 1px solid #e5e7eb; }
        .data-point .lbl { font-size: 10px; color: #9ca3af; text-transform: uppercase; font-weight: 800; margin-bottom: 4px; }
        .data-point .val { font-size: 14px; font-weight: 700; color: #111827; }
        
        .content-section { margin-bottom: 30px; }
        .section-hdr { font-size: 11px; font-weight: 800; color: #059669; border-left: 4px solid #10b981; padding-left: 12px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .section-body { font-size: 13px; color: #374151; white-space: pre-wrap; background: #fff; padding: 5px 0 0 16px; }
        
        .billing-card { margin-top: 40px; border: 1px solid #e5e7eb; border-radius: 20px; overflow: hidden; }
        .billing-hdr { background: #f9fafb; padding: 15px 25px; border-bottom: 1px solid #e5e7eb; font-weight: 800; font-size: 14px; color: #374151; }
        .billing-body { padding: 20px 25px; }
        .bill-row { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 14px; color: #4b5563; }
        .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 15px; border-top: 2px solid #f3f4f6; }
        .total-row .lbl { font-weight: 800; color: #111827; font-size: 16px; }
        .total-row .val { font-weight: 800; color: #059669; font-size: 20px; }
        
        .footer-note { margin-top: 60px; text-align: center; font-size: 11px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 25px; }
        @media print { body { padding: 20px; } .billing-card { break-inside: avoid; } }
      </style></head><body>
        <div class="hosp-header">
          <div class="hosp-brand">
            <h2>VARDRAAN HOSPITAL</h2>
            <p>Advanced Clinical Care & Diagnostics</p>
          </div>
          <div class="doc-meta">
            <p><strong>REPORT ID:</strong> DIS-${rec.id.slice(0, 8).toUpperCase()}</p>
            <p><strong>DATE:</strong> ${new Date(rec.created_at || Date.now()).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        
        <div class="doc-title">Discharge Summary</div>
        
        <div class="patient-grid">
          <div class="data-point"><p class="lbl">Patient Name</p><p class="val">${rec.patient_name}</p></div>
          <div class="data-point"><p class="lbl">UHID Number</p><p class="val">${rec.patient_uhid || '—'}</p></div>
          <div class="data-point"><p class="lbl">Admission Date</p><p class="val">${rec.admission_date}</p></div>
          <div class="data-point"><p class="lbl">Discharge Date</p><p class="val">${new Date(rec.created_at || Date.now()).toLocaleDateString()}</p></div>
        </div>
        
        <div class="content-section">
          <div class="section-hdr">Clinical Presentation & Summary</div>
          <div class="section-body">${rec.summary_notes || 'Patient admitted for specialized care. Stay was uneventful.'}</div>
        </div>
        
        <div class="content-section">
          <div class="section-hdr">Treatment & Procedures Performed</div>
          <div class="section-body">${rec.treatment_given || 'Conservative management and clinical monitoring.'}</div>
        </div>

        <div class="content-section">
          <div class="section-hdr">Post-Discharge Medications</div>
          <div class="section-body" style="font-family: monospace; font-size: 12px; background: #fefce8; padding: 15px; border-radius: 12px; border: 1px solid #fef08a;">${rec.medications_on_discharge || 'No medications prescribed.'}</div>
        </div>
        
        <div class="content-section">
          <div class="section-hdr">Follow-up Advice</div>
          <div class="section-body">${rec.follow_up_advice || 'Follow-up as per clinical necessity.'}</div>
        </div>
        
        <div class="billing-card">
          <div class="billing-hdr">Final Financial Settlement</div>
          <div class="billing-body">
            <div class="bill-row"><span>Total Consolidated Billed Amount</span><span>₹${Number(rec.total_billed).toLocaleString()}</span></div>
            <div class="bill-row"><span>Net Advance & Payments Captured</span><span>- ₹${Number(rec.total_paid).toLocaleString()}</span></div>
            <div class="total-row">
              <span class="lbl">OUTSTANDING BALANCE DUE</span>
              <span class="val">₹${Number(rec.outstanding_balance).toLocaleString()}</span>
            </div>
          </div>
        </div>
        
        <div class="footer-note">
          This is an electronically generated clinical document and does not require a physical signature.<br/>
          Vardraan Hospital · 123 Healthcare Ave, New Delhi
        </div>
      </body></html>
    `)
    w.document.close()
    w.print()
  }

  const filteredHistory = records.filter(r => {
    const q = search.toLowerCase()
    return !q || (r.patient_name || '').toLowerCase().includes(q) || (r.patient_uhid || '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-4">
      {/* ── Active Patients Ready for Discharge ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
            <Users size={18} /> Currently Admitted Patients
          </h3>
          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{admissions.length} active</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto custom-scrollbar text-sm">
          {admissions.length === 0 ? (
            <div className="py-8 text-center text-gray-400 italic">No patients currently admitted</div>
          ) : admissions.map(a => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs uppercase">
                  {a.patient_name?.[0] || '#'}
                </div>
                <div>
                  <p className="font-bold text-gray-800">{a.patient_name}</p>
                  <p className="text-[10px] text-gray-500">Bed: {a.bed_code} · {a.ward_name} · Admitted: {a.admission_date}</p>
                </div>
              </div>
              <button onClick={() => startDischarge(a)}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center gap-1.5">
                <LogOut size={12} strokeWidth={3} /> Initiate Discharge
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Discharge History ── */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
          <Search size={16} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discharge history..."
            className="flex-1 text-sm outline-none bg-transparent" />
          <button onClick={fetchDischarged} className="text-gray-400 hover:text-emerald-600"><RefreshCw size={14} /></button>
        </div>
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm italic">Loading history...</div>
        ) : filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">No discharge records found</div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto custom-scrollbar">
            {filteredHistory.map(r => (
              <div key={r.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
                  <FileText size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800">{r.patient_name}</p>
                  <p className="text-[10px] text-gray-400">
                    Admission: {r.admission_date} · Summary ID: {r.id.slice(0,8)}
                  </p>
                </div>
                <div className="text-right mr-4">
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Balance</p>
                  <p className={`text-xs font-black ${parseFloat(r.outstanding_balance) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                    ₹{Number(r.outstanding_balance).toLocaleString()}
                  </p>
                </div>
                <button onClick={() => printSummary(r)}
                  className="text-xs bg-gray-100 text-gray-700 p-2 rounded-lg hover:bg-gray-200 font-semibold">
                  <Printer size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Discharge Journey Modal ── */}
      {journey && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-emerald-600 px-6 py-5 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <h3 className="font-bold text-lg">Discharge Process: {journey.admission.patient_name}</h3>
              </div>
              <button onClick={() => setJourney(null)} className="hover:text-emerald-200"><XCircle size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Stepper */}
              <div className="flex items-center gap-4 mb-8">
                <div className={`flex-1 h-3 rounded-full flex items-center justify-center text-[8px] font-black text-white ${journey.step === 'form' ? 'bg-emerald-600' : 'bg-emerald-200'}`}>1. CLINICAL</div>
                <div className={`flex-1 h-3 rounded-full flex items-center justify-center text-[8px] font-black text-white ${journey.step === 'billing' ? 'bg-emerald-600' : 'bg-gray-200'}`}>2. BILLING</div>
              </div>

              {journey.step === 'form' ? (
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-800 border-b pb-2">Clinical Discharge Summary</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                       <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Clinical Summary / Summary Notes</label>
                       <textarea rows={3} value={summary.summary_notes} onChange={e => setSummary(s => ({...s, summary_notes: e.target.value}))}
                        className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Primary summary of stay..." />
                    </div>
                    <div className="col-span-2">
                       <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Treatment Given</label>
                       <textarea rows={2} value={summary.treatment_given} onChange={e => setSummary(s => ({...s, treatment_given: e.target.value}))}
                        className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="Procedures, key treatments..." />
                    </div>
                    <div>
                       <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Condition at Discharge</label>
                       <input value={summary.condition_at_discharge} onChange={e => setSummary(s => ({...s, condition_at_discharge: e.target.value}))}
                        className="w-full border rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Stable, Recovered" />
                    </div>
                    <div className="col-span-2">
                       <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Medications on Discharge</label>
                       <textarea rows={3} value={summary.medications_on_discharge} onChange={e => setSummary(s => ({...s, medications_on_discharge: e.target.value}))}
                        className="w-full border rounded-xl p-3 text-sm font-mono focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="1. Tab X... 2. Syp Y..." />
                    </div>
                    <div className="col-span-2">
                       <label className="text-[11px] font-bold text-gray-500 uppercase mb-1 block">Follow-up Advice</label>
                       <textarea rows={2} value={summary.follow_up_advice} onChange={e => setSummary(s => ({...s, follow_up_advice: e.target.value}))}
                        className="w-full border rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500 resize-none" placeholder="When to return, symptoms to watch..." />
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end">
                    <button onClick={goToBilling} disabled={submitting}
                      className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-100 transition-all active:scale-95">
                      Next: Billing Summary <ArrowRight size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h4 className="font-bold text-gray-800 border-b pb-2 flex items-center gap-2">
                    <Receipt size={20} className="text-emerald-600" /> Financial Review & Manual Adjustment
                  </h4>
                  {billing && (
                    <div className="space-y-6">
                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center gap-3">
                         <IndianRupee className="text-blue-500" />
                         <p className="text-xs text-blue-800 font-medium">You can manually adjust the amounts below if needed. The total and outstanding balance will update automatically.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 focus-within:border-emerald-500 transition-colors">
                           <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Service Invoices (Surgery, etc.)</p>
                           <div className="flex items-center gap-2">
                             <span className="text-gray-400 font-bold">₹</span>
                             <input type="number" value={billing.total_services} onChange={e => updateBilling('total_services', e.target.value)}
                               className="text-xl font-black text-gray-800 outline-none w-full bg-transparent" />
                           </div>
                        </div>
                        <div className="bg-white rounded-2xl p-4 border-2 border-gray-100 focus-within:border-emerald-500 transition-colors">
                           <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Room Charges ({billing.stay_days} Days)</p>
                           <div className="flex items-center gap-2">
                             <span className="text-gray-400 font-bold">₹</span>
                             <input type="number" value={billing.room_total} onChange={e => updateBilling('room_total', e.target.value)}
                               className="text-xl font-black text-gray-800 outline-none w-full bg-transparent" />
                           </div>
                        </div>
                      </div>

                      <div className="bg-emerald-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-100">
                         <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-bold opacity-80 uppercase tracking-wider">Gross Billed Amount</span>
                            <span className="text-xl font-black text-white">₹{Number(billing.total_billed).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/20">
                            <span className="text-sm font-bold opacity-80 uppercase tracking-wider">Paid / Advance Reconciled</span>
                            <span className="text-xl font-black">₹{Number(billing.total_paid).toLocaleString()}</span>
                         </div>
                         <div className="flex justify-between items-end">
                            <div>
                               <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Final Settlement Due</p>
                               <span className="text-3xl font-black">₹{Number(billing.outstanding).toLocaleString()}</span>
                            </div>
                            <div className="bg-white/20 px-3 py-1.5 rounded-xl backdrop-blur-md">
                               <p className="text-[10px] font-bold">Total Stay Duration: {billing.stay_days} Days</p>
                            </div>
                         </div>
                      </div>

                      <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex items-start gap-3">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-sm font-bold text-amber-800">Final Confirmation</p>
                          <p className="text-xs text-amber-700 mt-0.5">Finalizing will release the bed and close the record. Please ensure the amounts above are confirmed with the patient.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between gap-4">
                    <button onClick={() => setJourney(j => ({ ...j, step: 'form' }))} className="px-6 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                      <ArrowRight size={16} className="rotate-180" /> Back to Clinical
                    </button>
                    <button onClick={finalizeDischarge} disabled={submitting}
                      className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-base hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-200 active:scale-95">
                      {submitting ? 'Finalizing...' : <>Complete & Finalize Discharge <CheckCircle size={20} /></>}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Payment Slip ─────────────────────────────────────────────────────────────
const COMMON_SERVICES = [
  { label: 'X-Ray', price: 300 },
  { label: 'ECG', price: 200 },
  { label: 'Blood Test (CBC)', price: 250 },
  { label: 'Urine Test', price: 150 },
  { label: 'OPD Consultation', price: 500 },
  { label: 'Dressing', price: 100 },
  { label: 'Injection', price: 80 },
  { label: 'Ultrasound', price: 600 },
  { label: 'MRI', price: 3500 },
  { label: 'CT Scan', price: 2500 },
]

function PaymentSlipSection() {
  const [ptSearch, setPtSearch] = useState('')
  const [ptResults, setPtResults] = useState([])
  const [ptSearching, setPtSearching] = useState(false)
  const [patient, setPatient] = useState(null)
  const [items, setItems] = useState([{ description: '', unit_price: '', quantity: 1 }])
  const [discount, setDiscount] = useState('')
  const [paymentMode, setPaymentMode] = useState('cash')
  const [encounterType, setEncounterType] = useState('opd')
  const [referredBy, setReferredBy] = useState('')
  const [purpose, setPurpose] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [invoice, setInvoice] = useState(null)

  const [isAddingNew, setIsAddingNew] = useState(false)
  const [newPt, setNewPt] = useState({ name: '', phone: '', address: '' })

  useEffect(() => {
    if (ptSearch.trim().length < 2) { setPtResults([]); return }
    const t = setTimeout(async () => {
      setPtSearching(true)
      try {
        const { data } = await api.get(`/patients/?search=${encodeURIComponent(ptSearch)}&limit=8`)
        setPtResults(Array.isArray(data?.data) ? data.data : (data?.results || []))
      } catch { setPtResults([]) }
      finally { setPtSearching(false) }
    }, 400)
    return () => clearTimeout(t)
  }, [ptSearch])

  function addItem() {
    setItems(prev => [...prev, { description: '', unit_price: '', quantity: 1 }])
  }
  function removeItem(i) {
    setItems(prev => prev.filter((_, idx) => idx !== i))
  }
  function updateItem(i, field, val) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }
  function quickAdd(svc) {
    setItems(prev => {
      const empty = prev.findIndex(it => !it.description)
      if (empty !== -1) {
        return prev.map((it, i) => i === empty ? { description: svc.label, unit_price: svc.price, quantity: 1 } : it)
      }
      return [...prev, { description: svc.label, unit_price: svc.price, quantity: 1 }]
    })
  }

  const subtotal = items.reduce((sum, it) => {
    const p = parseFloat(it.unit_price) || 0
    const q = parseFloat(it.quantity) || 0
    return sum + p * q
  }, 0)
  const discountAmt = Math.min(parseFloat(discount) || 0, subtotal)
  const total = subtotal - discountAmt

  async function handleSubmit(e) {
    e.preventDefault()
    
    let currentPatient = patient
    let targetPatientId = patient?.id

    if (isAddingNew) {
      if (!newPt.name.trim()) { toast.error('Patient name is required'); return }
      setSubmitting(true)
      try {
        const parts = newPt.name.trim().split(/\s+/)
        const payload = {
          first_name: parts[0] || 'New',
          last_name: parts.slice(1).join(' ') || 'Patient',
          phone: newPt.phone || '',
          address_line1: newPt.address || '',
        }
        const { data } = await api.post('/patients/', payload)
        const created = data?.data || data?.entity || data
        targetPatientId = created.id
        currentPatient = created // Use this for the invoice set below
        setPatient(created) 
        setIsAddingNew(false)
      } catch (err) {
        toast.error('Failed to create new patient'); setSubmitting(false); return
      }
    }

    if (!targetPatientId) { toast.error('Select or create a patient first'); return }
    const validItems = items.filter(it => it.description && parseFloat(it.unit_price) > 0)
    if (!validItems.length) { toast.error('Add at least one service with a price'); return }
    
    setSubmitting(true)
    try {
      const payload = {
        patient: targetPatientId,
        encounter_type: encounterType,
        status: 'finalized',
        discount_amount: discountAmt.toFixed(2),
        items: validItems.map(it => ({
          description: it.description,
          quantity: parseFloat(it.quantity) || 1,
          unit_price: parseFloat(it.unit_price),
        })),
      }
      const { data } = await api.post('/invoices/', payload)
      const inv = data?.data || data?.entity || data
      setInvoice({ 
        ...inv, 
        patient: currentPatient || { 
          first_name: newPt.name.split(' ')[0], 
          last_name: newPt.name.split(' ').slice(1).join(' '), 
          phone: newPt.phone 
        }, 
        paymentMode, subtotal, discountAmt, total, referredBy, purpose 
      })
      toast.success(`Invoice ${inv.invoice_no} created!`)
      toast.success(`Invoice ${inv.invoice_no} created!`)
    } catch (err) {
      toast.error(err.response?.data?.detail || JSON.stringify(err.response?.data) || 'Failed to create invoice')
    } finally { setSubmitting(false) }
  }

  function resetForm() {
    setPatient(null)
    setIsAddingNew(false)
    setNewPt({ name: '', phone: '', address: '' })
    setPtSearch('')
    setItems([{ description: '', unit_price: '', quantity: 1 }])
    setDiscount('')
    setPaymentMode('cash')
    setReferredBy('')
    setPurpose('')
    setInvoice(null)
  }

  function printInvoice() {
    const w = window.open('', '_blank')
    const dateTimeStr = format(new Date(), 'dd-MM-yyyy HH:mm:ss')
    const patientName = [invoice.patient.first_name, invoice.patient.last_name].filter(Boolean).join(' ').toUpperCase() || 'PATIENT'
    const gender = invoice.patient.gender ? (invoice.patient.gender === 'male' ? 'Male' : invoice.patient.gender === 'female' ? 'Female' : 'Other') : ''
    const age = invoice.patient.age ? invoice.patient.age : ''
    const genderAge = [gender, age].filter(Boolean).join(' / ')
    const payModeLabel = invoice.paymentMode === 'cash' ? 'Cash Payment' : invoice.paymentMode === 'card' ? 'Card Payment' : 'UPI Payment'

    const rows = (invoice.items || []).map((it, i) =>
      `<tr>
        <td class="c">${i + 1}</td>
        <td class="l">${it.description}</td>
        <td class="r">₹${parseFloat(it.line_total).toFixed(2)}</td>
      </tr>`
    ).join('')

    w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Receipt — ${invoice.invoice_no}</title>
    <style>
      @page { size: A4 portrait; margin: 0; }
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body {
        font-family: Arial, sans-serif;
        font-size: 11px;
        color: #111;
        width: 210mm;
        background: #fff;
      }

      /* Slip occupies exactly the top half of A4 portrait */
      .slip {
        width: 210mm;
        height: 148.5mm;
        padding: 6mm 8mm 4mm;
        display: flex;
        flex-direction: column;
        border-bottom: 2px dashed #aaa; /* cut-line */
      }

      /* ── TOP: logo left / address right ── */
      .top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 4mm;
        border-bottom: 2px solid #111;
        margin-bottom: 3mm;
      }
      .hosp-name {
        font-size: 22px;
        font-weight: 900;
        color: #1a6b3f;
        letter-spacing: -0.5px;
        line-height: 1;
        margin-bottom: 2px;
      }
      .hosp-tag { font-size: 9px; color: #555; letter-spacing: 0.5px; text-transform: uppercase; }
      .address { text-align: right; font-size: 9.5px; color: #333; line-height: 1.55; }
      .address strong { font-size: 10px; }

      /* ── RECEIPT title ── */
      .receipt-title {
        text-align: center;
        font-size: 13px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        border-bottom: 1px solid #111;
        padding-bottom: 2mm;
        margin-bottom: 2.5mm;
      }

      /* ── Patient info grid ── */
      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1.5mm 4mm;
        margin-bottom: 2.5mm;
        font-size: 10px;
      }
      .info-cell { display: flex; flex-direction: column; gap: 1px; }
      .info-label { color: #666; font-size: 9px; }
      .info-val { font-weight: 700; color: #111; }

      /* ── Table ── */
      table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
      thead tr { background: #1a6b3f; color: #fff; }
      th { padding: 3px 5px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; }
      th.c { text-align: center; width: 26px; }
      th.l { text-align: left; }
      th.r { text-align: right; width: 52px; }
      tbody tr { border-bottom: 1px solid #e5e7eb; }
      tbody tr:last-child { border-bottom: 1.5px solid #111; }
      td { padding: 3px 5px; }
      td.c { text-align: center; color: #555; }
      td.l { text-align: left; }
      td.r { text-align: right; font-weight: 600; }

      /* ── Totals ── */
      .totals { margin-left: auto; width: 160px; margin-top: 1mm; font-size: 10.5px; }
      .t-row { display: flex; justify-content: space-between; padding: 1px 5px; }
      .t-row.disc { color: #dc2626; }
      .t-row.final {
        font-weight: 800;
        font-size: 12px;
        border-top: 2px solid #111;
        padding-top: 2px;
        margin-top: 2px;
        color: #1a6b3f;
      }

      /* ── Footer ── */
      .footer {
        margin-top: auto;
        padding-top: 2mm;
        border-top: 1px dashed #aaa;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        font-size: 9px;
        color: #555;
      }
      .note { max-width: 65%; line-height: 1.5; }
      .paid-box {
        border: 2px solid #1a6b3f;
        color: #1a6b3f;
        font-weight: 900;
        font-size: 13px;
        padding: 2px 10px;
        border-radius: 4px;
        letter-spacing: 2px;
      }
    </style>
    </head><body>
    <div class="slip">

      <!-- TOP HEADER -->
      <div class="top">
        <div>
          <div class="hosp-name">Vardraan Hospital</div>
          <div class="hosp-tag">Healthcare &amp; Diagnostics</div>
        </div>
        <div class="address">
          <strong>Jind, Haryana</strong><br/>
          Pincode: 126102<br/>
          Phone: +91-XXXXXXXXXX<br/>
          Email: info@vardraanhospital.com
        </div>
      </div>

      <!-- RECEIPT LABEL -->
      <div class="receipt-title">Receipt</div>

      <!-- PATIENT INFO -->
      <div class="info-grid">
        <div class="info-cell">
          <span class="info-label">Invoice Number</span>
          <span class="info-val">${invoice.invoice_no}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Name</span>
          <span class="info-val">${patientName}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Gender / Age</span>
          <span class="info-val">${genderAge || '—'}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Pay Mode</span>
          <span class="info-val">${payModeLabel}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Mobile No.</span>
          <span class="info-val">${invoice.patient.phone || '—'}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Date</span>
          <span class="info-val">${dateTimeStr}</span>
        </div>
        ${invoice.referredBy ? `<div class="info-cell">
          <span class="info-label">Referred By</span>
          <span class="info-val">${invoice.referredBy.toUpperCase()}</span>
        </div>` : ''}
        ${invoice.purpose ? `<div class="info-cell" style="grid-column:span 2">
          <span class="info-label">Purpose</span>
          <span class="info-val">${invoice.purpose}</span>
        </div>` : ''}
      </div>

      <!-- SERVICES TABLE -->
      <table>
        <thead>
          <tr>
            <th class="c">SL No.</th>
            <th class="l">Test Type / Service</th>
            <th class="r">Amount</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <!-- TOTALS -->
      <div class="totals">
        <div class="t-row"><span>Total Amount:</span><span>₹${invoice.subtotal.toFixed(2)}</span></div>
        <div class="t-row disc"><span>Discount:</span><span>₹${invoice.discountAmt.toFixed(2)}</span></div>
        <div class="t-row final"><span>Net Amount:</span><span>₹${invoice.total.toFixed(2)}</span></div>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="note">
          <strong>Note:</strong> Your reports will be preserved only for 6 months.<br/>
          Please retain this receipt for future reference.
        </div>
        <div class="paid-box">✓ PAID</div>
      </div>

    </div>
    <script>window.onload = () => window.print()</script>
    </body></html>`)
    w.document.close()
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500 focus:outline-none'

  return (
    <div className="h-full flex flex-col gap-3">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Receipt size={18} className="text-emerald-600" />
          <h2 className="text-base font-semibold text-gray-900">Payment Slip</h2>
        </div>
        {invoice && (
          <div className="flex gap-2">
            <button onClick={printInvoice} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
              <Printer size={13} /> Print Receipt
            </button>
            <button onClick={resetForm} className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50">
              New Slip
            </button>
          </div>
        )}
      </div>

      {invoice ? (
        /* ── Receipt preview (compact) ── */
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden max-w-lg">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-3 text-white flex justify-between items-center">
            <div>
              <p className="text-[11px] opacity-75">Invoice No</p>
              <p className="text-base font-bold">{invoice.invoice_no}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] opacity-75">Date</p>
              <p className="text-sm">{format(new Date(), 'dd MMM yyyy')}</p>
            </div>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2.5 bg-emerald-50/60 border border-emerald-100 rounded-lg px-3 py-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                {(invoice.patient.first_name?.[0] || '') + (invoice.patient.last_name?.[0] || '')}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{[invoice.patient.first_name, invoice.patient.last_name].filter(Boolean).join(' ')}</p>
                <p className="text-xs text-gray-400">{invoice.patient.uhid} · {invoice.patient.phone || 'No phone'}</p>
              </div>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-1.5 text-gray-400 font-semibold uppercase tracking-wide">Service</th>
                  <th className="text-center py-1.5 text-gray-400 font-semibold uppercase tracking-wide">Qty</th>
                  <th className="text-right py-1.5 text-gray-400 font-semibold uppercase tracking-wide">Rate</th>
                  <th className="text-right py-1.5 text-gray-400 font-semibold uppercase tracking-wide">Amt</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((it, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5 text-gray-800">{it.description}</td>
                    <td className="py-1.5 text-center text-gray-500">{it.quantity}</td>
                    <td className="py-1.5 text-right text-gray-500">₹{parseFloat(it.unit_price).toFixed(0)}</td>
                    <td className="py-1.5 text-right font-medium text-gray-900">₹{parseFloat(it.line_total).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {invoice.discountAmt > 0 && <tr><td colSpan={3} className="pt-2 text-right text-red-400">Discount</td><td className="pt-2 text-right text-red-500 font-medium">−₹{invoice.discountAmt.toFixed(0)}</td></tr>}
                <tr><td colSpan={3} className="pt-2 text-right font-semibold text-gray-900">Total</td><td className="pt-2 text-right font-bold text-emerald-700 text-sm">₹{invoice.total.toFixed(0)}</td></tr>
              </tfoot>
            </table>
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="text-xs text-gray-500 capitalize"><CreditCard size={12} className="inline mr-1 text-emerald-600" />{invoice.paymentMode}</span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">PAID</span>
            </div>
          </div>
        </div>
      ) : (
        /* ── Two-column form ── */
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 grid grid-cols-2 gap-3 overflow-hidden">

          {/* LEFT column: patient + quick services + items */}
          <div className="flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
            {/* Patient */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Patient</p>
              {patient ? (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {(patient.first_name?.[0] || '') + (patient.last_name?.[0] || '')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{[patient.first_name, patient.last_name].filter(Boolean).join(' ')}</p>
                    <p className="text-xs text-gray-400">{patient.uhid} · {patient.phone || 'No phone'}</p>
                  </div>
                  <button type="button" onClick={() => setPatient(null)} className="text-gray-300 hover:text-red-500">
                    <XCircle size={16} strokeWidth={1.8} />
                  </button>
                </div>
              ) : isAddingNew ? (
                <div className="space-y-2 border-2 border-emerald-500/20 bg-emerald-50/20 rounded-xl p-3 shadow-inner">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">New Patient Mode</p>
                    <button type="button" onClick={() => { setIsAddingNew(false); setPtSearch(newPt.name) }} className="text-[10px] text-gray-400 font-bold hover:text-red-500 underline">Cancel</button>
                  </div>
                  <input className={`${inp} py-1.5 text-xs ring-1 ring-emerald-100`} value={newPt.name} readOnly placeholder="Name" />
                  <input className={`${inp} py-1.5 text-xs`} value={newPt.phone} onChange={e => setNewPt(p => ({ ...p, phone: e.target.value }))} placeholder="Mobile Number (Optional)" />
                  <input className={`${inp} py-1.5 text-xs`} value={newPt.address} onChange={e => setNewPt(p => ({ ...p, address: e.target.value }))} placeholder="Address" />
                </div>
              ) : (
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-gray-400" />
                  <input value={ptSearch} onChange={e => setPtSearch(e.target.value)}
                    placeholder="Search by name, mobile or UHID…"
                    className={`${inp} pl-8 text-xs`} autoComplete="off" />
                  {ptSearching && <span className="absolute right-2.5 top-2.5 w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                  {(ptResults.length > 0 || (ptSearch.length > 1 && !ptSearching)) && (
                    <ul className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 divide-y divide-gray-50 max-h-44 overflow-y-auto">
                      {ptResults.map(p => (
                        <li key={p.id}>
                          <button type="button" onClick={() => { setPatient(p); setPtSearch(''); setPtResults([]) }}
                            className="w-full text-left px-3 py-2 hover:bg-emerald-50/60">
                            <p className="text-sm font-medium text-gray-900">{[p.first_name, p.last_name].filter(Boolean).join(' ')}</p>
                            <p className="text-xs text-gray-400">{p.uhid} · {p.phone || 'No phone'}</p>
                          </button>
                        </li>
                      ))}
                      <li className="bg-emerald-50/50">
                        <button type="button" onClick={() => { setIsAddingNew(true); setNewPt({ name: ptSearch, phone: '', address: '' }); setPtSearch(''); setPtResults([]) }}
                          className="w-full text-left px-3 py-2.5 flex items-center gap-2 group transition-all">
                          <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Plus size={14} strokeWidth={3} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-emerald-700 uppercase tracking-tight">Register as New Patient</p>
                            <p className="text-[11px] text-emerald-600/70 font-bold italic truncate">"{ptSearch}"</p>
                          </div>
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Quick services */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Quick Add</p>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SERVICES.map(svc => (
                  <button key={svc.label} type="button" onClick={() => quickAdd(svc)}
                    className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-800 text-gray-600 transition-colors">
                    {svc.label} <span className="text-gray-400">₹{svc.price}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Line items */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 flex-1 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-2 shrink-0">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Services / Items</p>
                <button type="button" onClick={addItem} className="text-[11px] flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium">
                  <Plus size={12} /> Add
                </button>
              </div>
              <div className="grid grid-cols-12 gap-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1 px-0.5 shrink-0">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-3">₹ Price</div>
                <div className="col-span-1" />
              </div>
              <div className="space-y-1.5 overflow-y-auto flex-1">
                {items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                    <input className={`${inp} col-span-6 py-1.5 text-xs`} placeholder="Service"
                      value={it.description} onChange={e => updateItem(i, 'description', e.target.value)} />
                    <input type="number" min="1" className={`${inp} col-span-2 text-center py-1.5 text-xs`}
                      value={it.quantity} onChange={e => updateItem(i, 'quantity', e.target.value)} />
                    <input type="number" min="0" step="0.01" className={`${inp} col-span-3 py-1.5 text-xs`} placeholder="0"
                      value={it.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                    <button type="button" onClick={() => removeItem(i)} disabled={items.length === 1}
                      className="col-span-1 flex justify-center text-gray-300 hover:text-red-500 disabled:opacity-30">
                      <Trash2 size={13} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT column: payment details + totals + submit */}
          <div className="flex flex-col gap-3 min-h-0">
            <div className="bg-white rounded-xl border border-gray-200 p-3 shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Payment Details</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-gray-400 block mb-1">Encounter type</label>
                  <select value={encounterType} onChange={e => setEncounterType(e.target.value)} className={`${inp} py-1.5 text-xs`}>
                    {[['opd','OPD'],['lab','Lab'],['pharmacy','Pharmacy'],['ipd','IPD'],['package','Package']].map(([v,l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 block mb-1">Payment mode</label>
                  <div className="flex gap-1.5">
                    {[['cash','Cash'],['card','Card'],['upi','UPI']].map(([v,l]) => (
                      <button key={v} type="button" onClick={() => setPaymentMode(v)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${paymentMode === v ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-200 text-gray-600 hover:border-emerald-300'}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 block mb-1">Discount (₹)</label>
                  <input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)}
                    placeholder="0.00" className={`${inp} py-1.5 text-xs`} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 block mb-1">Referred By (optional)</label>
                  <input value={referredBy} onChange={e => setReferredBy(e.target.value)}
                    placeholder="Doctor name…" className={`${inp} py-1.5 text-xs`} />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-gray-400 block mb-1">Purpose / Notes (optional)</label>
                  <input value={purpose} onChange={e => setPurpose(e.target.value)}
                    placeholder="e.g. Chest X-Ray, Follow-up…" className={`${inp} py-1.5 text-xs`} />
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-3 shrink-0">
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmt > 0 && (
                  <div className="flex justify-between text-sm text-red-500">
                    <span>Discount</span><span>−₹{discountAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-900 text-base border-t border-gray-200 pt-2 mt-1">
                  <span>Total</span><span className="text-emerald-700">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={submitting || (!patient && !isAddingNew) || total <= 0}
              className="py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0">
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating…</>
                : <><Receipt size={15} /> {isAddingNew ? 'Register & Generate Slip' : 'Generate Payment Slip'}</>
              }
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ─── TV Screens Tab ───────────────────────────────────────────────────────────
// ─── Room Edit Modal ──────────────────────────────────────────────────────────
function RoomModal({ room, doctors, onSave, onClose }) {
  const isNew = !room.code
  const nextNum = room._nextNum || ''
  const [form, setForm] = useState({
    label: room.label || '',
    prefix: room.prefix || '',
    doctor_user: room.doctor_user || '',
    doctor_name: room.doctor_name || '',
  })

  function handleDoctorChange(e) {
    const docUser = e.target.value
    const doc = doctors.find(d => (d.user || d.id) === docUser)
    setForm(f => ({
      ...f,
      doctor_user: docUser,
      doctor_name: doc?.name || '',
      label: doc ? `Room ${nextNum || ''} – ${doc.name}` : f.label,
    }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.label.trim()) { toast.error('Room label is required'); return }
    if (!form.prefix.trim()) { toast.error('Token prefix is required'); return }
    onSave({
      ...room,
      label: form.label.trim(),
      prefix: form.prefix.trim().toUpperCase().slice(0, 2),
      doctor_user: form.doctor_user || null,
      doctor_name: form.doctor_name || '',
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-800 text-lg">{isNew ? 'Add New Room' : 'Edit Room'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500"><XCircle size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Doctor picker */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Assign Doctor from Profile</label>
            <select value={form.doctor_user} onChange={handleDoctorChange}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none">
              <option value="">— No doctor / Walk-in room —</option>
              {doctors.map(d => (
                <option key={d.user || d.id} value={d.user || d.id}>
                  {d.name}
                  {d.specialty_name ? ` · ${d.specialty_name}` : ''}
                  {d.consultation_fee ? ` · ₹${d.consultation_fee}` : ''}
                </option>
              ))}
            </select>
            {form.doctor_name && (
              <p className="mt-1 text-xs text-purple-600 bg-purple-50 rounded-lg px-2 py-1">
                Doctor assigned: <strong>{form.doctor_name}</strong>
              </p>
            )}
          </div>

          {/* Room label */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Room Label</label>
            <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Room 1 – Dr. Sharma"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" required />
          </div>

          {/* Token prefix */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Token Prefix (1-2 letters)</label>
            <input value={form.prefix} onChange={e => setForm(f => ({ ...f, prefix: e.target.value.toUpperCase().slice(0, 2) }))}
              placeholder="e.g. A"
              maxLength={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" required />
            <p className="text-xs text-gray-400 mt-1">Tokens will be printed as: <strong>{form.prefix || 'A'}1</strong>, <strong>{form.prefix || 'A'}2</strong>…</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 rounded-xl py-2.5 text-sm text-gray-600 hover:bg-gray-50 font-medium">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-purple-600 text-white rounded-xl py-2.5 text-sm font-bold hover:bg-purple-700">
              {isNew ? 'Add Room' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── TV Screens Section ───────────────────────────────────────────────────────
function TVScreensSection({ rooms, setRooms, tvGroups, setTvGroups }) {
  const [dragRoomCode, setDragRoomCode] = useState(null)
  const [doctors, setDoctors] = useState([])
  const [modalRoom, setModalRoom] = useState(null)   // null = closed, {} = editing
  const [editTvId, setEditTvId] = useState(null)
  const [tvHeadingInput, setTvHeadingInput] = useState('')

  useEffect(() => {
    api.get('/doctor-profiles/?limit=200&is_active=true')
      .then(({ data }) => {
        const rows = data?.data || data?.results || data || []
        setDoctors(Array.isArray(rows) ? rows : [])
      })
      .catch(() => {})
  }, [])

  function roomLabel(code) { return rooms.find(r => r.code === code)?.label || code }
  function roomPrefix(code) { return rooms.find(r => r.code === code)?.prefix || '' }
  function roomDoctor(code) { return rooms.find(r => r.code === code)?.doctor_name || '' }
  function makeTvUrl(group) { return `/tv/${group.id}` }

  function openAddRoom() {
    const roomNumbers = rooms.map(r => { const m = String(r.code || '').match(/^room(\d+)$/); return m ? parseInt(m[1], 10) : 0 }).filter(Boolean)
    const nextNumber = roomNumbers.length ? Math.max(...roomNumbers) + 1 : (rooms.length + 1)
    setModalRoom({
      _isNew: true,
      _nextNum: nextNumber,
      code: `room${nextNumber}`,
      label: `Room ${nextNumber}`,
      prefix: String.fromCharCode(64 + nextNumber),
      doctor_user: null,
      doctor_name: '',
      isDefault: false,
    })
  }

  function openEditRoom(roomCode) {
    const room = rooms.find(r => r.code === roomCode)
    if (room) setModalRoom({ ...room })
  }

  function handleModalSave(updated) {
    if (updated._isNew) {
      setRooms(prev => [...prev, { ...updated, _isNew: undefined, _nextNum: undefined }])
    } else {
      setRooms(prev => prev.map(r => r.code === updated.code ? { ...updated, _isNew: undefined, _nextNum: undefined } : r))
    }
    setModalRoom(null)
    toast.success(updated._isNew ? 'Room added!' : 'Room updated!')
  }

  function deleteRoom(roomCode) {
    const room = rooms.find(r => r.code === roomCode)
    if (!room) return
    if (room.isDefault) { toast.error('First 3 rooms are mandatory and cannot be deleted'); return }
    if (!window.confirm(`Delete "${room.label}"?`)) return
    setRooms(prev => prev.filter(r => r.code !== roomCode))
    setTvGroups(prev => prev.map(g => ({
      ...g,
      left_room: g.left_room === roomCode ? null : g.left_room,
      right_room: g.right_room === roomCode ? null : g.right_room,
    })))
  }

  function dropRoomToTv(tvId, slot, droppedRoomCode) {
    const roomCode = droppedRoomCode || dragRoomCode
    if (!roomCode || !slot) return
    setTvGroups(prev => prev.map(group => {
      const cleared = {
        ...group,
        left_room: group.left_room === roomCode ? null : group.left_room,
        right_room: group.right_room === roomCode ? null : group.right_room,
      }
      if (group.id === tvId) return { ...cleared, [slot]: roomCode }
      return cleared
    }))
    setDragRoomCode(null)
  }

  function startEditTvHeading(group) {
    setEditTvId(group.id)
    setTvHeadingInput(group.name || '')
  }

  function saveTvHeading(tvId) {
    if (!tvHeadingInput.trim()) return
    setTvGroups(prev => prev.map(g => g.id === tvId ? { ...g, name: tvHeadingInput.trim() } : g))
    setEditTvId(null)
  }

  return (
    <div className="space-y-5">
      {/* Room cards */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Monitor size={18} className="text-purple-500" /> Rooms & Doctor Assignment
          </h3>
          <button onClick={openAddRoom}
            className="bg-purple-600 text-white text-xs px-4 py-2 rounded-xl font-semibold hover:bg-purple-700 flex items-center gap-1.5">
            <Plus size={13} /> Add Room
          </button>
        </div>
        <p className="text-xs text-amber-600 mb-4">Min 3 rooms required. First 3 non-deletable. All rooms can have a doctor assigned.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rooms.map((room, idx) => (
            <div key={room.code}
              draggable
              onDragStart={(e) => { setDragRoomCode(room.code); e.dataTransfer.setData('text/plain', room.code); e.dataTransfer.effectAllowed = 'move' }}
              onDragEnd={() => setDragRoomCode(null)}
              className={`rounded-2xl border p-4 cursor-grab transition-all ${
                dragRoomCode === room.code
                  ? 'border-purple-300 ring-2 ring-purple-100 bg-purple-50'
                  : 'border-gray-100 bg-gray-50 hover:border-purple-200'
              }`}
            >
              {/* Room header */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-base shrink-0">
                  {room.prefix}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 text-sm truncate">{room.label}</p>
                  <p className="text-xs text-gray-400">Code: {room.code}</p>
                </div>
              </div>

              {/* Doctor badge */}
              {room.doctor_name ? (
                <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1.5 mb-3">
                  <Users size={12} className="text-blue-500 shrink-0" />
                  <span className="text-xs text-blue-700 font-semibold truncate">{room.doctor_name}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1.5 mb-3">
                  <Users size={12} className="text-gray-400 shrink-0" />
                  <span className="text-xs text-gray-400">No doctor assigned</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button onClick={() => openEditRoom(room.code)}
                  className="flex-1 bg-white border border-purple-200 text-purple-700 text-xs py-1.5 rounded-lg font-semibold hover:bg-purple-50 flex items-center justify-center gap-1">
                  Assign Doctor / Edit
                </button>
                {!room.isDefault && (
                  <button onClick={() => deleteRoom(room.code)}
                    className="bg-red-50 border border-red-200 text-red-600 text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-100">
                    Del
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TV assignments */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-4">
          <Tv size={18} className="text-purple-500" /> TV Screen Assignments
        </h3>
        <p className="text-xs text-gray-500 mb-4">Drag a room from above onto a TV slot. Each TV can show up to 2 rooms side-by-side.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tvGroups.map(group => (
            <div key={group.id} className="rounded-2xl border border-gray-200 p-4">
              {/* TV heading */}
              <div className="flex items-center justify-between gap-2 mb-3">
                {editTvId === group.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input value={tvHeadingInput} onChange={e => setTvHeadingInput(e.target.value)}
                      className="flex-1 border border-purple-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                      autoFocus onKeyDown={e => e.key === 'Enter' && saveTvHeading(group.id)} />
                    <button onClick={() => saveTvHeading(group.id)}
                      className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-purple-700">
                      Save
                    </button>
                    <button onClick={() => setEditTvId(null)} className="text-gray-400 hover:text-red-400"><XCircle size={16} /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800">{group.name}</span>
                    <button onClick={() => startEditTvHeading(group)}
                      className="text-[11px] px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">
                      Rename
                    </button>
                  </div>
                )}
                <a href={makeTvUrl(group)} target="_blank" rel="noreferrer"
                  className="bg-purple-600 text-white text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 hover:bg-purple-700 shrink-0">
                  <Tv size={12} /> Open TV
                </a>
              </div>

              <p className="text-[11px] text-blue-600 mb-3 break-all">{`http://localhost:5173${makeTvUrl(group)}`}</p>

              {/* Drop zones */}
              <div className="grid grid-cols-2 gap-2">
                {['left_room', 'right_room'].map(slot => {
                  const code = group[slot]
                  const doc = code ? roomDoctor(code) : ''
                  return (
                    <div key={slot}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                      onDrop={(e) => { e.preventDefault(); dropRoomToTv(group.id, slot, e.dataTransfer.getData('text/plain')) }}
                      className={`rounded-xl border-2 border-dashed p-3 min-h-20 transition-all ${
                        dragRoomCode
                          ? 'border-purple-400 bg-purple-50/80'
                          : code ? 'border-purple-300 bg-purple-50/50' : 'border-gray-200 bg-gray-50/50'
                      }`}
                    >
                      <p className="text-[10px] uppercase tracking-wide text-purple-500 font-bold mb-2">
                        {slot === 'left_room' ? 'Left Screen' : 'Right Screen'}
                      </p>
                      {code ? (
                        <div>
                          <span className="text-xs bg-purple-100 border border-purple-200 text-purple-800 font-bold px-2 py-0.5 rounded-full inline-block mb-1">
                            {roomPrefix(code)}{' · '}{roomLabel(code)}
                          </span>
                          {doc && <p className="text-xs text-blue-600 mt-1">{doc}</p>}
                          <button onClick={() => setTvGroups(prev => prev.map(g => g.id === group.id ? { ...g, [slot]: null } : g))}
                            className="text-[10px] text-red-400 hover:text-red-600 mt-1 block">
                            Remove
                          </button>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">Drag & drop a room here</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <strong>Tip:</strong> Open TV links in fullscreen (F11). Tokens auto-refresh every 5 seconds. Assign a doctor to a room so the OPD token form pre-fills the doctor automatically.
      </div>

      {/* Room modal */}
      {modalRoom && (
        <RoomModal
          room={modalRoom}
          doctors={doctors}
          onSave={handleModalSave}
          onClose={() => setModalRoom(null)}
        />
      )}
    </div>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ activeSection, onSelect }) {
  const [collapsed, setCollapsed] = useState({})

  function toggleGroup(label) {
    setCollapsed(prev => ({ ...prev, [label]: !prev[label] }))
  }

  const sectionBadges = {}

  return (
    <aside className="w-52 shrink-0 bg-white border-r border-gray-100 flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="px-3 py-3 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Reception</p>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <button
              onClick={() => toggleGroup(group.label)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600 rounded-lg"
            >
              {group.label}
              {collapsed[group.label] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
            {!collapsed[group.label] && group.items.map(item => {
              const Icon = item.icon
              const active = activeSection === item.id
              return (
                <button key={item.id} onClick={() => onSelect(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}>
                  <Icon size={15} className={active ? 'text-white' : 'text-gray-400'} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>
    </aside>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function ReceptionistPortal() {
  const [section, setSection] = useState('opd')
  const nav = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [rooms, setRooms] = useState(getRoomsConfig())
  const [tvGroups, setTvGroups] = useState(getTvGroupsConfig(getRoomsConfig()))
  const [alerts, setAlerts] = useState([])
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef(null)

  function logout() {
    localStorage.clear()
    nav('/login')
  }

  useEffect(() => { saveRoomsConfig(rooms) }, [rooms])

  useEffect(() => {
    const roomCodes = new Set(rooms.map(r => r.code))
    const sanitized = tvGroups.map(g => ({
      ...g,
      left_room: roomCodes.has(g.left_room) ? g.left_room : null,
      right_room: roomCodes.has(g.right_room) ? g.right_room : null,
    }))
    setTvGroups(sanitized)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms])

  useEffect(() => { saveTvGroupsConfig(tvGroups) }, [tvGroups])

  // Fetch follow-up alerts
  useEffect(() => {
    fetchFollowUpAlerts()
    const t = setInterval(fetchFollowUpAlerts, 5 * 60 * 1000)
    return () => clearInterval(t)
  }, [])

  async function fetchFollowUpAlerts() {
    try {
      const { data } = await api.get('/follow-up-alerts/')
      setAlerts(data)
    } catch { }
  }

  async function markFollowUpDone(id) {
    try {
      await api.patch(`/opd-visits/${id}/`, { follow_up_completed: true })
      setAlerts(prev => prev.filter(a => a.id !== id))
      toast.success('Follow-up marked as completed')
    } catch {
      toast.error('Failed to mark as done')
    }
  }

  // Close bell dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const todayAlerts = alerts.filter(a => a.is_today)
  const tomorrowAlerts = alerts.filter(a => a.is_tomorrow)
  const sectionTitle = NAV_GROUPS.flatMap(g => g.items).find(i => i.id === section)?.label || 'Receptionist'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 flex items-center justify-between shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <Hospital size={20} />
          <div>
            <h1 className="font-bold text-sm leading-tight">Receptionist Portal</h1>
            <p className="text-xs opacity-75">{user.email || 'Reception Desk'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-medium">{sectionTitle}</span>

          {/* Follow-up Bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen(o => !o)}
              className={`relative flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                todayAlerts.length > 0
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : tomorrowAlerts.length > 0
                  ? 'bg-amber-400 hover:bg-amber-500 text-white'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Bell size={14} />
              Follow-up
              {alerts.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-emerald-700 text-[9px] font-black rounded-full flex items-center justify-center shadow">
                  {alerts.length}
                </span>
              )}
            </button>

            {/* Dropdown panel */}
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white">
                    <Bell size={14} />
                    <span className="text-sm font-bold">Follow-up Alerts</span>
                  </div>
                  <button onClick={() => setBellOpen(false)} className="text-white/70 hover:text-white"><X size={14} /></button>
                </div>

                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No follow-up alerts</div>
                ) : (
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {alerts.map(alert => (
                      <div key={alert.id} className={`p-3 ${
                        alert.is_today ? 'bg-red-50' : 'bg-amber-50'
                      }`}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <p className="text-sm font-bold text-gray-800">{alert.patient_name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-gray-500 font-mono italic">#{alert.uhid}</p>
                              {alert.patient_phone && (
                                <p className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                                  <Phone size={9} /> {alert.patient_phone}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0 ${
                              alert.is_today ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                            }`}>
                              {alert.is_today ? '🔴 TODAY' : '🟡 TOMORROW'}
                            </span>
                            <span className="text-[9px] text-gray-400 font-bold bg-white/50 px-1.5 py-0.5 rounded border border-gray-100 uppercase tracking-tighter">
                              Visited: {format(new Date(alert.original_visit_date), 'dd MMM')}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-2 line-clamp-1 italic">"{alert.visit_reason || alert.revisit_advice || 'Follow-up'}"</p>
                        
                        <div className="flex gap-2">
                          {alert.patient_phone && (
                            <a href={`tel:${alert.patient_phone}`}
                              className="flex items-center justify-center gap-1.5 flex-1 text-xs font-bold bg-emerald-600 text-white py-2 rounded-xl hover:bg-emerald-700 transition-all shadow-sm">
                              <Phone size={12} /> Call
                            </a>
                          )}
                          <button
                            onClick={() => markFollowUpDone(alert.id)}
                            className="flex items-center justify-center gap-1.5 flex-1 text-xs font-bold bg-gray-100 text-gray-600 py-2 rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
                          >
                            <CheckCircle size={12} /> Done
                          </button>
                        </div>
                        {alert.doctor_name && <p className="text-[10px] text-gray-400 mt-1 text-center">Dr. {alert.doctor_name}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={logout} className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition-all">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Body: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeSection={section} onSelect={setSection} />
        <main className={`flex-1 flex flex-col min-h-0 ${section === 'opd' ? 'overflow-hidden p-0' : section === 'payment_slip' ? 'overflow-hidden p-4' : 'overflow-auto p-5'}`}>
          {section === 'opd' && <OPDSection rooms={rooms} />}
            {section === 'ipd' && <IPDSection mode="ipd" />}
            {section === 'new_admission' && <IPDSection mode="new_admission" />}
            {section === 'emergency' && <EmergencySection />}
            {section === 'patients' && <PatientListSection />}
            {section === 'register' && <RegisterPatientSection />}
            {section === 'payment_slip' && <PaymentSlipSection />}
            {section === 'discharge' && <DischargeSection />}
            {section === 'attendance' && <StaffAttendanceSection />}
            {section === 'opd_template' && (
              <div className="flex-1 overflow-auto">
                <OpdGeneratorTab />
              </div>
            )}
            {section === 'tv' && (
              <TVScreensSection rooms={rooms} setRooms={setRooms} tvGroups={tvGroups} setTvGroups={setTvGroups} />
            )}
          </main>
      </div>
    </div>
  )
}
