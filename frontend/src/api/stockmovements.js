import api from './api'

export const getStockMovements = (params) => api.get('/api/v1/stock-movements', { params })