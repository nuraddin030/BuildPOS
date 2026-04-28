import api from './api'

export const getCustomers = (params) => api.get('/api/v1/customers', { params })
export const createCustomer = (data) => api.post('/api/v1/customers', data)
export const updateCustomer = (id, data) => api.put(`/api/v1/customers/${id}`, data)