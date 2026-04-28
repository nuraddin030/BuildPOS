import api from './api'

export const getPurchases = (params) => api.get('/api/v1/purchases', { params })
export const getPurchaseById = (id) => api.get(`/api/v1/purchases/${id}`)
export const createPurchase = (data) => api.post('/api/v1/purchases', data)
export const updatePurchase = (id, data) => api.put(`/api/v1/purchases/${id}`, data)
export const receivePurchase = (id, data) => api.post(`/api/v1/purchases/${id}/receive`, data)
export const addPayment = (id, data) => api.post(`/api/v1/purchases/${id}/payments`, data)
export const cancelPurchase = (id) => api.patch(`/api/v1/purchases/${id}/cancel`)

// Mahsulot birligi uchun oxirgi xarid ma'lumoti (autofill)
export const getLastPurchaseInfo = (productUnitId, supplierId) =>
    api.get(`/api/v1/purchases/last-by-product-unit/${productUnitId}`, {
        params: supplierId ? { supplierId } : {}
    })