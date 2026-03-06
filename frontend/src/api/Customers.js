import api from './api'

export const getCustomers = (params) => api.get('/api/v1/customers', { params })
export const getCustomerById = (id) => api.get(`/api/v1/customers/${id}`)
export const getCustomerByPhone = (phone) => api.get(`/api/v1/customers/phone/${phone}`)
export const createCustomer = (data) => api.post('/api/v1/customers', data)
export const updateCustomer = (id, data) => api.put(`/api/v1/customers/${id}`, data)
export const getCustomerDebts = (id) => api.get(`/api/v1/customers/${id}/debts`)
export const payCustomerDebt = (debtId, data) => api.post(`/api/v1/customers/debts/${debtId}/pay`, data)