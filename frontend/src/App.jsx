import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import StaffPortal from './pages/StaffPortal'
import DoctorPortal from './pages/DoctorPortal'
import ReceptionistPortal from './pages/ReceptionistPortal'
import TVDisplay from './pages/TVDisplay'
import LabPortal from './pages/LabPortal'
import PrintSlipPage from './pages/PrintSlipPage'

// Lazy-load pharmacy so a problem in that module cannot blank the whole app (login / other portals still work).
const PharmacyPortal = lazy(() => import('./pages/PharmacyPortal'))

function PrivateRoute({ children }) {
  return localStorage.getItem('access') ? children : <Navigate to="/login" replace />
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
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  )
}
