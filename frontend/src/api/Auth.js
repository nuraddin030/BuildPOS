import axios from 'axios'
import api from './api'

// Login uchun oddiy axios — interceptor 401 da clearSession() chaqirmasin
export const login  = (data) => axios.post('/api/auth/login', data, { withCredentials: true })
export const logout = ()     => api.post('/api/auth/logout')
export const getMe  = ()     => api.get('/api/v1/employees/me')