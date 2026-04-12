import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import StaffPortal from './pages/StaffPortal'
import DoctorPortal from './pages/DoctorPortal'
import ReceptionistPortal from './pages/ReceptionistPortal'
import TVDisplay from './pages/TVDisplay'
import LabPortal from './pages/LabPortal'
import PharmacyPortal from './pages/PharmacyPortal'
import PrintSlipPage from './pages/PrintSlipPage'

function PrivateRoute({ children }) {
  return localStorage.getItem('access') ? children : <Navigate to="/login" />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/staff" element={<PrivateRoute><StaffPortal /></PrivateRoute>} />
      <Route path="/doctor" element={<PrivateRoute><DoctorPortal /></PrivateRoute>} />
      <Route path="/receptionist" element={<PrivateRoute><ReceptionistPortal /></PrivateRoute>} />
      <Route path="/lab" element={<PrivateRoute><LabPortal /></PrivateRoute>} />
      <Route path="/pharmacy" element={<PrivateRoute><PharmacyPortal /></PrivateRoute>} />
      <Route path="/tv/:roomCode" element={<TVDisplay />} />
      <Route path="/print-slip" element={<PrintSlipPage />} />
      <Route path="/" element={<Navigate to="/login" />} />
    </Routes>
  )
}
