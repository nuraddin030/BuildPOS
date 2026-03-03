import api from './api'

export const login = (data) => api.post('/api/auth/login', data)
export const logout = () => api.post('/api/auth/logout')
export const getMe = () => api.get('/api/v1/employees/me')