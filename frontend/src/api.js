import axios from 'axios'

const api = axios.create({ baseURL: '/api/v1' })

// Helper – read hospital_id from the stored user object
export function getHospitalId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    return user.hospital_id || null
  } catch {
    return null
  }
}

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access')
  if (token) cfg.headers.Authorization = `Bearer ${token}`

  // Auto-inject hospital_id into every mutating request body so superuser
  // requests work without callers having to remember to add it manually.
  const hospitalId = getHospitalId()
  if (hospitalId && ['post', 'put', 'patch'].includes((cfg.method || '').toLowerCase())) {
    if (cfg.data && typeof cfg.data === 'object' && !(cfg.data instanceof FormData)) {
      if (!cfg.data.hospital_id) {
        cfg.data = { ...cfg.data, hospital_id: hospitalId }
      }
    }
  }

  return cfg
})

api.interceptors.response.use(
  r => r,
  async err => {
    if (err.response?.status === 401) {
      const refresh = localStorage.getItem('refresh')
      if (refresh) {
        try {
          // Use SimpleJWT refresh endpoint: POST /api/v1/auth/refresh/
          const { data } = await axios.post('/api/v1/auth/refresh/', { refresh })
          const access = data?.access || data?.data?.access
          if (!access) throw new Error('No access token in refresh response')
          localStorage.setItem('access', access)
          err.config.headers.Authorization = `Bearer ${access}`
          return api(err.config)
        } catch {
          localStorage.clear()
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export default api
