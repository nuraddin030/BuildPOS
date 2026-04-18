import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true, // HttpOnly cookie avtomatik yuboriladi
})

// ── Access token — faqat JS xotirasida (sessionStorage/localStorage emas) ──
let _accessToken = null
export const setAccessToken  = (token) => { _accessToken = token }
export const getAccessToken  = ()      => _accessToken
export const clearAccessToken = ()     => { _accessToken = null }

// Har bir so'rovga access token qo'shish
api.interceptors.request.use((config) => {
    if (_accessToken) {
        config.headers.Authorization = `Bearer ${_accessToken}`
    }
    return config
})

// 401 da refresh cookie bilan qayta urinish
let isRefreshing = false
let failedQueue  = []

const processQueue = (error, token = null) => {
    failedQueue.forEach(({ resolve, reject }) => {
        if (error) reject(error)
        else resolve(token)
    })
    failedQueue = []
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject })
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`
                    return api(originalRequest)
                }).catch(err => Promise.reject(err))
            }

            originalRequest._retry = true
            isRefreshing = true

            try {
                // Cookie avtomatik yuboriladi (withCredentials: true)
                const res = await axios.post('/api/auth/refresh', null, { withCredentials: true })
                const newToken = res.data.token
                setAccessToken(newToken)
                api.defaults.headers.common.Authorization = `Bearer ${newToken}`
                processQueue(null, newToken)
                originalRequest.headers.Authorization = `Bearer ${newToken}`
                return api(originalRequest)
            } catch (refreshErr) {
                processQueue(refreshErr, null)
                clearSession()
                return Promise.reject(refreshErr)
            } finally {
                isRefreshing = false
            }
        }

        return Promise.reject(error)
    }
)

function clearSession() {
    clearAccessToken()
    sessionStorage.removeItem('buildpos_user')
    sessionStorage.removeItem('buildpos_permissions')
    window.location.href = '/login'
}

export default api