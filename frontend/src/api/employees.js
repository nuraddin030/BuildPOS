import api from './api'

export const getEmployees = () => api.get('/api/v1/employees')
export const getEmployeeById = (id) => api.get(`/api/v1/employees/${id}`)
export const createEmployee = (data) => api.post('/api/v1/employees', data)
export const updateEmployee = (id, data) => api.put(`/api/v1/employees/${id}`, data)
export const toggleEmployeeStatus = (id) => api.patch(`/api/v1/employees/${id}/toggle-status`)
export const unlockEmployee = (id) => api.patch(`/api/v1/employees/${id}/unlock`)
export const grantPermission = (id, data) => api.post(`/api/v1/employees/${id}/permissions`, data)
export const revokePermission = (id, permissionId) => api.delete(`/api/v1/employees/${id}/permissions/${permissionId}`)

export const getPermissionGroups = () => api.get('/api/v1/permissions/groups')
export const getPermissions = () => api.get('/api/v1/permissions')
export const createPermissionGroup = (data) => api.post('/api/v1/permissions/groups', data)
export const createPermission = (data) => api.post('/api/v1/permissions', data)
export const deletePermission = (id) => api.delete(`/api/v1/permissions/${id}`)
export const deletePermissionGroup = (id) => api.delete(`/api/v1/permissions/groups/${id}`)

export const getRoles = () => api.get('/api/v1/roles')