import api from './api'

export const getProducts = (params) => api.get('/api/v1/products', { params })
export const getProductById = (id) => api.get(`/api/v1/products/${id}`)
export const createProduct = (data) => api.post('/api/v1/products', data)
export const updateProduct = (id, data) => api.put(`/api/v1/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/api/v1/products/${id}`)
export const toggleProductStatus = (id) => api.patch(`/api/v1/products/${id}/toggle-status`)
export const getCategories = () => api.get('/api/v1/categories', { params: { size: 100 } })
export const getUnits = () => api.get('/api/v1/units')
export const getWarehouses = () => api.get('/api/v1/warehouses?size=100&active=true')
export const adjustStock = (productUnitId, data) => api.post('/api/v1/products/stock/adjust', { productUnitId: Number(productUnitId), ...data })
export const getExchangeRate = () => api.get('/api/v1/exchange-rate/current')
export const getCategoriesTree = () => api.get('api/v1/categories/tree')
export const getPriceHistory = (productUnitId) => api.get(`/api/v1/products/units/${productUnitId}/price-history`)

export const downloadImportTemplate = () =>
    api.get('/api/v1/products/import/template', { responseType: 'blob' })

export const previewImport = (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post('/api/v1/products/import/preview', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}

export const executeImport = (file, mapping, warehouseId) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mapping', JSON.stringify(mapping))
    if (warehouseId) fd.append('warehouseId', String(warehouseId))
    return api.post('/api/v1/products/import/execute', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}