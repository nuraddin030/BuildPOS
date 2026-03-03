import axios from 'axios'

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
    headers: {
        'Content-Type': 'application/json',
    },
})

// Har bir so'rovga token qo'shish
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('buildpos_token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Token muddati tugagan yoki 401 bo'lsa — login sahifasiga
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('buildpos_token')
            localStorage.removeItem('buildpos_user')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

export default api