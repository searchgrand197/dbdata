import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../api'
import { Stethoscope } from 'lucide-react'
import { getRoomsConfig, DEFAULT_ROOMS, getTvGroupsConfig } from '../utils/rooms'

function getRoomMap() {
  const rooms = getRoomsConfig()
  const fallback = DEFAULT_ROOMS
  const source = Array.isArray(rooms) && rooms.length ? rooms : fallback
  return source.reduce((acc, r, idx) => {
    acc[r.code] = { ...r, color: idx % 3 === 0 ? 'from-blue-900 to-blue-700' : idx % 3 === 1 ? 'from-emerald-900 to-emerald-700' : 'from-purple-900 to-purple-700' }
    return acc
  }, {})
}

export default function TVDisplay() {
  const { roomCode } = useParams()
  const [roomMap, setRoomMap] = useState(getRoomMap())
  const tvGroups = getTvGroupsConfig(Object.values(roomMap))
  const matchedTv = tvGroups.find(g => g.id === roomCode)
  const selectedCodes = matchedTv
    ? [matchedTv.left_room, matchedTv.right_room].filter(Boolean)
    : String(roomCode || '').split('+').filter(Boolean)
  const selectedRooms = selectedCodes.map(code => ({ ...roomMap[code], code })).filter(Boolean)
  const room = selectedRooms[0] || roomMap[roomCode] || { label: 'OPD', prefix: '', color: 'from-gray-900 to-gray-700' }
  const roomTitle = matchedTv?.name || (selectedRooms.length > 1
    ? `Combined TV: ${selectedRooms.map(r => r.label).join(' + ')}`
    : room.label)
  const [boardData, setBoardData] = useState([])
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setRoomMap(getRoomMap()), 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    fetchTokens()
    const interval = setInterval(fetchTokens, 5000)
    return () => clearInterval(interval)
  }, [roomCode, roomMap])

  async function fetchTokens() {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const [v, d] = await Promise.all([
        api.get(`/opd-visits/?visit_date=${today}&limit=1000`),
        api.get('/doctor-profiles/'),
      ])
      const visits = v.data?.data || v.data?.results || v.data
      const docs = d.data?.data || d.data?.results || d.data || []
      const allRooms = Object.values(roomMap)
      const withRooms = (Array.isArray(docs) ? docs : []).map((doc, idx) => ({
        ...doc,
        room_code: allRooms[idx % allRooms.length]?.code,
      }))
      const rows = (Array.isArray(visits) ? visits : []).map(vis => {
        const doc = withRooms.find(x => x.user === vis.doctor_user)
        return { ...vis, room_code: vis.room_code || doc?.room_code }
      })
      const renderRooms = selectedRooms.length ? selectedRooms : [room]
      const perRoom = renderRooms.map((rm) => {
        const roomRows = rows.filter(r => r.room_code === rm.code)
        const current = roomRows
          .filter(v => v.status === 'in_progress' || v.status === 'in_consultation')
          .sort((a, b) => (a.token_number || 0) - (b.token_number || 0))[0] || null
        const queue = roomRows
          .filter(v => v.status === 'waiting')
          .sort((a, b) => (a.token_number || 0) - (b.token_number || 0))
          .slice(0, 6)
        return { room: rm, current, queue }
      })
      setBoardData(perRoom)
    } catch {
      // Silently retry
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <div className="px-8 py-4 border-b border-gray-200 flex items-center justify-between">
          <h1 className="text-2xl font-bold">{roomTitle}</h1>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums">{format(time, 'HH:mm')}</p>
          <p className="text-sm text-gray-500">{format(time, 'dd MMM yyyy')}</p>
        </div>
      </div>

      {/* Split board: one doctor/room per column */}
      <div className={`grid gap-6 p-8 ${boardData.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
        {(boardData.length ? boardData : [{ room, current: null, queue: [] }]).map(({ room: rm, current, queue }) => (
          <div key={rm.code} className="rounded-2xl border border-gray-200 p-6 bg-white min-h-[480px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Stethoscope className="text-blue-700" size={24} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Doctor</p>
                <p className="font-semibold">{rm.label}</p>
              </div>
            </div>

            <p className="text-sm text-gray-500 mb-2">Current Token</p>
            {current ? (
              <>
                <div className="px-6 py-4 rounded-2xl bg-orange-500 text-white text-5xl font-black shadow-lg inline-block">
                  {rm.prefix}{current.token_number}
                </div>
                <p className="mt-3 text-base font-semibold">{current.patient_name || 'Patient'}</p>
              </>
            ) : (
              <div className="px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 font-semibold inline-block">
                No active token
              </div>
            )}

            <div className="mt-6">
              <h2 className="text-base font-bold mb-3">Queue</h2>
              {queue.length === 0 ? (
                <p className="text-gray-400">No waiting tokens</p>
              ) : (
                <div className="space-y-2">
                  {queue.map((v) => (
                    <div key={v.id} className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5">
                      <span className="text-sm text-gray-600">Token</span>
                      <span className="text-2xl font-black text-orange-500">{rm.prefix}{v.token_number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
