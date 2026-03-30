import api from './api'

export const salesApi = {
    // ── SAVATCHA ─────────────────────────────────────────────────────
    createDraft:  (data)          => api.post('/api/v1/sales', data),
    complete:     (id, payments)  => api.post(`/api/v1/sales/${id}/complete`, payments),
    cancel:       (id)            => api.patch(`/api/v1/sales/${id}/cancel`),
    hold:         (id)            => api.patch(`/api/v1/sales/${id}/hold`),
    unhold:       (id)            => api.patch(`/api/v1/sales/${id}/unhold`),
    checkWarehouses: (ids)        => api.post('/api/v1/sales/check-warehouses', ids),

    // ── PENDING ORDER ─────────────────────────────────────────────────
    submitPending:  (id)          => api.patch(`/api/v1/sales/${id}/submit`),
    approvePending: (id, data)    => api.post(`/api/v1/sales/${id}/approve`, data),
    rejectPending:  (id, reason)  => api.patch(`/api/v1/sales/${id}/reject`, null, { params: { reason } }),
    takePending:    (id)          => api.patch(`/api/v1/sales/${id}/take`),
    getPending:     (params)      => api.get('/api/v1/sales/pending', { params }),
    getMyPending:   (params)      => api.get('/api/v1/sales/my-pending', { params }),
    setCustomer:    (id, customerId) => api.patch(`/api/v1/sales/${id}/customer`, null, { params: { customerId } }),

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