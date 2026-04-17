import api from './api'

export const customerDebtsApi = {
    getAll:        (params) => api.get('/api/v1/customers/debts', { params }),
    getStats:      ()       => api.get('/api/v1/customers/debts/stats'),
    getGrouped:    (search) => api.get('/api/v1/customers/debts/grouped', { params: { search } }),
    getByCustomer: (id)     => api.get(`/api/v1/customers/${id}/debts`),
    pay:    (debtId, data)  => api.post(`/api/v1/customers/debts/${debtId}/pay`, data),
    extend: (debtId, newDueDate, notes) => api.patch(
        `/api/v1/customers/debts/${debtId}/extend`,
        null,
        { params: { newDueDate, notes } }
    ),
}

export const supplierDebtsApi = {
    getAll:        (params) => api.get('/api/suppliers/debts', { params }),
    getStats:      ()       => api.get('/api/suppliers/debts/stats'),
    getGrouped:    (search) => api.get('/api/suppliers/debts/grouped', { params: { search } }),
    getBySupplier: (id)     => api.get(`/api/suppliers/${id}/debts`),
    pay:           (data)   => api.post('/api/supplier-payments/pay-debt', data),
    setDueDate:    (debtId, dueDate, notes) => api.patch(
        `/api/suppliers/debts/${debtId}/set-due-date`,
        null,
        { params: { dueDate, notes } }
    ),
}

export const installmentApi = {
    getByDebt:   (debtId)               => api.get(`/api/v1/customers/debts/${debtId}/installments`),
    generate:    (debtId, months, startDate) => api.post(
        `/api/v1/customers/debts/${debtId}/installments/generate`,
        null, { params: { months, startDate } }
    ),
    saveCustom:  (debtId, items)        => api.post(`/api/v1/customers/debts/${debtId}/installments/custom`, items),
    pay:         (debtId, instId, amount, notes) => api.post(
        `/api/v1/customers/debts/${debtId}/installments/${instId}/pay`,
        null, { params: { amount, notes } }
    ),
    delete:      (debtId)               => api.delete(`/api/v1/customers/debts/${debtId}/installments`),
}

export const agingApi = {
    getCustomers: () => api.get('/api/v1/aging/customers'),
    getSuppliers: () => api.get('/api/v1/aging/suppliers'),
}