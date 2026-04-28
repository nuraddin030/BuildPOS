import api from './api'

export const getCategoryTree = () => api.get('/api/v1/categories/tree')
export const getCategories = (params) => api.get('/api/v1/categories', { params })
export const createCategory = (data) => api.post('/api/v1/categories', data)
export const updateCategory = (id, data) => api.put(`/api/v1/categories/${id}`, data)
export const deleteCategory = (id) => api.delete(`/api/v1/categories/${id}`)
export const toggleCategoryStatus = (id) => api.patch(`/api/v1/categories/${id}/toggle-status`)