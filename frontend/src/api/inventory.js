import api from './api'

export const inventoryApi = {
    getAll:      (params)                  => api.get('/api/v1/inventory', { params }),
    getById:     (id)                      => api.get(`/api/v1/inventory/${id}`),
    create:      (data)                    => api.post('/api/v1/inventory', data),
    updateItem:  (sessionId, itemId, data) => api.patch(`/api/v1/inventory/${sessionId}/items/${itemId}`, data),
    complete:    (id)                      => api.post(`/api/v1/inventory/${id}/complete`),
    delete:      (id)                      => api.delete(`/api/v1/inventory/${id}`),
}