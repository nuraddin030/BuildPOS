import api from './api'

export const getUnits = (params) => api.get('/api/v1/units', { params })
export const getAllUnits = () => api.get('/api/v1/units/all')
export const getUnitById = (id) => api.get(`/api/v1/units/${id}`)
export const createUnit = (data) => api.post('/api/v1/units', data)
export const updateUnit = (id, data) => api.put(`/api/v1/units/${id}`, data)
export const deleteUnit = (id) => api.delete(`/api/v1/units/${id}`)
export const toggleUnitStatus = (id) => api.patch(`/api/v1/units/${id}/toggle-status`)