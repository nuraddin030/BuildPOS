import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Har bir so'rovga access token qo'shish
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('buildpos_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// 401 da refresh token bilan qayta urinish
let isRefreshing = false
let failedQueue = []

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
            const refreshToken = sessionStorage.getItem('buildpos_refresh_token')

            // Refresh token yo'q — to'g'ridan login ga
            if (!refreshToken) {
                clearSession()
                return Promise.reject(error)
            }

            if (isRefreshing) {
                // Bir vaqtda bir nechta so'rov — navbatga qo'shish
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
                const res = await axios.post('/api/auth/refresh', { refreshToken })
                const newToken = res.data.token
                sessionStorage.setItem('buildpos_token', newToken)
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
    sessionStorage.removeItem('buildpos_token')
    sessionStorage.removeItem('buildpos_refresh_token')
    sessionStorage.removeItem('buildpos_user')
    sessionStorage.removeItem('buildpos_permissions')
    window.location.href = '/login'
}

export default api