import api from './api'

export const getPartners = (params) => api.get('/api/v1/partners', { params })
export const getPartnerById = (id) => api.get(`/api/v1/partners/${id}`)
export const createPartner = (data) => api.post('/api/v1/partners', data)
export const updatePartner = (id, data) => api.put(`/api/v1/partners/${id}`, data)
export const togglePartnerStatus = (id) => api.patch(`/api/v1/partners/${id}/toggle-status`)