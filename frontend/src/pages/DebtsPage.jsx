import { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import {
    CreditCard, Search, RotateCcw, Eye, Loader2,
    ChevronLeft, ChevronRight, AlertCircle,
    Clock, X, Banknote, Smartphone, Package,
    Users, Truck, DollarSign, Calendar, ArrowUpRight,
    LayoutList, GitBranch, ChevronDown, ChevronRight as ChevronRightIcon,
    CalendarDays, ListOrdered, Trash2, BarChart2, FileSpreadsheet, Download
} from 'lucide-react'
import { customerDebtsApi, supplierDebtsApi, installmentApi, agingApi } from '../api/debts'
import { salesApi } from '../api/sales'
import { useAuth } from '../context/AuthContext'
import { exportToCSV, exportToPDF, fmtNum } from '../utils/exportUtils'
import '../styles/ProductsPage.css'
import '../styles/DebtsPage.css'

// ── Yordamchi funksiyalar ────────────────────────────────────────
const fmt = (num) =>
    num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const fmtDate = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('ru-RU')
}

const fmtDateTime = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

// ── Status config ────────────────────────────────────────────────
const getDebtStatus = (debt) => {
    if (debt.isPaid) return { label: "To'langan", color: '#16a34a', bg: 'rgba(22,163,74,0.1)' }
    const isOverdue = debt.dueDate && new Date(debt.dueDate) < new Date() && !debt.isPaid
    if (isOverdue) return { label: "Muddati o'tgan", color: '#dc2626', bg: 'rgba(220,38,38,0.1)' }
    return { label: 'Ochiq', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
}

// ── To'lov modal ─────────────────────────────────────────────────
function PayDebtModal({ debt, onClose, onDone }) {
    const [amount, setAmount]   = useState('')
    const [method, setMethod]   = useState('CASH')
    const [notes, setNotes]     = useState('')
    const [saving, setSaving]   = useState(false)
    const [error, setError]     = useState('')

    const remaining = Number(debt.remainingAmount || 0)

    const fmtInput = (val) => {
        const num = String(val).replace(/[^\d]/g, '')
        return num ? num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''
    }
    const parseAmt = (val) => val.replace(/\s/g, '')

    const handleSubmit = async () => {
        const amt = Number(parseAmt(amount))
        if (!amt || amt <= 0) { setError("To'lov summasi kiritilmagan"); return }
        if (amt > remaining)  { setError(`Qolgan qarz: ${fmt(remaining)} UZS. Ortiq kiritib bo'lmaydi`); return }
        setSaving(true); setError('')
        try {
            await customerDebtsApi.pay(debt.id, { amount: amt, paymentMethod: method, notes })
            onDone()
        } catch (e) {
            setError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSaving(false)
        }
    }

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [onClose])

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#16a34a'
                        }}>
                            <Banknote size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">Nasiya to'lash</h3>
                            <p className="modal-subtitle">{debt.customerName}</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {/* Qarz ma'lumoti */}
                    <div className="debt-info-box">
                        <div className="debt-info-row">
                            <span>Dastlabki qarz</span>
                            <span className="debt-info-value">{fmt(debt.amount)} UZS</span>
                        </div>
                        <div className="debt-info-row">
                            <span>To'langan</span>
                            <span className="debt-info-value" style={{ color: '#16a34a' }}>
                                {fmt(debt.paidAmount)} UZS
                            </span>
                        </div>
                        <div className="debt-info-row debt-info-main">
                            <span>Qolgan qarz</span>
                            <span className="debt-info-value" style={{ color: '#dc2626', fontSize: 17 }}>
                                {fmt(remaining)} UZS
                            </span>
                        </div>
                        {debt.dueDate && (
                            <div className="debt-info-row">
                                <span>Muddat</span>
                                <span className="debt-info-value">{fmtDate(debt.dueDate)}</span>
                            </div>
                        )}
                    </div>

                    {/* Summa */}
                    <div>
                        <label className="form-label-sm">To'lov summasi (UZS)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                className="modal-input"
                                style={{ flex: 1, fontSize: 16 }}
                                placeholder="0"
                                value={fmtInput(amount)}
                                onChange={e => setAmount(parseAmt(e.target.value))}
                                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                autoFocus
                            />
                            <button className="btn-outline" onClick={() => setAmount(String(remaining))}
                                    style={{ whiteSpace: 'nowrap' }}>
                                Hammasi
                            </button>
                        </div>
                    </div>

                    {/* To'lov usuli */}
                    <div>
                        <label className="form-label-sm">To'lov usuli</label>
                        <div className="pay-method-group">
                            {[
                                { val: 'CASH',     label: 'Naqd',     icon: Banknote   },
                                { val: 'CARD',     label: 'Karta',    icon: CreditCard },
                                { val: 'TRANSFER', label: "O'tkazma", icon: Smartphone },
                            ].map(m => (
                                <button key={m.val}
                                        className={`pay-method-btn${method === m.val ? ' active' : ''}`}
                                        onClick={() => setMethod(m.val)}>
                                    <m.icon size={15} /> {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Izoh */}
                    <div>
                        <label className="form-label-sm">Izoh (ixtiyoriy)</label>
                        <input className="form-input-sm" style={{ width: '100%' }}
                               placeholder="Izoh..."
                               value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 14px', background: 'var(--danger-bg)',
                            borderRadius: 8, fontSize: 13, color: 'var(--danger)'
                        }}>⚠ {error}</div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Bekor</button>
                    <button className="btn-save" onClick={handleSubmit}
                            disabled={saving || !amount}>
                        {saving ? <><Loader2 size={15} className="spin" /> Saqlanmoqda...</> : "To'lashni tasdiqlash"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ── PayAllDebtsModal ─────────────────────────────────────────────
function PayAllDebtsModal({ group, onClose, onDone }) {
    const [amount, setAmount]   = useState('')
    const [method, setMethod]   = useState('CASH')
    const [notes, setNotes]     = useState('')
    const [saving, setSaving]   = useState(false)
    const [error, setError]     = useState('')
    const [preview, setPreview] = useState([])

    const openDebts = (group.debts || [])
        .filter(d => !d.isPaid)
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) // FIFO — eng eskidan

    const totalRemaining = openDebts.reduce((s, d) => s + Number(d.remainingAmount || 0), 0)

    const fmtInput = (val) => {
        const num = String(val).replace(/[^\d]/g, '')
        return num ? num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''
    }
    const parseAmt = (val) => Number(String(val).replace(/\s/g, ''))

    // FIFO preview — kiritilgan summa bo'yicha taqsimlash
    useEffect(() => {
        const total = parseAmt(amount)
        if (!total || total <= 0) { setPreview([]); return }

        let left = total
        const result = []
        for (const debt of openDebts) {
            if (left <= 0) break
            const remaining = Number(debt.remainingAmount || 0)
            const pay = Math.min(left, remaining)
            result.push({ debt, pay, fullyClosed: pay >= remaining })
            left -= pay
        }
        setPreview(result)
    }, [amount])

    const handleSubmit = async () => {
        const total = parseAmt(amount)
        if (!total || total <= 0) { setError("To'lov summasi kiritilmagan"); return }
        if (total > totalRemaining) { setError(`Jami qoldiq: ${fmt(totalRemaining)} UZS. Ortiq kiritib bo'lmaydi`); return }

        setSaving(true); setError('')
        try {
            let left = total
            for (const debt of openDebts) {
                if (left <= 0) break
                const remaining = Number(debt.remainingAmount || 0)
                const pay = Math.min(left, remaining)
                await customerDebtsApi.pay(debt.id, {
                    amount: pay,
                    paymentMethod: method,
                    notes
                })
                left -= pay
            }
            onDone()
        } catch (e) {
            setError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSaving(false)
        }
    }

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 520 }}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#16a34a'
                        }}>
                            <Banknote size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">Qarz to'lash</h3>
                            <p className="modal-subtitle">{group.entityName} — jami {fmt(totalRemaining)} UZS</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {/* To'lov summasi */}
                    <div>
                        <label className="form-label-sm">To'lov summasi (UZS)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input
                                className="modal-input"
                                style={{ flex: 1, fontSize: 16 }}
                                placeholder="0"
                                value={fmtInput(amount)}
                                onChange={e => setAmount(e.target.value)}
                                autoFocus
                            />
                            <button className="btn-outline"
                                    onClick={() => setAmount(String(totalRemaining))}
                                    style={{ whiteSpace: 'nowrap' }}>
                                Hammasi
                            </button>
                        </div>
                    </div>

                    {/* FIFO preview */}
                    {preview.length > 0 && (
                        <div className="debt-info-box">
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 4 }}>
                                FIFO taqsimlash (eng eskidan)
                            </div>
                            {preview.map(({ debt, pay, fullyClosed }) => (
                                <div key={debt.id} className="debt-info-row">
                                    <div>
                                        <span className="cell-barcode">{debt.saleReferenceNo || `Qarz #${debt.id}`}</span>
                                        {fullyClosed && (
                                            <span style={{
                                                marginLeft: 6, fontSize: 10, fontWeight: 700,
                                                color: '#16a34a', background: 'rgba(22,163,74,0.1)',
                                                padding: '1px 6px', borderRadius: 8
                                            }}>✓ Yopiladi</span>
                                        )}
                                    </div>
                                    <span className="debt-info-value" style={{ color: '#16a34a' }}>
                                        {fmt(pay)} UZS
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* To'lov usuli */}
                    <div>
                        <label className="form-label-sm">To'lov usuli</label>
                        <div className="pay-method-group">
                            {[
                                { val: 'CASH',     label: 'Naqd',     icon: Banknote   },
                                { val: 'CARD',     label: 'Karta',    icon: CreditCard },
                                { val: 'TRANSFER', label: "O'tkazma", icon: Smartphone },
                            ].map(m => (
                                <button key={m.val}
                                        className={`pay-method-btn${method === m.val ? ' active' : ''}`}
                                        onClick={() => setMethod(m.val)}>
                                    <m.icon size={15} /> {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="form-label-sm">Izoh (ixtiyoriy)</label>
                        <input className="form-input-sm" style={{ width: '100%' }}
                               placeholder="Izoh..." value={notes}
                               onChange={e => setNotes(e.target.value)} />
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 14px', background: 'var(--danger-bg)',
                            borderRadius: 8, fontSize: 13, color: 'var(--danger)'
                        }}>⚠ {error}</div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Bekor</button>
                    <button className="btn-save" onClick={handleSubmit}
                            disabled={saving || !amount}>
                        {saving
                            ? <><Loader2 size={15} className="spin" /> To'lanmoqda...</>
                            : `${fmtInput(amount) || '0'} UZS to'lash`
                        }
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ── ExtendDebtModal ──────────────────────────────────────────────
function ExtendDebtModal({ debt, onClose, onDone }) {
    const today = new Date()
    const defaultDate = debt.dueDate
        ? debt.dueDate
        : new Date(today.setDate(today.getDate() + 30)).toISOString().slice(0, 10)

    const [newDueDate, setNewDueDate] = useState(defaultDate)
    const [notes, setNotes]           = useState('')
    const [saving, setSaving]         = useState(false)
    const [error, setError]           = useState('')

    const handleSubmit = async () => {
        if (!newDueDate) { setError('Yangi muddat kiritilmagan'); return }
        if (newDueDate <= new Date().toISOString().slice(0, 10)) {
            setError("Muddat bugundan katta bo'lishi kerak"); return
        }
        setSaving(true); setError('')
        try {
            await customerDebtsApi.extend(debt.id, newDueDate, notes || undefined)
            onDone()
        } catch (e) {
            setError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSaving(false)
        }
    }

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 440 }}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#2563eb'
                        }}>
                            <Calendar size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">Muddatni uzaytirish</h3>
                            <p className="modal-subtitle">{debt.customerName}</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    {/* Hozirgi holat */}
                    <div className="debt-info-box">
                        <div className="debt-info-row">
                            <span>Qolgan qarz</span>
                            <span className="debt-info-value" style={{ color: '#dc2626' }}>
                                {fmt(debt.remainingAmount)} UZS
                            </span>
                        </div>
                        <div className="debt-info-row">
                            <span>Hozirgi muddat</span>
                            <span className="debt-info-value" style={{
                                color: debt.dueDate && new Date(debt.dueDate) < new Date()
                                    ? '#dc2626' : '#f59e0b'
                            }}>
                                {debt.dueDate
                                    ? new Date(debt.dueDate).toLocaleDateString('ru-RU')
                                    : 'Belgilanmagan'
                                }
                            </span>
                        </div>
                    </div>

                    {/* Tezkor tugmalar */}
                    <div>
                        <label className="form-label-sm">Tezkor tanlash</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {[
                                { label: '+7 kun',   days: 7  },
                                { label: '+14 kun',  days: 14 },
                                { label: '+30 kun',  days: 30 },
                                { label: '+60 kun',  days: 60 },
                                { label: '+90 kun',  days: 90 },
                            ].map(opt => {
                                const d = new Date()
                                d.setDate(d.getDate() + opt.days)
                                const val = d.toISOString().slice(0, 10)
                                return (
                                    <button key={opt.days}
                                            className={`btn-outline${newDueDate === val ? ' active' : ''}`}
                                            style={{ padding: '4px 12px', height: 32, fontSize: 12 }}
                                            onClick={() => setNewDueDate(val)}>
                                        {opt.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Aniq sana */}
                    <div>
                        <label className="form-label-sm">Yangi muddat</label>
                        <input
                            type="date"
                            className="form-input-sm"
                            style={{ width: '100%' }}
                            value={newDueDate}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={e => setNewDueDate(e.target.value)}
                        />
                    </div>

                    {/* Sabab */}
                    <div>
                        <label className="form-label-sm">Sabab (ixtiyoriy)</label>
                        <input className="form-input-sm" style={{ width: '100%' }}
                               placeholder="Nima uchun uzaytirilmoqda..."
                               value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 14px', background: 'var(--danger-bg)',
                            borderRadius: 8, fontSize: 13, color: 'var(--danger)'
                        }}>⚠ {error}</div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Bekor</button>
                    <button className="btn-save" onClick={handleSubmit} disabled={saving}>
                        {saving
                            ? <><Loader2 size={15} className="spin" /> Saqlanmoqda...</>
                            : 'Muddatni yangilash'
                        }
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ── PaySupplierDebtModal ─────────────────────────────────────────
function PaySupplierDebtModal({ debt, onClose, onDone }) {
    const [amount, setAmount] = useState('')
    const [method, setMethod] = useState('CASH')
    const [notes, setNotes]   = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError]   = useState('')

    const remaining = Number(debt.remainingAmount || 0)

    const fmtInput = (val) => {
        const num = String(val).replace(/[^\d]/g, '')
        return num ? num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''
    }
    const parseAmt = (val) => Number(String(val).replace(/\s/g, ''))

    const handleSubmit = async () => {
        const amt = parseAmt(amount)
        if (!amt || amt <= 0) { setError("To'lov summasi kiritilmagan"); return }
        if (amt > remaining)  { setError(`Qolgan qarz: ${fmt(remaining)} UZS. Ortiq kiritib bo'lmaydi`); return }
        setSaving(true); setError('')
        try {
            await supplierDebtsApi.pay({
                supplier: { id: debt.supplierId },
                amount: amt,
                paymentMethod: method,
                notes,
            })
            // SupplierDebt paidAmount ni yangilash (purchase payment orqali emas, to'g'ridan)
            onDone()
        } catch (e) {
            setError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSaving(false)
        }
    }

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#7c3aed'
                        }}>
                            <Banknote size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">Yetkazuvchi qarzini to'lash</h3>
                            <p className="modal-subtitle">{debt.supplierName}</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    <div className="debt-info-box">
                        <div className="debt-info-row">
                            <span>Xarid</span>
                            <span className="cell-barcode">{debt.purchaseReferenceNo || '—'}</span>
                        </div>
                        <div className="debt-info-row">
                            <span>Dastlabki qarz</span>
                            <span className="debt-info-value">{fmt(debt.amount)} UZS</span>
                        </div>
                        <div className="debt-info-row">
                            <span>To'langan</span>
                            <span className="debt-info-value" style={{ color: '#16a34a' }}>
                                {fmt(debt.paidAmount)} UZS
                            </span>
                        </div>
                        <div className="debt-info-row debt-info-main">
                            <span>Qolgan qarz</span>
                            <span className="debt-info-value" style={{ color: '#dc2626', fontSize: 17 }}>
                                {fmt(remaining)} UZS
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="form-label-sm">To'lov summasi (UZS)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input className="modal-input" style={{ flex: 1, fontSize: 16 }}
                                   placeholder="0"
                                   value={fmtInput(amount)}
                                   onChange={e => setAmount(e.target.value)}
                                   onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                                   autoFocus />
                            <button className="btn-outline"
                                    onClick={() => setAmount(String(remaining))}
                                    style={{ whiteSpace: 'nowrap' }}>
                                Hammasi
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="form-label-sm">To'lov usuli</label>
                        <div className="pay-method-group">
                            {[
                                { val: 'CASH',     label: 'Naqd',     icon: Banknote   },
                                { val: 'CARD',     label: 'Karta',    icon: CreditCard },
                                { val: 'TRANSFER', label: "O'tkazma", icon: Smartphone },
                            ].map(m => (
                                <button key={m.val}
                                        className={`pay-method-btn${method === m.val ? ' active' : ''}`}
                                        onClick={() => setMethod(m.val)}>
                                    <m.icon size={15} /> {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="form-label-sm">Izoh (ixtiyoriy)</label>
                        <input className="form-input-sm" style={{ width: '100%' }}
                               placeholder="Izoh..." value={notes}
                               onChange={e => setNotes(e.target.value)} />
                    </div>

                    {error && (
                        <div style={{
                            padding: '10px 14px', background: 'var(--danger-bg)',
                            borderRadius: 8, fontSize: 13, color: 'var(--danger)'
                        }}>⚠ {error}</div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Bekor</button>
                    <button className="btn-save" style={{ background: '#7c3aed' }}
                            onClick={handleSubmit} disabled={saving || !amount}>
                        {saving ? <><Loader2 size={15} className="spin" /> To'lanmoqda...</> : "To'lashni tasdiqlash"}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ── DebtDetailModal ──────────────────────────────────────────────
function DebtDetailModal({ debt, type, onClose, onPay, onPaySupplier, onExtend }) {
    const navigate = useNavigate()
    const status = getDebtStatus(debt)
    const canPay = !debt.isPaid && type === 'customer'
    const canPaySupplier = !debt.isPaid && type === 'supplier'

    const [activeTab, setActiveTab] = useState('info') // 'info' | 'items' | 'installments'

    const [saleItems, setSaleItems]       = useState(null)
    const [itemsLoading, setItemsLoading] = useState(false)

    // Installment state
    const [installments, setInstallments]   = useState(null)
    const [instLoading, setInstLoading]     = useState(false)
    const [showInstForm, setShowInstForm]   = useState(false)
    const [instMode, setInstMode]           = useState('auto') // 'auto' | 'manual'
    const [instMonths, setInstMonths]           = useState(3)
    const [instMonthsInput, setInstMonthsInput] = useState('3')
    const [instStartDate, setInstStartDate] = useState(
        new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
    )
    const [instItems, setInstItems]         = useState([])
    const [instSaving, setInstSaving]       = useState(false)
    const [payingInstId, setPayingInstId]   = useState(null)
    const [instPayAmount, setInstPayAmount] = useState('')

    useEffect(() => {
        if (type === 'customer' && debt.saleId) {
            setItemsLoading(true)
            salesApi.getById(debt.saleId)
                .then(res => setSaleItems(res.data.items || []))
                .catch(() => setSaleItems([]))
                .finally(() => setItemsLoading(false))
        }
    }, [debt.saleId, type])

    const loadInstallments = () => {
        if (type !== 'customer') return
        setInstLoading(true)
        installmentApi.getByDebt(debt.id)
            .then(res => setInstallments(res.data || []))
            .catch(() => setInstallments([]))
            .finally(() => setInstLoading(false))
    }

    useEffect(() => {
        if (activeTab === 'installments') loadInstallments()
    }, [activeTab])

    // Auto preview
    const autoPreview = () => {
        if (instMonths < 1) return []
        const remaining = Number(debt.remainingAmount || 0)
        const per = Math.floor(remaining / instMonths)
        const last = remaining - per * (instMonths - 1)
        const result = []
        for (let i = 0; i < instMonths; i++) {
            const d = new Date(instStartDate)
            d.setMonth(d.getMonth() + i)
            result.push({
                num: i + 1,
                dueDate: d.toISOString().slice(0, 10),
                amount: i === instMonths - 1 ? last : per
            })
        }
        return result
    }

    const handleGenerate = async () => {
        setInstSaving(true)
        try {
            await installmentApi.generate(debt.id, instMonths, instStartDate)
            setShowInstForm(false)
            loadInstallments()
        } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        } finally { setInstSaving(false) }
    }

    const handleSaveCustom = async () => {
        if (instItems.some(i => !i.dueDate || !i.amount)) {
            alert('Barcha qatorlarda sana va summa to\'ldirilishi kerak'); return
        }
        setInstSaving(true)
        try {
            await installmentApi.saveCustom(debt.id, instItems.map(i => ({
                dueDate: i.dueDate,
                amount: Number(i.amount),
                notes: i.notes || null
            })))
            setShowInstForm(false)
            loadInstallments()
        } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        } finally { setInstSaving(false) }
    }

    const handlePayInst = async (inst) => {
        const amt = Number(instPayAmount)
        if (!amt || amt <= 0) return
        try {
            await installmentApi.pay(debt.id, inst.id, amt)
            setPayingInstId(null)
            setInstPayAmount('')
            loadInstallments()
        } catch (e) { alert(e.response?.data?.message || 'Xatolik') }
    }

    const handleDeleteSchedule = async () => {
        if (!confirm('To\'lov jadvalini o\'chirishni tasdiqlaysizmi?')) return
        try {
            await installmentApi.delete(debt.id)
            setInstallments([])
        } catch (e) { alert(e.response?.data?.message || 'Xatolik') }
    }

    const preview = instMode === 'auto' ? autoPreview() : instItems

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 620 }}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg,#fffbeb,#fef3c7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#f59e0b'
                        }}>
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">
                                {type === 'customer' ? debt.customerName : debt.supplierName}
                            </h3>
                            <p className="modal-subtitle">
                                {type === 'customer' ? `Chek: ${debt.saleReferenceNo || '—'}` : `Xarid: ${debt.purchaseReferenceNo || '—'}`}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            color: status.color, background: status.bg
                        }}>{status.label}</span>
                        <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                {/* Tab navigatsiya */}
                <div className="modal-detail-tabs">
                    {[
                        { key: 'info',         label: 'Ma\'lumot',       icon: CreditCard   },
                        ...(type === 'customer' ? [
                            { key: 'items',        label: 'Tovarlar',        icon: Package      },
                            { key: 'installments', label: 'To\'lov jadvali', icon: CalendarDays },
                        ] : [])
                    ].map(tab => (
                        <button key={tab.key}
                                className={`modal-detail-tab${activeTab === tab.key ? ' active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}>
                            <tab.icon size={14} /> {tab.label}
                        </button>
                    ))}
                </div>

                <div className="modal-body">
                    {/* ── Tab: Ma'lumot ── */}
                    {activeTab === 'info' && (
                        <>
                            <div className="debt-info-box">
                                <div className="debt-info-row">
                                    <span>Dastlabki qarz</span>
                                    <span className="debt-info-value">{fmt(debt.amount)} UZS</span>
                                </div>
                                <div className="debt-info-row">
                                    <span>To'langan</span>
                                    <span className="debt-info-value" style={{ color: '#16a34a' }}>
                                        {fmt(debt.paidAmount)} UZS
                                    </span>
                                </div>
                                <div className="debt-info-row debt-info-main">
                                    <span>Qolgan qarz</span>
                                    <span className="debt-info-value" style={{
                                        color: debt.isPaid ? '#16a34a' : '#dc2626', fontSize: 17
                                    }}>
                                        {fmt(debt.remainingAmount)} UZS
                                    </span>
                                </div>
                                {debt.dueDate && (
                                    <div className="debt-info-row">
                                        <span>Muddat</span>
                                        <span className="debt-info-value" style={{ color: getDebtStatus(debt).color }}>
                                            <Calendar size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                            {fmtDate(debt.dueDate)}
                                        </span>
                                    </div>
                                )}
                                <div className="debt-info-row">
                                    <span>Yaratilgan</span>
                                    <span className="debt-info-value">{fmtDateTime(debt.createdAt)}</span>
                                </div>
                                {debt.notes && (
                                    <div className="debt-info-row">
                                        <span>Izoh</span>
                                        <span className="debt-info-value" style={{ color: 'var(--text-secondary)' }}>
                                            {debt.notes}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {type === 'customer' && debt.payments?.length > 0 && (
                                <div className="sale-section">
                                    <div className="sale-section-title">
                                        <Banknote size={14} /> To'lov tarixi ({debt.payments.length} ta)
                                    </div>
                                    <table className="ptable" style={{ fontSize: 13 }}>
                                        <thead><tr>
                                            <th>Sana</th>
                                            <th className="th-right">Summa</th>
                                            <th>Usul</th>
                                            <th>Kim</th>
                                        </tr></thead>
                                        <tbody>
                                        {debt.payments.map(p => (
                                            <tr key={p.id}>
                                                <td><span className="cell-muted">{fmtDateTime(p.paidAt)}</span></td>
                                                <td className="th-right" style={{ fontWeight: 700, color: '#16a34a' }}>
                                                    {fmt(p.amount)} UZS
                                                </td>
                                                <td><span className="cell-muted">{p.paymentMethod || '—'}</span></td>
                                                <td><span className="cell-muted">{p.paidBy || '—'}</span></td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── Tab: Tovarlar ── */}
                    {activeTab === 'items' && (
                        <div className="sale-section" style={{ marginTop: 0 }}>
                            {itemsLoading ? (
                                <div style={{ padding: 24, textAlign: 'center' }}>
                                    <Loader2 size={24} className="spin" />
                                </div>
                            ) : saleItems?.length > 0 ? (
                                <table className="ptable" style={{ fontSize: 13 }}>
                                    <thead><tr>
                                        <th>Mahsulot</th>
                                        <th className="th-center">Miqdor</th>
                                        <th className="th-right">Narx</th>
                                        <th className="th-right">Jami</th>
                                    </tr></thead>
                                    <tbody>
                                    {saleItems.map(item => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="cell-name">{item.productName}</div>
                                                <div className="cell-muted" style={{ fontSize: 11 }}>{item.warehouseName}</div>
                                            </td>
                                            <td className="th-center">
                                                {item.quantity}<span className="cell-muted"> {item.unitSymbol}</span>
                                            </td>
                                            <td className="th-right">{fmt(item.salePrice)} UZS</td>
                                            <td className="th-right" style={{ fontWeight: 700 }}>{fmt(item.totalPrice)} UZS</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    Tovarlar topilmadi
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Tab: To'lov jadvali ── */}
                    {activeTab === 'installments' && (
                        <div>
                            {instLoading ? (
                                <div style={{ padding: 24, textAlign: 'center' }}><Loader2 size={24} className="spin" /></div>
                            ) : installments?.length > 0 && !showInstForm ? (
                                <>
                                    {/* Mavjud jadval */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                                            {installments.filter(i => i.isPaid).length} / {installments.length} ta to'langan
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            {canPay && (
                                                <button className="btn-outline" style={{ fontSize: 12, padding: '4px 10px' }}
                                                        onClick={() => { setShowInstForm(true); setInstMode('auto') }}>
                                                    Qayta yaratish
                                                </button>
                                            )}
                                            {canPay && (
                                                <button className="btn-outline" style={{ fontSize: 12, padding: '4px 10px', color: '#dc2626', borderColor: '#dc2626' }}
                                                        onClick={handleDeleteSchedule}>
                                                    <Trash2 size={12} /> O'chirish
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <table className="ptable" style={{ fontSize: 13 }}>
                                        <thead><tr>
                                            <th className="th-num">#</th>
                                            <th className="th-center">Muddat</th>
                                            <th className="th-right">Summa</th>
                                            <th className="th-right">To'langan</th>
                                            <th className="th-center">Holat</th>
                                            {canPay && <th className="th-center">Amal</th>}
                                        </tr></thead>
                                        <tbody>
                                        {installments.map(inst => {
                                            const isOver = inst.isOverdue
                                            return (
                                                <tr key={inst.id} style={{ background: isOver ? 'rgba(220,38,38,0.03)' : '' }}>
                                                    <td className="cell-num">{inst.installmentNumber}</td>
                                                    <td className="th-center">
                                                        <span style={{ fontSize: 12, fontWeight: 600,
                                                            color: isOver ? '#dc2626' : inst.isPaid ? '#16a34a' : '#f59e0b' }}>
                                                            {fmtDate(inst.dueDate)}
                                                        </span>
                                                    </td>
                                                    <td className="th-right" style={{ fontWeight: 600 }}>
                                                        {fmt(inst.amount)} UZS
                                                    </td>
                                                    <td className="th-right" style={{ color: '#16a34a' }}>
                                                        {fmt(inst.paidAmount)} UZS
                                                    </td>
                                                    <td className="th-center">
                                                        <span style={{
                                                            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                                            color: inst.isPaid ? '#16a34a' : isOver ? '#dc2626' : '#f59e0b',
                                                            background: inst.isPaid ? 'rgba(22,163,74,0.1)' : isOver ? 'rgba(220,38,38,0.1)' : 'rgba(245,158,11,0.1)'
                                                        }}>
                                                            {inst.isPaid ? "✓ To'landi" : isOver ? "Muddati o'tgan" : "Kutilmoqda"}
                                                        </span>
                                                    </td>
                                                    {canPay && (
                                                        <td className="th-center" onClick={e => e.stopPropagation()}>
                                                            {!inst.isPaid && (
                                                                payingInstId === inst.id ? (
                                                                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                                        <input className="modal-input"
                                                                               style={{ width: 100, height: 28, fontSize: 12, padding: '0 8px' }}
                                                                               placeholder="Summa" autoFocus
                                                                               value={instPayAmount}
                                                                               onChange={e => setInstPayAmount(e.target.value.replace(/\D/g, ''))}
                                                                               onKeyDown={e => e.key === 'Enter' && handlePayInst(inst)} />
                                                                        <button className="act-btn act-edit"
                                                                                style={{ color: '#16a34a' }}
                                                                                onClick={() => handlePayInst(inst)}>✓</button>
                                                                        <button className="act-btn"
                                                                                onClick={() => { setPayingInstId(null); setInstPayAmount('') }}>✕</button>
                                                                    </div>
                                                                ) : (
                                                                    <button className="act-btn act-pay"
                                                                            onClick={() => { setPayingInstId(inst.id); setInstPayAmount(String(inst.remainingAmount)) }}>
                                                                        <Banknote size={13} />
                                                                    </button>
                                                                )
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            )
                                        })}
                                        </tbody>
                                    </table>
                                </>
                            ) : !showInstForm ? (
                                // Jadval yo'q
                                <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                                    <CalendarDays size={40} strokeWidth={1} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
                                    <p style={{ color: 'var(--text-muted)', marginBottom: 16, fontSize: 14 }}>
                                        To'lov jadvali belgilanmagan
                                    </p>
                                    {canPay && (
                                        <button className="btn-save" onClick={() => { setShowInstForm(true); setInstMode('auto') }}>
                                            <CalendarDays size={15} /> Jadval yaratish
                                        </button>
                                    )}
                                </div>
                            ) : null}

                            {/* Jadval yaratish formasi */}
                            {showInstForm && (
                                <div>
                                    {/* Mode tanlash */}
                                    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                                        <button type="button"
                                                onClick={() => setInstMode('auto')}
                                                style={{
                                                    flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                                    border: `2px solid ${instMode === 'auto' ? 'var(--primary)' : 'var(--border-color)'}`,
                                                    background: instMode === 'auto' ? 'var(--primary-light)' : 'var(--surface)',
                                                    color: instMode === 'auto' ? 'var(--primary)' : 'var(--text-secondary)',
                                                    fontWeight: 600, fontSize: 13
                                                }}>
                                            ⚡ Avtomatik taqsimlash
                                        </button>
                                        <button type="button"
                                                onClick={() => {
                                                    setInstMode('manual')
                                                    if (!instItems.length) {
                                                        setInstItems([{ dueDate: instStartDate, amount: '', notes: '' }])
                                                    }
                                                }}
                                                style={{
                                                    flex: 1, padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                                    border: `2px solid ${instMode === 'manual' ? 'var(--primary)' : 'var(--border-color)'}`,
                                                    background: instMode === 'manual' ? 'var(--primary-light)' : 'var(--surface)',
                                                    color: instMode === 'manual' ? 'var(--primary)' : 'var(--text-secondary)',
                                                    fontWeight: 600, fontSize: 13
                                                }}>
                                            ✏️ Qo'lda kiritish
                                        </button>
                                    </div>

                                    {instMode === 'auto' && (
                                        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: 140 }}>
                                                <label className="form-label-sm">Oylar soni</label>
                                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                                                    {[2, 3, 6, 9, 12].map(m => (
                                                        <button key={m} type="button"
                                                                onClick={() => {
                                                                    setInstMonths(m)
                                                                    setInstMonthsInput(String(m))
                                                                }}
                                                                style={{
                                                                    padding: '4px 10px', borderRadius: 6, fontSize: 12,
                                                                    fontWeight: 600, cursor: 'pointer',
                                                                    border: `1.5px solid ${instMonths === m ? 'var(--primary)' : 'var(--border-color)'}`,
                                                                    background: instMonths === m ? 'var(--primary-light)' : 'var(--surface)',
                                                                    color: instMonths === m ? 'var(--primary)' : 'var(--text-secondary)'
                                                                }}>
                                                            {m} oy
                                                        </button>
                                                    ))}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 4 }}>
                                                        <button type="button"
                                                                onClick={() => {
                                                                    const n = Math.max(1, instMonths - 1)
                                                                    setInstMonths(n)
                                                                    setInstMonthsInput(String(n))
                                                                }}
                                                                style={{
                                                                    width: 26, height: 26, borderRadius: 6,
                                                                    border: '1.5px solid var(--border-color)',
                                                                    background: 'var(--surface)', cursor: 'pointer',
                                                                    fontSize: 16, fontWeight: 700,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: 'var(--text-secondary)'
                                                                }}>−</button>
                                                        <span style={{
                                                            minWidth: 32, textAlign: 'center',
                                                            fontSize: 13, fontWeight: 700,
                                                            color: 'var(--text-primary)'
                                                        }}>{instMonths}</span>
                                                        <button type="button"
                                                                onClick={() => {
                                                                    const n = Math.min(120, instMonths + 1)
                                                                    setInstMonths(n)
                                                                    setInstMonthsInput(String(n))
                                                                }}
                                                                style={{
                                                                    width: 26, height: 26, borderRadius: 6,
                                                                    border: '1.5px solid var(--border-color)',
                                                                    background: 'var(--surface)', cursor: 'pointer',
                                                                    fontSize: 16, fontWeight: 700,
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    color: 'var(--text-secondary)'
                                                                }}>+</button>
                                                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>oy</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 160 }}>
                                                <label className="form-label-sm">Birinchi to'lov sanasi</label>
                                                <input type="date" className="modal-input"
                                                       style={{ width: '100%' }}
                                                       value={instStartDate}
                                                       onChange={e => setInstStartDate(e.target.value)} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Preview / Manual jadval */}
                                    <div className="debt-info-box" style={{ marginBottom: 12 }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
                                            textTransform: 'uppercase', marginBottom: 8 }}>
                                            {instMode === 'auto' ? 'Ko\'rib chiqish' : 'To\'lov jadvali'}
                                        </div>
                                        {(instMode === 'auto' ? preview : instItems).map((item, idx) => (
                                            <div key={idx} className="debt-info-row" style={{ alignItems: 'center' }}>
                                                <span style={{ minWidth: 24, color: 'var(--text-muted)', fontSize: 12 }}>
                                                    {idx + 1}.
                                                </span>
                                                {instMode === 'manual' ? (
                                                    <>
                                                        <input type="date" className="modal-input"
                                                               style={{ flex: 1, height: 28, fontSize: 12 }}
                                                               value={item.dueDate}
                                                               onChange={e => {
                                                                   const arr = [...instItems]
                                                                   arr[idx].dueDate = e.target.value
                                                                   setInstItems(arr)
                                                               }} />
                                                        <input className="modal-input"
                                                               style={{ flex: 1, height: 28, fontSize: 12 }}
                                                               placeholder="Summa"
                                                               value={item.amount}
                                                               onChange={e => {
                                                                   const arr = [...instItems]
                                                                   arr[idx].amount = e.target.value.replace(/\D/g, '')
                                                                   setInstItems(arr)
                                                               }} />
                                                        <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}
                                                                onClick={() => setInstItems(instItems.filter((_, i) => i !== idx))}>
                                                            <X size={14} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)' }}>
                                                            {fmtDate(item.dueDate)}
                                                        </span>
                                                        <span className="debt-info-value" style={{ fontSize: 13 }}>
                                                            {fmt(item.amount)} UZS
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                        {instMode === 'manual' && (
                                            <button className="btn-outline"
                                                    style={{ width: '100%', marginTop: 8, fontSize: 12 }}
                                                    onClick={() => setInstItems([...instItems, { dueDate: '', amount: '', notes: '' }])}>
                                                + Qator qo'shish
                                            </button>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button className="btn-cancel" onClick={() => setShowInstForm(false)}>
                                            Bekor
                                        </button>
                                        <button className="btn-save"
                                                disabled={instSaving}
                                                onClick={instMode === 'auto' ? handleGenerate : handleSaveCustom}>
                                            {instSaving
                                                ? <><Loader2 size={14} className="spin" /> Saqlanmoqda...</>
                                                : <><CalendarDays size={14} /> Saqlash</>
                                            }
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        {canPay && (
                            <button className="btn-save" onClick={() => onPay(debt)}>
                                <Banknote size={15} /> To'lash
                            </button>
                        )}
                        {canPay && (
                            <button className="btn-outline" onClick={() => onExtend(debt)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Calendar size={15} /> Muddatni uzaytirish
                            </button>
                        )}
                        {canPaySupplier && (
                            <button className="btn-save" style={{ background: '#7c3aed' }}
                                    onClick={() => onPaySupplier(debt)}>
                                <Banknote size={15} /> To'lash
                            </button>
                        )}
                        {type === 'supplier' && debt.purchaseId && (
                            <button className="btn-outline" onClick={() => {
                                onClose()
                                navigate(`/purchases/${debt.purchaseId}`)
                            }}>
                                <ArrowUpRight size={15} /> Xaridni ko'rish
                            </button>
                        )}
                    </div>
                    <button className="btn-cancel" onClick={onClose}>Yopish</button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ════════════════════════════════════════════════════════════════
// NasiyalarPage — asosiy komponent
// ════════════════════════════════════════════════════════════════
export default function DebtsPage() {
    const { hasPermission } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    // URL dan customerId o'qish (CustomersPage dan o'tganda)
    const urlCustomerId = new URLSearchParams(location.search).get('customerId')

    // ── Tab ──────────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('customer') // 'customer' | 'supplier'

    // ── View mode ────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState('tree') // 'tree' | 'table' | 'aging'

    // ── Aging state ──────────────────────────────────────────────
    const [cAging, setCAging]           = useState(null)
    const [sAging, setSAging]           = useState(null)
    const [agingLoading, setAgingLoading] = useState(false)

    // ── Grouped (tree) data ──────────────────────────────────────
    const [cGrouped, setCGrouped]     = useState([])
    const [sGrouped, setSGrouped]     = useState([])
    const [cTreeLoading, setCTreeLoading] = useState(false)
    const [sTreeLoading, setSTreeLoading] = useState(false)
    const [expandedIds, setExpandedIds]   = useState(new Set())

    // ── Customer debts state ─────────────────────────────────────
    const [cDebts, setCDebts]         = useState([])
    const [cTotal, setCTotal]         = useState(0)
    const [cPage, setCPage]           = useState(0)
    const [cLoading, setCLoading]     = useState(false)
    const [cStats, setCStats]         = useState(null)

    // ── Supplier debts state ─────────────────────────────────────
    const [sDebts, setSDebts]         = useState([])
    const [sTotal, setSTotal]         = useState(0)
    const [sPage, setSPage]           = useState(0)
    const [sLoading, setSLoading]     = useState(false)
    const [sStats, setSStats]         = useState(null)

    // ── Umumiy filter state ──────────────────────────────────────
    const [search, setSearch]         = useState('')
    const [filterStatus, setFilterStatus] = useState('') // '' | 'open' | 'paid' | 'overdue'
    const [size]                      = useState(20)

    // URL dan customerId kelsa — customer tab + tree da o'sha mijozni ajratib ko'rsatish
    const highlightCustomerId = urlCustomerId ? Number(urlCustomerId) : null

    useEffect(() => {
        if (urlCustomerId) {
            setActiveTab('customer')
            setViewMode('tree')
        }
    }, [urlCustomerId])

    // highlightCustomerId o'zgarganda grouped ni qayta yukla
    useEffect(() => {
        if (highlightCustomerId) {
            loadCustomerGrouped()
        }
    }, [highlightCustomerId])

    // ── Modallar ─────────────────────────────────────────────────
    const [selectedDebt, setSelectedDebt]       = useState(null)
    const [payDebt, setPayDebt]                 = useState(null)
    const [payAllGroup, setPayAllGroup]         = useState(null)
    const [paySupplierDebt, setPaySupplierDebt] = useState(null)
    const [extendDebt, setExtendDebt]           = useState(null)

    // ── Toast ────────────────────────────────────────────────────
    const [toast, setToast] = useState(null)
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    // ── Export ───────────────────────────────────────────────────
    const [exportLoading, setExportLoading] = useState(false)

    const handleExport = async (format) => {
        setExportLoading(true)
        try {
            const isCustomer = activeTab === 'customer'

            if (viewMode === 'aging') {
                const aging = isCustomer ? cAging : sAging
                if (!aging?.items?.length) return

                const headers = [isCustomer ? 'Mijoz' : 'Yetkazuvchi', 'Telefon', 'Qoldiq (UZS)', 'Kun', 'Guruh']
                const data = aging.items.map(item => [
                    item.entityName,
                    item.entityPhone || '',
                    fmtNum(item.remainingAmount),
                    item.daysOverdue + ' kun',
                    item.bucket + ' kun'
                ])
                const filename = isCustomer ? 'aging_mijozlar' : 'aging_yetkazuvchilar'
                const title = isCustomer ? 'Mijozlar qarzi — Aging hisobot' : 'Yetkazuvchilar qarzi — Aging hisobot'
                const buckets = [aging.bucket0_30, aging.bucket31_60, aging.bucket61_90, aging.bucket90plus]
                const totalAmount = buckets.reduce((s, b) => s + Number(b.totalAmount || 0), 0)

                if (format === 'pdf') {
                    await exportToPDF({
                        filename, title, headers, rows: data,
                        summary: [
                            { label: 'Jami qoldiq', value: fmtNum(totalAmount) + ' UZS' },
                            { label: '0-30 kun', value: fmtNum(aging.bucket0_30.totalAmount) + ' UZS' },
                            { label: '31-60 kun', value: fmtNum(aging.bucket31_60.totalAmount) + ' UZS' },
                            { label: '90+ kun', value: fmtNum(aging.bucket90plus.totalAmount) + ' UZS' },
                        ]
                    })
                } else {
                    exportToCSV(filename, headers, data)
                }
            } else {
                const params = { page: 0, size: 1000, isPaid: false }
                const res = isCustomer
                    ? await customerDebtsApi.getAll(params)
                    : await supplierDebtsApi.getAll(params)
                const rows = res.data.content || []

                const headers = isCustomer
                    ? ['#', 'Mijoz', 'Telefon', 'Chek', 'Dastlabki qarz', "To'langan", 'Qoldiq', 'Muddat', 'Holat']
                    : ['#', 'Yetkazuvchi', 'Telefon', 'Xarid', 'Dastlabki qarz', "To'langan", 'Qoldiq', 'Muddat', 'Holat']

                const data = rows.map((d, i) => [
                    i + 1,
                    isCustomer ? (d.customerName || '') : (d.supplierName || ''),
                    isCustomer ? (d.customerPhone || '') : (d.supplierPhone || ''),
                    isCustomer ? (d.saleReferenceNo || '') : (d.purchaseReferenceNo || ''),
                    fmtNum(d.amount) + ' UZS',
                    fmtNum(d.paidAmount) + ' UZS',
                    fmtNum(d.remainingAmount) + ' UZS',
                    d.dueDate ? new Date(d.dueDate).toLocaleDateString('ru-RU') : '—',
                    d.isPaid ? "To'langan" : (d.isOverdue ? "Muddati o'tgan" : 'Ochiq')
                ])

                const totalRemaining = rows.reduce((s, d) => s + Number(d.remainingAmount || 0), 0)
                const filename = isCustomer ? 'mijoz_nasiyalar' : 'yetkazuvchi_qarzlar'
                const title = isCustomer ? 'Mijozlar nasiyasi' : 'Yetkazuvchilar qarzi'

                if (format === 'pdf') {
                    await exportToPDF({
                        filename, title, headers, rows: data,
                        summary: [
                            { label: 'Jami qarzlar', value: rows.length + ' ta' },
                            { label: 'Jami qoldiq', value: fmtNum(totalRemaining) + ' UZS' },
                        ]
                    })
                } else {
                    exportToCSV(filename, headers, data)
                }
            }
        } catch (e) {
            showToast('Export xatosi', 'error')
        } finally {
            setExportLoading(false)
        }
    }


    // ── Mijoz qarzlari yuklash ───────────────────────────────────
    const loadCustomerDebts = useCallback(() => {
        setCLoading(true)
        const params = {
            page: cPage,
            size,
            search:    search    || undefined,
            isPaid:    filterStatus === 'paid'    ? true
                : filterStatus === 'open' || filterStatus === 'overdue' ? false
                    : undefined,
            isOverdue: filterStatus === 'overdue' ? true
                : filterStatus === 'open'    ? false
                    : undefined,
        }
        customerDebtsApi.getAll(params)
            .then(res => { setCDebts(res.data.content || []); setCTotal(res.data.totalElements || 0) })
            .catch(console.error)
            .finally(() => setCLoading(false))
    }, [cPage, size, search, filterStatus])

    const loadCustomerStats = useCallback(() => {
        customerDebtsApi.getStats()
            .then(res => setCStats(res.data))
            .catch(console.error)
    }, [])

    // ── Tree data yuklash ────────────────────────────────────────
    const loadCustomerGrouped = useCallback(() => {
        setCTreeLoading(true)
        customerDebtsApi.getGrouped(search || undefined)
            .then(res => {
                setCGrouped(res.data || [])
                // Agar URL dan customerId kelgan bo'lsa — o'sha mijozni ochiq ko'rsat
                if (highlightCustomerId) {
                    setExpandedIds(new Set([`c-${highlightCustomerId}`]))
                } else {
                    setExpandedIds(new Set())
                }
            })
            .catch(console.error)
            .finally(() => setCTreeLoading(false))
    }, [search, highlightCustomerId])

    const loadSupplierGrouped = useCallback(() => {
        setSTreeLoading(true)
        supplierDebtsApi.getGrouped(search || undefined)
            .then(res => {
                setSGrouped(res.data || [])
                setExpandedIds(new Set()) // default yopiq
            })
            .catch(console.error)
            .finally(() => setSTreeLoading(false))
    }, [search])

    // ── Yetkazuvchi qarzlari yuklash ─────────────────────────────
    const loadSupplierDebts = useCallback(() => {
        setSLoading(true)
        const params = {
            page: sPage,
            size,
            search:    search    || undefined,
            isPaid:    filterStatus === 'paid'    ? true
                : filterStatus === 'open' || filterStatus === 'overdue' ? false
                    : undefined,
            isOverdue: filterStatus === 'overdue' ? true
                : filterStatus === 'open'    ? false
                    : undefined,
        }
        supplierDebtsApi.getAll(params)
            .then(res => { setSDebts(res.data.content || []); setSTotal(res.data.totalElements || 0) })
            .catch(console.error)
            .finally(() => setSLoading(false))
    }, [sPage, size, search, filterStatus])

    const loadSupplierStats = useCallback(() => {
        supplierDebtsApi.getStats()
            .then(res => setSStats(res.data))
            .catch(console.error)
    }, [])

    useEffect(() => { loadCustomerDebts() }, [loadCustomerDebts])
    useEffect(() => { loadCustomerStats() }, [loadCustomerStats])
    useEffect(() => { loadSupplierDebts() }, [loadSupplierDebts])
    useEffect(() => { loadSupplierStats() }, [loadSupplierStats])
    useEffect(() => { if (viewMode === 'tree') loadCustomerGrouped() }, [loadCustomerGrouped, viewMode])
    useEffect(() => { if (viewMode === 'tree') loadSupplierGrouped() }, [loadSupplierGrouped, viewMode])

    const loadAging = useCallback(() => {
        setAgingLoading(true)
        Promise.all([agingApi.getCustomers(), agingApi.getSuppliers()])
            .then(([cRes, sRes]) => {
                setCAging(cRes.data)
                setSAging(sRes.data)
            })
            .catch(console.error)
            .finally(() => setAgingLoading(false))
    }, [])

    useEffect(() => { if (viewMode === 'aging') loadAging() }, [loadAging, viewMode])

    // ── Reset ────────────────────────────────────────────────────
    const handleReset = () => {
        setSearch('')
        setFilterStatus('')
        setCPage(0)
        setSPage(0)
    }

    const toggleExpand = (key) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }

    const handlePayAllDone = () => {
        setPayAllGroup(null)
        loadCustomerDebts()
        loadCustomerStats()
        loadCustomerGrouped()
        showToast("Barcha qarzlar to'landi")
    }

    const handleExtendDone = () => {
        setExtendDebt(null)
        setSelectedDebt(null)
        loadCustomerDebts()
        loadCustomerGrouped()
        showToast('Muddat muvaffaqiyatli yangilandi')
    }

    const handlePaySupplierDone = () => {
        setPaySupplierDebt(null)
        setSelectedDebt(null)
        loadSupplierDebts()
        loadSupplierStats()
        loadSupplierGrouped()
        showToast("Yetkazuvchi qarzi to'landi")
    }

    // ── To'lov tugallandi ────────────────────────────────────────
    const handlePayDone = () => {
        setPayDebt(null)
        setSelectedDebt(null)
        loadCustomerDebts()
        loadCustomerStats()
        loadCustomerGrouped()
        showToast("To'lov muvaffaqiyatli amalga oshirildi")
    }

    // ── Keyboard ─────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') {
                setSelectedDebt(null); setPayDebt(null)
                setPayAllGroup(null); setPaySupplierDebt(null); setExtendDebt(null)
            }
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    const cTotalPages = Math.ceil(cTotal / size)
    const sTotalPages = Math.ceil(sTotal / size)

    // ════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════
    return (
        <div className="products-wrapper">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap" style={{ background: 'rgba(245,158,11,0.12)', color: '#f59e0b' }}>
                        <CreditCard size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">Nasiyalar</h1>
                        <p className="page-subtitle">Mijoz va yetkazuvchi qarzlari</p>
                    </div>
                </div>
                {/* View toggle */}
                <div className="nasiya-header-right">
                    <div className="view-toggle-group">
                        <button className={`view-toggle-btn${viewMode === 'tree' ? ' active' : ''}`}
                                onClick={() => setViewMode('tree')} title="Daraxt ko'rinishi">
                            <GitBranch size={16} /> Daraxt
                        </button>
                        <button className={`view-toggle-btn${viewMode === 'table' ? ' active' : ''}`}
                                onClick={() => setViewMode('table')} title="Jadval ko'rinishi">
                            <LayoutList size={16} /> Jadval
                        </button>
                        <button className={`view-toggle-btn${viewMode === 'aging' ? ' active' : ''}`}
                                onClick={() => setViewMode('aging')} title="Aging hisobot">
                            <BarChart2 size={16} /> Aging
                        </button>
                    </div>
                    <button className="btn-reset" disabled={exportLoading}
                            onClick={() => handleExport('csv')}
                            style={{ color: '#16a34a', borderColor: '#16a34a' }}>
                        {exportLoading ? <Loader2 size={14} className="spin" /> : <FileSpreadsheet size={14} />} Excel
                    </button>
                    <button className="btn-reset" disabled={exportLoading}
                            onClick={() => handleExport('pdf')}
                            style={{ color: '#dc2626', borderColor: '#dc2626' }}>
                        <Download size={14} /> PDF
                    </button>
                </div>
            </div>

            {/* ── Statistika kartalari ────────────────────────── */}
            <div className="nasiya-stats-grid">
                {/* Mijoz qarzlari */}
                <div className="nasiya-stat-group">
                    <div className="nasiya-stat-label">
                        <Users size={13} /> Mijozlar nasiyasi
                    </div>
                    <div className="nasiya-stat-cards">
                        <NasiyaStatCard
                            label="Jami qoldiq"
                            value={cStats ? `${fmt(cStats.totalRemaining)} UZS` : '—'}
                            color="#f59e0b"
                            icon={DollarSign}
                        />
                        <NasiyaStatCard
                            label="Ochiq"
                            value={cStats ? `${cStats.openCount} ta` : '—'}
                            color="#2563eb"
                            icon={Clock}
                        />
                        <NasiyaStatCard
                            label="Muddati o'tgan"
                            value={cStats ? `${cStats.overdueCount} ta` : '—'}
                            color="#dc2626"
                            icon={AlertCircle}
                        />
                    </div>
                </div>

                {/* Yetkazuvchi qarzlari */}
                <div className="nasiya-stat-group">
                    <div className="nasiya-stat-label">
                        <Truck size={13} /> Yetkazuvchi qarzi
                    </div>
                    <div className="nasiya-stat-cards">
                        <NasiyaStatCard
                            label="Jami qoldiq"
                            value={sStats ? `${fmt(sStats.totalRemaining)} UZS` : '—'}
                            color="#7c3aed"
                            icon={DollarSign}
                        />
                        <NasiyaStatCard
                            label="Ochiq"
                            value={sStats ? `${sStats.openCount} ta` : '—'}
                            color="#2563eb"
                            icon={Clock}
                        />
                        <NasiyaStatCard
                            label="Muddati o'tgan"
                            value={sStats ? `${sStats.overdueCount} ta` : '—'}
                            color="#dc2626"
                            icon={AlertCircle}
                        />
                    </div>
                </div>
            </div>

            {/* ── Tab tugmalari ───────────────────────────────── */}
            <div className="nasiya-tabs">
                <button
                    className={`nasiya-tab${activeTab === 'customer' ? ' active' : ''}`}
                    onClick={() => setActiveTab('customer')}>
                    <Users size={16} />
                    Mijozlar nasiyasi
                    {cStats?.openCount > 0 && (
                        <span className="tab-badge tab-badge-blue">{cStats.openCount}</span>
                    )}
                    {cStats?.overdueCount > 0 && (
                        <span className="tab-badge tab-badge-red">{cStats.overdueCount}</span>
                    )}
                </button>
                <button
                    className={`nasiya-tab${activeTab === 'supplier' ? ' active' : ''}`}
                    onClick={() => setActiveTab('supplier')}>
                    <Truck size={16} />
                    Yetkazuvchi qarzi
                    {sStats?.openCount > 0 && (
                        <span className="tab-badge tab-badge-blue">{sStats.openCount}</span>
                    )}
                    {sStats?.overdueCount > 0 && (
                        <span className="tab-badge tab-badge-red">{sStats.overdueCount}</span>
                    )}
                </button>
            </div>

            {/* ── Filter ──────────────────────────────────────── */}
            <div className="filter-bar">
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input className="filter-search"
                           placeholder={activeTab === 'customer' ? "Mijoz ismi, telefon..." : "Yetkazuvchi nomi..."}
                           value={search}
                           onChange={e => { setSearch(e.target.value); setCPage(0); setSPage(0) }} />
                </div>

                {/* Status filter tugmalari */}
                <div className="nasiya-status-filters">
                    {[
                        { val: '',        label: 'Hammasi'          },
                        { val: 'open',    label: 'Ochiq'            },
                        { val: 'overdue', label: "Muddati o'tgan"   },
                        { val: 'paid',    label: "To'langan"        },
                    ].map(f => (
                        <button key={f.val}
                                className={`btn-outline${filterStatus === f.val ? ' active' : ''}`}
                                onClick={() => { setFilterStatus(f.val); setCPage(0); setSPage(0) }}>
                            {f.label}
                        </button>
                    ))}
                </div>

                <button className="btn-reset" onClick={handleReset}>
                    <RotateCcw size={14} /> Tozalash
                </button>
            </div>

            {/* ── Ko'rinish ────────────────────────────────────── */}
            {viewMode === 'aging' ? (
                <AgingView
                    cAging={cAging}
                    sAging={sAging}
                    loading={agingLoading}
                    activeTab={activeTab}
                    onNavigate={(url) => {
                        setViewMode('tree')
                        navigate(url)
                    }}
                />
            ) : viewMode === 'tree' ? (
                <DebtTreeView
                    grouped={activeTab === 'customer' ? cGrouped : sGrouped}
                    loading={activeTab === 'customer' ? cTreeLoading : sTreeLoading}
                    type={activeTab}
                    expandedIds={expandedIds}
                    onToggle={toggleExpand}
                    onView={(d) => setSelectedDebt({ ...d, type: activeTab })}
                    onPay={(d) => setPayDebt(d)}
                    onPayAll={(g) => setPayAllGroup(g)}
                    onViewSupplier={(id) => navigate(`/purchases?supplierId=${id}`)}
                    highlightId={activeTab === 'customer' ? highlightCustomerId : null}
                    hasPermission={hasPermission}
                />
            ) : (
                activeTab === 'customer'
                    ? <DebtTable
                        debts={cDebts}
                        loading={cLoading}
                        type="customer"
                        page={cPage}
                        size={size}
                        totalPages={cTotalPages}
                        onPageChange={setCPage}
                        onView={(d) => setSelectedDebt({ ...d, type: 'customer' })}
                        onPay={(d) => setPayDebt(d)}
                        hasPermission={hasPermission}
                    />
                    : <DebtTable
                        debts={sDebts}
                        loading={sLoading}
                        type="supplier"
                        page={sPage}
                        size={size}
                        totalPages={sTotalPages}
                        onPageChange={setSPage}
                        onView={(d) => setSelectedDebt({ ...d, type: 'supplier' })}
                        onPay={null}
                        hasPermission={hasPermission}
                    />
            )}

            {/* ── Modallar ────────────────────────────────────── */}
            {selectedDebt && !payDebt && !paySupplierDebt && !extendDebt && (
                <DebtDetailModal
                    debt={selectedDebt}
                    type={selectedDebt.type}
                    onClose={() => setSelectedDebt(null)}
                    onPay={(d) => { setPayDebt(d); setSelectedDebt(null) }}
                    onPaySupplier={(d) => { setPaySupplierDebt(d); setSelectedDebt(null) }}
                    onExtend={(d) => { setExtendDebt(d); setSelectedDebt(null) }}
                />
            )}

            {extendDebt && (
                <ExtendDebtModal
                    debt={extendDebt}
                    onClose={() => setExtendDebt(null)}
                    onDone={handleExtendDone}
                />
            )}

            {paySupplierDebt && (
                <PaySupplierDebtModal
                    debt={paySupplierDebt}
                    onClose={() => setPaySupplierDebt(null)}
                    onDone={handlePaySupplierDone}
                />
            )}

            {payAllGroup && (
                <PayAllDebtsModal
                    group={payAllGroup}
                    onClose={() => setPayAllGroup(null)}
                    onDone={handlePayAllDone}
                />
            )}

            {payDebt && (
                <PayDebtModal
                    debt={payDebt}
                    onClose={() => setPayDebt(null)}
                    onDone={handlePayDone}
                />
            )}

            {/* ── Toast ───────────────────────────────────────── */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 20, right: 20, zIndex: 99999,
                    background: toast.type === 'error' ? '#ef4444' : '#22c55e',
                    color: '#fff', padding: '12px 20px', borderRadius: 10,
                    boxShadow: '0 4px 16px rgba(0,0,0,0.15)', fontSize: 14,
                    fontWeight: 500, maxWidth: 360, lineHeight: 1.4,
                    animation: 'fadeInRight 0.25s ease'
                }}>
                    {toast.type === 'error' ? '⚠ ' : '✓ '}{toast.msg}
                </div>
            )}
        </div>
    )
}

// ── AgingView komponenti ─────────────────────────────────────────
function AgingView({ cAging, sAging, loading, activeTab, onNavigate }) {
    const aging = activeTab === 'customer' ? cAging : sAging
    const isCustomer = activeTab === 'customer'
    const [activeBucket, setActiveBucket] = useState(null) // null = hammasi

    if (loading) return (
        <div className="table-card">
            <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
        </div>
    )

    if (!aging) return (
        <div className="table-card">
            <div className="table-empty"><BarChart2 size={40} strokeWidth={1} /><p>Ma'lumot yo'q</p></div>
        </div>
    )

    const buckets = [
        aging.bucket0_30,
        aging.bucket31_60,
        aging.bucket61_90,
        aging.bucket90plus,
    ]

    const totalAmount = buckets.reduce((s, b) => s + Number(b.totalAmount || 0), 0)

    const filteredItems = activeBucket
        ? (aging.items || []).filter(i => i.bucket === activeBucket)
        : (aging.items || [])

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Bucket kartalar */}
            <div className="aging-buckets-grid">
                {buckets.map((b, idx) => {
                    const bucketKey = ['0-30', '31-60', '61-90', '90+'][idx]
                    const isActive = activeBucket === bucketKey
                    const pct = totalAmount > 0
                        ? Math.round(Number(b.totalAmount) / totalAmount * 100)
                        : 0
                    return (
                        <div key={idx}
                             onClick={() => setActiveBucket(isActive ? null : bucketKey)}
                             style={{
                                 background: isActive ? b.color + '12' : 'var(--surface)',
                                 border: `1px solid ${isActive ? b.color : b.color + '33'}`,
                                 borderTop: `3px solid ${b.color}`,
                                 borderRadius: 12,
                                 padding: '16px 18px',
                                 boxShadow: isActive ? `0 0 0 2px ${b.color}40` : 'var(--shadow-sm)',
                                 cursor: 'pointer',
                                 transition: 'all 0.15s ease',
                                 userSelect: 'none'
                             }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: b.color }}>
                                    {b.label}
                                </span>
                                {isActive && (
                                    <span style={{ fontSize: 10, fontWeight: 700, color: b.color,
                                        background: b.color + '20', padding: '1px 6px', borderRadius: 6 }}>
                                        Tanlangan
                                    </span>
                                )}
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                                {fmt(b.totalAmount)} UZS
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {b.count} ta qarz
                                </span>
                                <span style={{
                                    fontSize: 11, fontWeight: 700,
                                    padding: '2px 7px', borderRadius: 8,
                                    background: b.color + '18', color: b.color
                                }}>{pct}%</span>
                            </div>
                            {/* Progress bar */}
                            <div style={{ marginTop: 10, height: 4, borderRadius: 4, background: 'var(--border-color)' }}>
                                <div style={{
                                    height: '100%', borderRadius: 4,
                                    background: b.color, width: `${pct}%`,
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Detail jadval sarlavhasi */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {activeBucket
                        ? <>{activeBucket} kun guruhi — <span style={{ color: 'var(--text-primary)' }}>{filteredItems.length} ta qarz</span></>
                        : <>Barcha qarzlar — <span style={{ color: 'var(--text-primary)' }}>{filteredItems.length} ta</span></>
                    }
                </div>
                {activeBucket && (
                    <button className="btn-reset" onClick={() => setActiveBucket(null)}
                            style={{ fontSize: 12 }}>
                        <RotateCcw size={12} /> Filterni tozalash
                    </button>
                )}
            </div>

            {/* Detail jadval */}
            {filteredItems.length > 0 ? (
                <div className="table-card">
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>{isCustomer ? 'Mijoz' : 'Yetkazuvchi'}</th>
                                <th className="th-right">Qoldiq</th>
                                <th className="th-center">Kun</th>
                                <th className="th-center">Guruh</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredItems.map((item, i) => (
                                <tr key={i}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td>
                                        <div className="cell-name">{item.entityName}</div>
                                        {item.entityPhone && (
                                            <div className="cell-muted" style={{ fontSize: 11 }}>{item.entityPhone}</div>
                                        )}
                                    </td>
                                    <td className="th-right">
                                        <span style={{ fontWeight: 700, color: item.color }}>{fmt(item.remainingAmount)}</span>
                                        <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                    </td>
                                    <td className="th-center">
                                        <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>
                                            {item.daysOverdue} kun
                                        </span>
                                    </td>
                                    <td className="th-center">
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 20,
                                            fontSize: 12, fontWeight: 600,
                                            color: item.color, background: item.color + '18'
                                        }}>{item.bucket} kun</span>
                                    </td>
                                    <td className="th-center">
                                        <button
                                            className="act-btn act-edit"
                                            title="Nasiyalarni ko'rish"
                                            onClick={() => onNavigate(
                                                isCustomer
                                                    ? `/debts?customerId=${item.entityId}`
                                                    : `/purchases?supplierId=${item.entityId}`
                                            )}>
                                            <ArrowUpRight size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="table-card">
                    <div className="table-empty">
                        <BarChart2 size={40} strokeWidth={1} />
                        <p>{activeBucket ? `${activeBucket} kun guruhida qarz yo'q` : 'Ochiq qarzlar yo\'q'}</p>
                    </div>
                </div>
            )}
        </div>
    )
}

// ── DebtTreeView komponenti ──────────────────────────────────────
function DebtTreeView({ grouped, loading, type, expandedIds, onToggle, onView, onPay, onPayAll, onViewSupplier, highlightId, hasPermission }) {
    const isCustomer = type === 'customer'

    if (loading) return (
        <div className="table-card">
            <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
        </div>
    )

    if (!grouped.length) return (
        <div className="table-card">
            <div className="table-empty"><CreditCard size={40} strokeWidth={1} /><p>Ochiq qarzlar yo'q</p></div>
        </div>
    )

    // CategoriesPage uslubida flattenTree
    const rows = []
    grouped.forEach(group => {
        const key = `${isCustomer ? 'c' : 's'}-${group.entityId}`
        const isExpanded = expandedIds.has(key)
        const debts = isCustomer ? (group.debts || []) : (group.supplierDebts || [])
        rows.push({ type: 'group', group, key, isExpanded, debtCount: debts.length })
        if (isExpanded) {
            debts.forEach(d => rows.push({ type: 'debt', debt: d, groupKey: key }))
        }
    })

    return (
        <div className="table-card">
            <div className="table-responsive">
                <table className="ptable">
                    <thead>
                    <tr>
                        <th className="th-num">#</th>
                        <th>{isCustomer ? 'Mijoz / Chek' : 'Yetkazuvchi / Xarid'}</th>
                        <th className="th-right">Dastlabki qarz</th>
                        <th className="th-right">To'langan</th>
                        <th className="th-right">Qoldiq</th>
                        <th className="th-center">Muddat</th>
                        <th className="th-center">Holat</th>
                        <th className="th-center">Amallar</th>
                    </tr>
                    </thead>
                    <tbody>
                    {rows.map((row, i) => {
                        if (row.type === 'group') {
                            const { group, key, isExpanded, debtCount } = row
                            const debts = isCustomer ? (group.debts || []) : (group.supplierDebts || [])

                            // 1. To'langan = jami - qoldiq
                            const totalPaid = Number(group.totalDebt || 0) - Number(group.totalRemaining || 0)

                            // 2. Eng yaqin muddat
                            const dueDates = debts
                                .filter(d => d.dueDate && !d.isPaid)
                                .map(d => new Date(d.dueDate))
                            const nearestDue = dueDates.length
                                ? new Date(Math.min(...dueDates))
                                : null
                            const nearestDueOverdue = nearestDue && nearestDue < new Date()

                            // 3. Holat: har xil
                            const openCount    = debts.filter(d => !d.isPaid && !(d.dueDate && new Date(d.dueDate) < new Date())).length
                            const overdueCount = debts.filter(d => !d.isPaid && d.dueDate && new Date(d.dueDate) < new Date()).length

                            const hasOpenDebts = debts.some(d => !d.isPaid)

                            const isHighlighted = highlightId && group.entityId === highlightId
                            return (
                                <tr key={key}
                                    style={{
                                        background: isHighlighted
                                            ? 'rgba(37,99,235,0.06)'
                                            : 'var(--surface-secondary)',
                                        cursor: 'pointer',
                                        outline: isHighlighted ? '2px solid rgba(37,99,235,0.3)' : 'none',
                                        outlineOffset: '-1px'
                                    }}
                                    onClick={() => onToggle(key)}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <button style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                padding: 2, color: 'var(--text-secondary)', display: 'flex'
                                            }}>
                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRightIcon size={14} />}
                                            </button>
                                            <div>
                                                <div className="cell-name" style={{ fontWeight: 700 }}>
                                                    {group.entityName}
                                                    {debtCount > 0 && (
                                                        <span style={{
                                                            marginLeft: 8, fontSize: 11, fontWeight: 600,
                                                            background: 'var(--primary-light)', color: 'var(--primary)',
                                                            padding: '2px 8px', borderRadius: 20
                                                        }}>{debtCount} ta</span>
                                                    )}
                                                </div>
                                                {group.entityPhone && (
                                                    <div className="cell-muted" style={{ fontSize: 12 }}>
                                                        {group.entityPhone}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="th-right">
                                        <span className="cell-price">{fmt(group.totalDebt)}</span>
                                        <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                    </td>
                                    {/* 1. To'langan jami */}
                                    <td className="th-right" style={{ color: '#16a34a' }}>
                                        {fmt(totalPaid)}
                                        <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                    </td>
                                    <td className="th-right">
                                        <span style={{ fontWeight: 700, color: '#dc2626' }}>
                                            {fmt(group.totalRemaining)}
                                        </span>
                                        <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                    </td>
                                    {/* 2. Eng yaqin muddat */}
                                    <td className="th-center">
                                        {nearestDue
                                            ? <span style={{
                                                fontSize: 12, fontWeight: 600,
                                                color: nearestDueOverdue ? '#dc2626' : '#f59e0b'
                                            }}>
                                                {fmtDate(nearestDue)}
                                              </span>
                                            : <span className="cell-muted">—</span>
                                        }
                                    </td>
                                    {/* 3. Holat: har xil */}
                                    <td className="th-center">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                                            {openCount > 0 && (
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                                    color: '#f59e0b', background: 'rgba(245,158,11,0.1)'
                                                }}>{openCount} ta ochiq</span>
                                            )}
                                            {overdueCount > 0 && (
                                                <span style={{
                                                    padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                                                    color: '#dc2626', background: 'rgba(220,38,38,0.1)'
                                                }}>{overdueCount} ta muddati o'tgan</span>
                                            )}
                                        </div>
                                    </td>
                                    {/* 4. Amallar */}
                                    <td onClick={e => e.stopPropagation()}>
                                        <div className="action-group">
                                            {isCustomer && hasOpenDebts && hasPermission('CUSTOMERS_DEBT_PAY') && (
                                                <button className="act-btn act-pay"
                                                        title="Hammasini to'lash"
                                                        onClick={() => onPayAll({ ...group, debts: debts })}>
                                                    <Banknote size={14} />
                                                </button>
                                            )}
                                            {!isCustomer && (
                                                <button className="act-btn act-edit"
                                                        title="Yetkazuvchi sahifasi"
                                                        onClick={() => onViewSupplier(group.entityId)}>
                                                    <ArrowUpRight size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        }

                        // Debt row
                        const { debt: d } = row
                        const status = getDebtStatus(d)
                        const isOverdue = d.dueDate && new Date(d.dueDate) < new Date()
                        return (
                            <tr key={d.id}
                                style={{ cursor: 'pointer', background: isOverdue ? 'rgba(220,38,38,0.03)' : '' }}
                                onClick={() => onView(d)}>
                                <td className="cell-num" style={{ color: 'transparent' }}>—</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 24 }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>└</span>
                                        <span className="cell-barcode">
                                            {isCustomer ? d.saleReferenceNo || '—' : d.purchaseReferenceNo || '—'}
                                        </span>
                                        <span className="cell-muted" style={{ fontSize: 11 }}>
                                            {fmtDate(d.createdAt)}
                                        </span>
                                    </div>
                                </td>
                                <td className="th-right">
                                    <span className="cell-price">{fmt(d.amount)}</span>
                                    <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                </td>
                                <td className="th-right" style={{ color: '#16a34a' }}>
                                    {fmt(d.paidAmount)}
                                    <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                </td>
                                <td className="th-right">
                                    <span style={{ fontWeight: 700, color: d.isPaid ? '#16a34a' : '#dc2626' }}>
                                        {fmt(d.remainingAmount)}
                                    </span>
                                    <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                </td>
                                <td className="th-center">
                                    {d.dueDate
                                        ? <span style={{ fontSize: 12, color: status.color, fontWeight: 600 }}>
                                            {fmtDate(d.dueDate)}
                                          </span>
                                        : <span className="cell-muted">—</span>
                                    }
                                </td>
                                <td className="th-center">
                                    <span style={{
                                        padding: '3px 10px', borderRadius: 20,
                                        fontSize: 12, fontWeight: 600,
                                        color: status.color, background: status.bg
                                    }}>{status.label}</span>
                                </td>
                                <td onClick={e => e.stopPropagation()}>
                                    <div className="action-group">
                                        <button className="act-btn act-edit" onClick={() => onView(d)}>
                                            <Eye size={14} />
                                        </button>
                                        {isCustomer && !d.isPaid && hasPermission('CUSTOMERS_DEBT_PAY') && (
                                            <button className="act-btn act-pay" onClick={() => onPay(d)}>
                                                <Banknote size={14} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ── DebtTable komponenti ─────────────────────────────────────────
function DebtTable({ debts, loading, type, page, size, totalPages, onPageChange, onView, onPay, hasPermission }) {
    const isCustomer = type === 'customer'

    return (
        <div className="table-card">
            {loading ? (
                <div className="table-loading">
                    <Loader2 size={28} className="spin" />
                    <p>Yuklanmoqda...</p>
                </div>
            ) : debts.length === 0 ? (
                <div className="table-empty">
                    <CreditCard size={40} strokeWidth={1} />
                    <p>Qarzlar topilmadi</p>
                </div>
            ) : (
                <div className="table-responsive">
                    <table className="ptable">
                        <thead>
                        <tr>
                            <th className="th-num">#</th>
                            <th>{isCustomer ? 'Mijoz' : 'Yetkazuvchi'}</th>
                            <th>{isCustomer ? 'Chek' : 'Xarid'}</th>
                            <th className="th-right">Jami qarz</th>
                            <th className="th-right">To'langan</th>
                            <th className="th-right">Qoldiq</th>
                            <th className="th-center">Muddat</th>
                            <th className="th-center">Holat</th>
                            <th className="th-center">Amallar</th>
                        </tr>
                        </thead>
                        <tbody>
                        {debts.map((d, i) => {
                            const status = getDebtStatus(d)
                            const rowClass = d.isPaid ? ''
                                : (d.dueDate && new Date(d.dueDate) < new Date()) ? 'row-overdue'
                                    : ''
                            return (
                                <tr key={d.id} className={rowClass}
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => onView(d)}>
                                    <td className="cell-num">{page * size + i + 1}</td>
                                    <td>
                                        <div className="cell-name">
                                            {isCustomer ? d.customerName : d.supplierName}
                                        </div>
                                        {isCustomer && d.customerPhone && (
                                            <div className="cell-muted" style={{ fontSize: 12 }}>
                                                {d.customerPhone}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        {isCustomer
                                            ? <span className="cell-barcode">{d.saleReferenceNo || '—'}</span>
                                            : <span className="cell-barcode">{d.purchaseReferenceNo || '—'}</span>
                                        }
                                    </td>
                                    <td className="th-right">
                                        <span className="cell-price">{fmt(d.amount)}</span>
                                        <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                    </td>
                                    <td className="th-right" style={{ color: '#16a34a' }}>
                                        {fmt(d.paidAmount)} <span className="cell-muted" style={{ fontSize: 11 }}>UZS</span>
                                    </td>
                                    <td className="th-right">
                                        <span style={{ fontWeight: 700, color: d.isPaid ? '#16a34a' : '#dc2626' }}>
                                            {fmt(d.remainingAmount)}
                                        </span>
                                        <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                    </td>
                                    <td className="th-center">
                                        {d.dueDate
                                            ? <span style={{ fontSize: 12, color: status.color, fontWeight: 600 }}>
                                                {fmtDate(d.dueDate)}
                                              </span>
                                            : <span className="cell-muted">—</span>
                                        }
                                    </td>
                                    <td className="th-center">
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 20,
                                            fontSize: 12, fontWeight: 600,
                                            color: status.color, background: status.bg
                                        }}>
                                            {status.label}
                                        </span>
                                    </td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <div className="action-group">
                                            <button className="act-btn act-edit" title="Ko'rish"
                                                    onClick={() => onView(d)}>
                                                <Eye size={14} />
                                            </button>
                                            {isCustomer && !d.isPaid && hasPermission('CUSTOMERS_DEBT_PAY') && (
                                                <button className="act-btn act-pay" title="To'lash"
                                                        onClick={() => onPay(d)}>
                                                    <Banknote size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}

            {totalPages > 1 && (
                <div className="pagination">
                    <button className="page-btn" disabled={page === 0}
                            onClick={() => onPageChange(p => p - 1)}>
                        <ChevronLeft size={16} />
                    </button>
                    <span className="page-info">{page + 1} / {totalPages}</span>
                    <button className="page-btn" disabled={page >= totalPages - 1}
                            onClick={() => onPageChange(p => p + 1)}>
                        <ChevronRight size={16} />
                    </button>
                </div>
            )}
        </div>
    )
}

// ── NasiyaStatCard ───────────────────────────────────────────────
function NasiyaStatCard({ label, value, color, icon: Icon }) {
    return (
        <div className="nasiya-mini-card">
            <div className="nasiya-mini-icon" style={{ background: color + '18', color }}>
                <Icon size={16} />
            </div>
            <div>
                <div className="nasiya-mini-label">{label}</div>
                <div className="nasiya-mini-value">{value}</div>
            </div>
        </div>
    )
}