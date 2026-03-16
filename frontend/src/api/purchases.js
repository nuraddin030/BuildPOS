import api from './api'

export const getPurchases = (params) => api.get('/api/v1/purchases', { params })
export const getPurchaseById = (id) => api.get(`/api/v1/purchases/${id}`)
export const createPurchase = (data) => api.post('/api/v1/purchases', data)
export const receivePurchase = (id, data) => api.post(`/api/v1/purchases/${id}/receive`, data)
export const addPayment = (id, data) => api.post(`/api/v1/purchases/${id}/payments`, data)
export const cancelPurchase = (id) => api.patch(`/api/v1/purchases/${id}/cancel`)

// ✅ PENDING xaridga yangi item qo'shish
export const addItemToPurchase = (id, data) => api.post(`/api/v1/purchases/${id}/items`, data)