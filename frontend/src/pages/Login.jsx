import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import toast from 'react-hot-toast'
import { Hospital, LogIn } from 'lucide-react'

const ROLES = [
  { label: 'Staff', value: 'staff', path: '/staff' },
  { label: 'Doctor', value: 'doctor', path: '/doctor' },
  { label: 'Receptionist', value: 'receptionist', path: '/receptionist' },
  { label: 'Lab', value: 'lab', path: '/lab' },
  { label: 'Pharmacy', value: 'pharmacy', path: '/pharmacy' },
]

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('staff')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)

    // Attempt to automatically enter fullscreen upon user interaction (login submit)
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {})
      }
    } catch (e) {
      // Ignore fullscreen errors silently
    }

    try {
      // Backend login endpoint: POST /api/v1/auth/login/
      const { data } = await api.post('/auth/login/', { email, password })
      const payload = data?.data || {}

      localStorage.setItem('access', payload.access)
      localStorage.setItem('refresh', payload.refresh)
      localStorage.setItem('role', role)
      localStorage.setItem('user', JSON.stringify(payload))
      const found = ROLES.find(r => r.value === role)
      nav(found?.path || '/staff')
      toast.success(`Welcome! Logged in as ${role}`)
    } catch {
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <Hospital className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white">HMS Portal</h1>
          <p className="text-blue-200 text-sm mt-1">Hospital Management System</p>
        </div>

        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {/* Role selector */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">Login As</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRole(r.value)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${role === r.value
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@hospital.com"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            <LogIn size={18} />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-gray-400">
            TV Token Display: <a href="/tv/room1" className="text-blue-500 underline">/tv/room1</a>
          </p>
        </div>
      </div>
    </div>
  )
}
