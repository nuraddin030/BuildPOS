import api from './api'

export const uploadImage = (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/api/v1/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    })
}