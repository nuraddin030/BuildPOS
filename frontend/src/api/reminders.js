import api from './api'

export const remindersApi = {
    getAll:   ()           => api.get('/api/v1/reminders'),
    create:   (text, dueDate) => api.post('/api/v1/reminders', { text, dueDate: dueDate || '' }),
    markDone: (id)         => api.patch(`/api/v1/reminders/${id}/done`),
    delete:   (id)         => api.delete(`/api/v1/reminders/${id}`),
}