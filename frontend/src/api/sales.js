import api from './api'

export const salesApi = {
    // ── SAVATCHA ─────────────────────────────────────────────────────
    createDraft:  (data)          => api.post('/api/v1/sales', data),
    complete:     (id, payments)  => api.post(`/api/v1/sales/${id}/complete`, payments),
    cancel:       (id)            => api.patch(`/api/v1/sales/${id}/cancel`),
    hold:         (id)            => api.patch(`/api/v1/sales/${id}/hold`),
    unhold:       (id)            => api.patch(`/api/v1/sales/${id}/unhold`),
    checkWarehouses: (ids)        => api.post('/api/v1/sales/check-warehouses', ids),

    // ── QAYTARISH ─────────────────────────────────────────────────────
    returnSale:   (id, data)      => api.post(`/api/v1/sales/${id}/return`, data),

    // ── STATISTIKA ────────────────────────────────────────────────────
    getTodayStats: ()             => api.get('/api/v1/sales/stats/today'),

    // ── RO'YXAT ───────────────────────────────────────────────────────
    getOpenSales: (params)        => api.get('/api/v1/sales/open', { params }),
    getHistory:   (params)        => api.get('/api/v1/sales', { params }),
    getMyHistory: (params)        => api.get('/api/v1/sales/my-history', { params }),
    getById:      (id)            => api.get(`/api/v1/sales/${id}`),
    // getTodayStats o'rniga:
    getStats: (from, to) => api.get('/api/v1/sales/stats', { params: { from, to } }),
}