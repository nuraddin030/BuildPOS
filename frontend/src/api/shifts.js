import api from './api'

export const shiftsApi = {
    // ── SMENA ─────────────────────────────────────────────────────────
    open:          (data)         => api.post('/api/v1/shifts/open', data),
    close:         (data)         => api.post('/api/v1/shifts/close', data),
    getCurrent:    ()             => api.get('/api/v1/shifts/current'),

    // ── RO'YXAT ───────────────────────────────────────────────────────
    getAll:        (params)       => api.get('/api/v1/shifts', { params }),
    getMy:         (params)       => api.get('/api/v1/shifts/my', { params }),
    getById:       (id)           => api.get(`/api/v1/shifts/${id}`),
    getSummary:    (id)           => api.get(`/api/v1/shifts/${id}/summary`),
}
