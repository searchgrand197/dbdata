import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import api from '../api'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import {
  Clock, CheckCircle, XCircle, Calendar, Pill,
  ClipboardList, Plus, User, Activity, FileText
} from 'lucide-react'

const TABS = [
  { id: 'tasks', label: 'My Tasks', icon: Pill },
  { id: 'leaves', label: 'Apply Leave', icon: Calendar },
  { id: 'tp', label: 'Treatment Plan', icon: ClipboardList },
]


// ─── My Tasks Tab ────────────────────────────────────────────────────────────
function TasksTab() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => { fetchTasks() }, [])

  async function fetchTasks() {
    setLoading(true)
    try {
      const { data } = await api.get(`/treatment-tasks/?mine=true&date=${today}`)
      setTasks(data.results || data)
    } catch { toast.error('Failed to load tasks') }
    finally { setLoading(false) }
  }

  async function markDone(task) {
    try {
      await api.post(`/treatment-tasks/${task.id}/complete/`, { notes: '' })
      toast.success('Task marked done!')
      fetchTasks()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  async function skipTask(task) {
    try {
      await api.post(`/treatment-tasks/${task.id}/skip/`)
      toast.success('Task skipped')
      fetchTasks()
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
  }

  const grouped = tasks.reduce((acc, t) => {
    const key = t.time_of_day || 'Anytime'
    if (!acc[key]) acc[key] = []
    acc[key].push(t)
    return acc
  }, {})

  const statusColor = {
    pending: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
    skipped: 'bg-gray-100 text-gray-500',
  }

  const categoryIcon = {
    medication: '💊',
    nursing: '🩺',
    physiotherapy: '🏃',
    investigation: '🔬',
    diet: '🥗',
    other: '📋',
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-800">Today's Tasks</h2>
        <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">{tasks.length} total</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading tasks...</div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto text-green-400 mb-2" size={40} />
          <p className="text-gray-500">All caught up! No pending tasks.</p>
        </div>
      ) : (
        Object.entries(grouped).sort().map(([time, items]) => (
          <div key={time} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex items-center gap-2">
              <Clock size={14} className="text-gray-400" />
              <span className="text-sm font-semibold text-gray-600">{time}</span>
              <span className="ml-auto text-xs text-gray-400">{items.length} items</span>
            </div>
            <div className="divide-y divide-gray-50">
              {items.map(task => (
                <div key={task.id} className="p-4 flex items-start gap-3">
                  <span className="text-xl">{categoryIcon[task.item_category] || '📋'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 text-sm">{task.item_title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[task.status]}`}>
                        {task.status}
                      </span>
                      {task.priority === 'stat' && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">STAT</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{task.patient_name} — {task.notes_from_doctor}</p>
                  </div>
                  {task.status === 'pending' && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => markDone(task)} className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700 font-medium">Done</button>
                      <button onClick={() => skipTask(task)} className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-lg hover:bg-gray-200 font-medium">Skip</button>
                    </div>
                  )}
                  {task.status === 'done' && <CheckCircle className="text-green-500 shrink-0" size={20} />}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// ─── Leave Tab ───────────────────────────────────────────────────────────────
function LeaveTab() {
  const [form, setForm] = useState({
    leave_type: 'earned', start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'), reason: '', is_half_day: false
  })
  const [leaves, setLeaves] = useState([])
  const [loading, setLoading] = useState(false)
  const [balances, setBalances] = useState([])
  const [earnedThisMonth, setEarnedThisMonth] = useState(null)  // null = loading

  useEffect(() => { fetchLeaves() }, [])

  async function fetchLeaves() {
    try {
      const { data } = await api.get('/attendance/leaves/')
      // Backend uses success_response → { success, data: [...] }
      const payload = data?.data || data?.results || data
      setLeaves(Array.isArray(payload) ? payload : [])

      // Also fetch current leave balances
      const resBal = await api.get('/attendance/leave-balances/')
      const balPayload = resBal.data?.data || resBal.data?.results || resBal.data
      // Only keep non-earned types here; earned will be shown as current-month value.
      const list = (Array.isArray(balPayload) ? balPayload : []).filter(b => b.leave_type !== 'earned')
      setBalances(list)

      // Fetch earned leave entitlement for current month via dedicated endpoint
      const earnedRes = await api.get('/attendance/leave-balances/my-earned-this-month/')
      const earnedData = earnedRes.data?.data ?? earnedRes.data
      setEarnedThisMonth(Number(earnedData?.earned_days ?? 0))
    } catch (e) {
      setEarnedThisMonth(0)
      toast.error(e.response?.data?.detail || 'Failed to load leaves')
    }
  }

  const currentMonthName = new Date().toLocaleString('default', { month: 'long' })

  async function applyLeave(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/attendance/leaves/', { ...form, total_days: 1 })
      toast.success('Leave applied!')
      fetchLeaves()
      setForm(f => ({ ...f, reason: '' }))
    } catch (e) {
      const msg =
        e.response?.data?.detail ||
        e.response?.data?.errors ||
        e.response?.data?.non_field_errors ||
        'Error submitting leave'
      toast.error(typeof msg === 'string' ? msg : 'Error submitting leave')
    }
    finally { setLoading(false) }
  }

  const statusColor = { pending: 'text-amber-600 bg-amber-50', approved: 'text-green-600 bg-green-50', rejected: 'text-red-600 bg-red-50' }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Other leave balances (non-earned) */}
      {balances.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {balances.map(b => (
            <div key={b.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 shadow-sm">
              <span className="text-sm font-bold text-gray-800">{b.balance_days}</span>
              <span className="text-xs text-gray-500 capitalize">{b.leave_type} days</span>
            </div>
          ))}
        </div>
      )}
      {/* Apply form */}
      <form onSubmit={applyLeave} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Calendar size={18} className="text-blue-500" /> Apply Leave
          </h3>
          {/* Earned leave this month tile */}
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5">
            <span className="text-emerald-600 text-lg font-bold leading-none">
              {earnedThisMonth === null ? '…' : earnedThisMonth}
            </span>
            <div className="leading-tight">
              <p className="text-xs font-semibold text-emerald-700">Earned Leave</p>
              <p className="text-xs text-emerald-500">{currentMonthName}</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Leave Type</label>
            <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="sick">Sick Leave</option>
              <option value="casual">Casual Leave</option>
              <option value="earned">Earned Leave</option>
              <option value="unpaid">Unpaid Leave</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.is_half_day} onChange={e => setForm(f => ({ ...f, is_half_day: e.target.checked }))} className="w-4 h-4" />
              Half Day
            </label>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">From</label>
            <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">To</label>
            <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Reason</label>
          <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={2}
            placeholder="Brief reason for leave..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-60 transition-all">
          {loading ? 'Submitting...' : 'Submit Leave Request'}
        </button>
      </form>

      {/* Leave history */}
      <div className="space-y-2">
        <h3 className="font-semibold text-gray-700 text-sm">My Leave History</h3>
        {leaves.slice(0, 8).map(l => (
          <div key={l.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800 capitalize">{l.leave_type} leave</p>
              <p className="text-xs text-gray-500">{l.start_date} → {l.end_date} · {l.total_days} day(s)</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusColor[l.status]}`}>{l.status}</span>
              {l.status === 'pending' && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.post(`/attendance/leaves/${l.id}/cancel/`)
                      toast.success('Leave cancelled')
                      fetchLeaves()
                    } catch (e) {
                      const msg =
                        e.response?.data?.detail ||
                        e.response?.data?.errors ||
                        'Unable to cancel leave'
                      toast.error(typeof msg === 'string' ? msg : 'Unable to cancel leave')
                    }
                  }}
                  className="text-xs px-2 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Treatment Plan Tab ──────────────────────────────────────────────────────
function TreatmentPlanTab() {
  const [admissions, setAdmissions] = useState([])
  const [selectedAdm, setSelectedAdm] = useState('')
  const [plan, setPlan] = useState({ name: '', start_date: format(new Date(), 'yyyy-MM-dd'), end_date: '' })
  const [items, setItems] = useState([{ title: '', instructions: '', category: 'medication', day_offset: 0, time_of_day: '08:00' }])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/ipd-admissions/?status=admitted').then(({ data }) => setAdmissions(data.results || data))
  }, [])

  function addItem() {
    setItems(p => [...p, { title: '', instructions: '', category: 'medication', day_offset: 0, time_of_day: '08:00' }])
  }

  function updateItem(i, field, val) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  function removeItem(i) {
    setItems(p => p.filter((_, idx) => idx !== i))
  }

  async function submit(e) {
    e.preventDefault()
    if (!selectedAdm) return toast.error('Select a patient')
    setLoading(true)
    try {
      const { data: pl } = await api.post('/treatment-plans/', {
        ipd_admission: selectedAdm,
        ...plan,
      })
      for (let i = 0; i < items.length; i++) {
        await api.post('/treatment-plan-items/', {
          plan: pl.id,
          sequence: i + 1,
          ...items[i],
        })
      }
      toast.success('Treatment plan created!')
      setItems([{ title: '', instructions: '', category: 'medication', day_offset: 0, time_of_day: '08:00' }])
    } catch (e) { toast.error(e.response?.data?.detail || 'Error') }
    finally { setLoading(false) }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <form onSubmit={submit} className="space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <h3 className="font-bold text-gray-800 flex items-center gap-2"><ClipboardList size={18} className="text-purple-500" /> New Treatment Plan</h3>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Select Patient (IPD)</label>
            <select value={selectedAdm} onChange={e => setSelectedAdm(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none">
              <option value="">-- Select admission --</option>
              {admissions.map(a => (
                <option key={a.id} value={a.id}>{a.patient_name || a.id} — Bed {a.bed_code || 'N/A'}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-3">
              <label className="text-xs text-gray-500 mb-1 block">Plan Name</label>
              <input value={plan.name} onChange={e => setPlan(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Post-op Day 0–2"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
              <input type="date" value={plan.start_date} onChange={e => setPlan(p => ({ ...p, start_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">End Date (optional)</label>
              <input type="date" value={plan.end_date} onChange={e => setPlan(p => ({ ...p, end_date: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Order Items</h3>
            <button type="button" onClick={addItem}
              className="flex items-center gap-1 bg-purple-100 text-purple-600 text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-purple-200 transition-all">
              <Plus size={13} /> Add Item
            </button>
          </div>
          <div className="space-y-3">
            {items.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-purple-100 text-purple-600 font-bold px-2 py-0.5 rounded-full">#{i + 1}</span>
                  <input value={item.title} onChange={e => updateItem(i, 'title', e.target.value)}
                    placeholder="e.g. Give glucose, Antibiotic..."
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none" />
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <select value={item.category} onChange={e => updateItem(i, 'category', e.target.value)}
                    className="col-span-2 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    <option value="medication">💊 Medication</option>
                    <option value="nursing">🩺 Nursing</option>
                    <option value="physiotherapy">🏃 Physiotherapy</option>
                    <option value="investigation">🔬 Investigation</option>
                    <option value="diet">🥗 Diet</option>
                    <option value="other">📋 Other</option>
                  </select>
                  <div className="relative">
                    <input type="number" min={0} max={30} value={item.day_offset}
                      onChange={e => updateItem(i, 'day_offset', parseInt(e.target.value))}
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none" />
                    <span className="absolute -top-2 left-1 text-xs text-gray-400">Day</span>
                  </div>
                  <input type="time" value={item.time_of_day} onChange={e => updateItem(i, 'time_of_day', e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                </div>
                <input value={item.instructions} onChange={e => updateItem(i, 'instructions', e.target.value)}
                  placeholder="Dose, route, conditions (e.g. 500ml IV over 2h)"
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none" />
              </div>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-purple-600 text-white py-3 rounded-2xl font-bold text-sm hover:bg-purple-700 disabled:opacity-60 transition-all">
          {loading ? 'Creating Plan...' : 'Create Treatment Plan'}
        </button>
      </form>
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────
export default function StaffPortal() {
  const [tab, setTab] = useState('tasks')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <Layout title="Staff Portal" subtitle={user.email || 'Staff'} color="blue" tabs={TABS} activeTab={tab} onTab={setTab}>
      {tab === 'tasks' && <TasksTab />}
      {tab === 'tasks' && <TasksTab />}
      {tab === 'leaves' && <LeaveTab />}
      {tab === 'tp' && <TreatmentPlanTab />}
    </Layout>
  )
}
