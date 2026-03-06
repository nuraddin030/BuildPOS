import api from './api'

export const getWarehouses = (params) => api.get('/api/v1/warehouses', { params })
export const getAllWarehouses = () => api.get('/api/v1/warehouses/all')
export const getWarehouseById = (id) => api.get(`/api/v1/warehouses/${id}`)
export const createWarehouse = (data) => api.post('/api/v1/warehouses', data)
export const updateWarehouse = (id, data) => api.put(`/api/v1/warehouses/${id}`, data)
export const deleteWarehouse = (id) => api.delete(`/api/v1/warehouses/${id}`)
export const toggleWarehouseStatus = (id) => api.patch(`/api/v1/warehouses/${id}/toggle-status`)
export const setDefaultWarehouse = (id) => api.patch(`/api/v1/warehouses/${id}/set-default`)