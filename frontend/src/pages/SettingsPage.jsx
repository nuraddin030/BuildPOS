import { useState, useEffect } from 'react'
import { Settings, Send, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import api from '../api/api'
import '../styles/SettingsPage.css'

export default function SettingsPage() {
    const [subs,    setSubs]    = useState([])
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState('')
    const [form,    setForm]    = useState({ name: '', chatId: '', note: '' })
    const [saving,  setSaving]  = useState(false)
    const [toast,   setToast]   = useState('')

    useEffect(() => {
        let alive = true
        api.get('/api/v1/settings/telegram')
            .then(r => { if (alive) { setSubs(r.data); setError(''); setLoading(false) } })
            .catch(() => { if (alive) { setError("Ma'lumot yuklanmadi"); setLoading(false) } })
        return () => { alive = false }
    }, [])

    function showToast(msg) {
        setToast(msg)
        setTimeout(() => setToast(''), 3000)
    }

    function handleAdd(e) {
        e.preventDefault()
        if (!form.name.trim() || !form.chatId.trim()) return
        setSaving(true)
        api.post('/api/v1/settings/telegram', form)
            .then(r => {
                setSubs(prev => [r.data, ...prev])
                setForm({ name: '', chatId: '', note: '' })
                showToast('Qo\'shildi!')
            })
            .catch(err => {
                const msg = err.response?.data?.message || err.response?.data || 'Xatolik'
                setError(typeof msg === 'string' ? msg : 'Xatolik')
            })
            .finally(() => setSaving(false))
    }

    function handleToggle(id) {
        api.patch(`/api/v1/settings/telegram/${id}/toggle`)
            .then(r => setSubs(prev => prev.map(s => s.id === id ? r.data : s)))
            .catch(() => showToast('Xatolik'))
    }

    function handleDelete(id) {
        if (!window.confirm('Rostdan ham o\'chirasizmi?')) return
        api.delete(`/api/v1/settings/telegram/${id}`)
            .then(() => setSubs(prev => prev.filter(s => s.id !== id)))
            .catch(() => showToast('O\'chirib bo\'lmadi'))
    }

    function handleTestSend() {
        api.post('/api/v1/reports/debt-reminder/send')
            .then(() => showToast('Test xabar yuborildi!'))
            .catch(() => showToast('Yuborishda xatolik'))
    }

    return (
        <div className="st-wrapper">
            {toast && (
                <div className="st-toast">
                    <CheckCircle size={15} />
                    {toast}
                </div>
            )}

            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                        <Settings size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">Sozlamalar</h1>
                        <p className="page-subtitle">Telegram xabarnoma obunachilari</p>
                    </div>
                </div>
                <button className="btn-outline-primary" onClick={handleTestSend}>
                    <Send size={15} />
                    Test xabar yuborish
                </button>
            </div>

            {/* Bot qo'llanma */}
            <div className="st-info-card">
                <div className="st-info-title">Telegram ID ni qanday olish mumkin?</div>
                <ol className="st-info-steps">
                    <li>Telegramda <strong>@primestroy_pos_bot</strong> botini toping</li>
                    <li><strong>/start</strong> yozing — bot sizning Chat ID ni xabar qiladi</li>
                    <li>O'sha ID ni quyidagi formaga kiriting</li>
                </ol>
            </div>

            {/* Qo'shish formasi */}
            <div className="st-card">
                <div className="st-card-header">
                    <Plus size={15} />
                    <h6>Yangi obunachi qo'shish</h6>
                </div>
                <form className="st-form" onSubmit={handleAdd}>
                    <div className="st-form-row">
                        <div className="st-field">
                            <label className="st-label">Ism *</label>
                            <input className="st-input" placeholder="Masalan: Direktor"
                                value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
                        </div>
                        <div className="st-field">
                            <label className="st-label">Telegram Chat ID *</label>
                            <input className="st-input" placeholder="Masalan: 397133111"
                                value={form.chatId} onChange={e => setForm(p => ({ ...p, chatId: e.target.value }))} />
                        </div>
                        <div className="st-field st-field--note">
                            <label className="st-label">Izoh (ixtiyoriy)</label>
                            <input className="st-input" placeholder="Masalan: Bosh hisobchi"
                                value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
                        </div>
                        <button type="submit" className="btn-primary st-add-btn" disabled={saving || !form.name || !form.chatId}>
                            {saving ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
                            Qo'shish
                        </button>
                    </div>
                    {error && (
                        <div className="st-form-error">
                            <AlertTriangle size={14} /> {error}
                        </div>
                    )}
                </form>
            </div>

            {/* Ro'yxat */}
            <div className="st-card">
                <div className="st-card-header">
                    <Send size={15} />
                    <h6>Obunachilар ro'yxati</h6>
                    <span className="st-badge">{subs.filter(s => s.isActive).length} aktiv</span>
                </div>

                {loading ? (
                    <div className="table-loading" style={{ minHeight: 120 }}>
                        <Loader2 size={24} className="spin" style={{ color: 'var(--primary)' }} />
                    </div>
                ) : subs.length === 0 ? (
                    <div className="table-empty" style={{ padding: '24px 0' }}>
                        <Send size={32} strokeWidth={1} />
                        <p>Hali obunachi qo'shilmagan</p>
                    </div>
                ) : (
                    <div className="st-sub-list">
                        {subs.map(sub => (
                            <div key={sub.id} className={`st-sub-row${sub.isActive ? '' : ' st-sub-row--off'}`}>
                                <div className="st-sub-info">
                                    <div className="st-sub-name">{sub.name}</div>
                                    <div className="st-sub-meta">
                                        <code className="st-sub-id">{sub.chatId}</code>
                                        {sub.note && <span className="st-sub-note">{sub.note}</span>}
                                    </div>
                                </div>
                                <div className="st-sub-status">
                                    {sub.isActive
                                        ? <span className="badge-active">Aktiv</span>
                                        : <span className="badge-off">Nofaol</span>}
                                </div>
                                <div className="st-sub-actions">
                                    <button className="st-icon-btn" title={sub.isActive ? 'O\'chirish' : 'Yoqish'}
                                        onClick={() => handleToggle(sub.id)}>
                                        {sub.isActive
                                            ? <ToggleRight size={20} style={{ color: '#10b981' }} />
                                            : <ToggleLeft  size={20} style={{ color: 'var(--text-muted)' }} />}
                                    </button>
                                    <button className="st-icon-btn st-icon-btn--del" title="O'chirish"
                                        onClick={() => handleDelete(sub.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}