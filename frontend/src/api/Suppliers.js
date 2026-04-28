import api from './api'

export const getSuppliers = (params) => api.get('/api/suppliers', { params })
export const createSupplier = (data) => api.post('/api/suppliers', data)
export const updateSupplier = (id, data) => api.put(`/api/suppliers/${id}`, data)
export const deleteSupplier = (id) => api.delete(`/api/suppliers/${id}`)
export const getSupplierDebts = (id) => api.get(`/api/suppliers/${id}/debts`)