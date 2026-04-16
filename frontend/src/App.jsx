import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'

const StaffPortal = lazy(() => import('./pages/StaffPortal'))
const DoctorPortal = lazy(() => import('./pages/DoctorPortal'))
const ReceptionistPortal = lazy(() => import('./pages/ReceptionistPortal'))
const TVDisplay = lazy(() => import('./pages/TVDisplay'))
const LabPortal = lazy(() => import('./pages/LabPortal'))
const PrintSlipPage = lazy(() => import('./pages/PrintSlipPage'))
const PharmacyPortal = lazy(() => import('./pages/PharmacyPortal'))

const ROLE_PATHS = {
  staff: '/staff',
  doctor: '/doctor',
  receptionist: '/receptionist',
  lab: '/lab',
  pharmacy: '/pharmacy',
}

function PrivateRoute({ children }) {
  return localStorage.getItem('access') ? children : <Navigate to="/login" replace />
}

function HomeRedirect() {
  const token = localStorage.getItem('access')
  if (token) {
    const role = localStorage.getItem('role') || 'staff'
    return <Navigate to={ROLE_PATHS[role] || '/staff'} replace />
  }
  return <Navigate to="/login" replace />
}

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
      Loading…
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/staff" element={<PrivateRoute><StaffPortal /></PrivateRoute>} />
        <Route path="/doctor" element={<PrivateRoute><DoctorPortal /></PrivateRoute>} />
        <Route path="/receptionist" element={<PrivateRoute><ReceptionistPortal /></PrivateRoute>} />
        <Route path="/lab" element={<PrivateRoute><LabPortal /></PrivateRoute>} />
        <Route
          path="/pharmacy"
          element={
            <PrivateRoute>
              <PharmacyPortal />
            </PrivateRoute>
          }
        />
        <Route path="/tv/:roomCode" element={<TVDisplay />} />
        <Route path="/print-slip" element={<PrintSlipPage />} />
        <Route path="/" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  )
}
