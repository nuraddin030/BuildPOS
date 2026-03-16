import React, { useState, useEffect, useRef } from 'react'
import ReactDOM from 'react-dom'
import {
    Search, X, Plus, Minus, Trash2, User, CreditCard,
    Banknote, ArrowLeftRight, Clock, RefreshCw,
    Download, PauseCircle, Package, ShoppingCart, Printer,
    Calendar, ArrowUpDown, History
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useReactToPrint } from 'react-to-print'
import { salesApi } from '../api/sales'
import { shiftsApi } from '../api/shifts'
import api from '../api/api'
import '../styles/CashierPage.css'

// ─── Helpers ─────────────────────────────────
const fmt = (n) => n == null ? '0' : Number(n).toLocaleString('ru-RU')
const fmtPrice = (val) => {
    if (val === '' || val == null) return ''
    const num = String(val).replace(/\D/g, '')
    return num ? num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : ''
}
const parseNum = (val) => Number(String(val).replace(/\s/g, '')) || 0

const PAYMENT_METHODS = [
    { value: 'CASH',     label: 'Naqd',     color: '#22c55e' },
    { value: 'CARD',     label: 'Karta',    color: '#3b82f6' },
    { value: 'TRANSFER', label: "O'tkazma", color: '#8b5cf6' },
    { value: 'DEBT',     label: 'Nasiya',   color: '#f59e0b' },
]
const QUICK_DISCOUNTS = [10, 15, 20, 25]

// ─── SearchSelect komponenti ─────────────────
function SearchSelect({ placeholder, value, search, onSearchChange, onSelect, onClear, items, getLabel, getSub, minChars = 4 }) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef()
    const selected = items.find(i => String(i.id) === String(value))

    useEffect(() => {
        const handler = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                <input
                    className="pos-input"
                    style={{ paddingLeft: 32, paddingRight: selected ? 32 : 12 }}
                    placeholder={placeholder}
                    value={selected ? getLabel(selected) : search}
                    readOnly={!!selected}
                    onChange={e => { onSearchChange(e.target.value); setOpen(true) }}
                    onClick={() => { if (!selected) setOpen(true) }}
                />
                {selected && (
                    <button onClick={onClear}
                            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
                        <X size={14} />
                    </button>
                )}
            </div>
            {open && !selected && (
                <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: '1.5px solid #e8eaed', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.12)', zIndex: 200, maxHeight: 220, overflowY: 'auto' }}>
                    {search.length < minChars ? (
                        <div style={{ padding: 12, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Kamida {minChars} ta harf yozing...</div>
                    ) : items.length === 0 ? (
                        <div style={{ padding: 12, color: '#9ca3af', fontSize: 13, textAlign: 'center' }}>Topilmadi</div>
                    ) : items.map(item => (
                        <div key={item.id}
                             onClick={() => { onSelect(String(item.id)); setOpen(false) }}
                             style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', transition: 'background .1s' }}
                             onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                             onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                            <div style={{ fontWeight: 600, fontSize: 13 }}>{getLabel(item)}</div>
                            {getSub && getSub(item) && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{getSub(item)}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Smena ochish ─────────────────────────────
function OpenShiftModal({ warehouses, onOpen }) {
    const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || '')
    const [openingCash, setOpeningCash] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const handle = async () => {
        if (!warehouseId) return setError('Ombor tanlang')
        setLoading(true); setError('')
        try { const r = await shiftsApi.open({ warehouseId: Number(warehouseId), openingCash: parseNum(openingCash) }); onOpen(r.data) }
        catch (e) { setError(e.response?.data?.message || 'Xatolik') }
        finally { setLoading(false) }
    }
    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal" style={{ maxWidth: 400 }}>
                <div className="pos-mh">🕐 Smena ochish</div>
                <div className="pos-mb">
                    {error && <div className="pos-alert">{error}</div>}
                    <div className="pos-fg"><label className="pos-label">Ombor *</label>
                        <select className="pos-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>
                    </div>
                    <div className="pos-fg"><label className="pos-label">Boshlang'ich naqd (so'm)</label>
                        <input className="pos-input" type="text" inputMode="numeric" placeholder="0"
                               value={fmtPrice(openingCash)} onChange={e => setOpeningCash(e.target.value.replace(/\D/g, ''))} />
                    </div>
                </div>
                <div className="pos-mf"><button className="pos-btn-p" onClick={handle} disabled={loading}>{loading ? 'Ochilmoqda...' : 'Smena ochish'}</button></div>
            </div>
        </div>,
        document.body
    )
}

// ─── Smena yopish ─────────────────────────────
function CloseShiftModal({ shift, onClose, onClosed }) {
    const [closingCash, setClosingCash] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const expected = Number(shift?.totalCash || 0)
    const actual = parseNum(closingCash)
    const diff = closingCash !== '' ? actual - expected : null
    const handle = async () => {
        setLoading(true); setError('')
        try { const r = await shiftsApi.close({ closingCash: actual, notes }); onClosed(r.data) }
        catch (e) { setError(e.response?.data?.message || 'Xatolik') }
        finally { setLoading(false) }
    }
    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal" style={{ maxWidth: 480 }}>
                <div className="pos-mh">Smena yopish <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button></div>
                <div className="pos-mb">
                    {error && <div className="pos-alert">{error}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#f8f9fa', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                        {[['Jami sotuv', fmt(shift?.totalSales) + ' so\'m'], ['Sotuvlar', (shift?.saleCount || 0) + ' ta'],
                            ['Naqd', fmt(shift?.totalCash) + ' so\'m'], ['Karta', fmt(shift?.totalCard) + ' so\'m'],
                            ["O'tkazma", fmt(shift?.totalTransfer) + ' so\'m'], ['Nasiya', fmt(shift?.totalDebt) + ' so\'m']
                        ].map(([k, v]) => (
                            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', borderBottom: '1px solid #e8eaed' }}>
                                <span style={{ color: '#6b7280' }}>{k}</span><span style={{ fontWeight: 600 }}>{v}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pos-fg"><label className="pos-label">Kassadagi haqiqiy naqd</label>
                        <input className="pos-input" type="text" inputMode="numeric" placeholder="0"
                               value={fmtPrice(closingCash)} onChange={e => setClosingCash(e.target.value.replace(/\D/g, ''))} />
                        {diff !== null && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 700, color: diff === 0 ? '#22c55e' : diff > 0 ? '#22c55e' : '#ef4444' }}>
                            {diff === 0 ? '✓ Mos keladi' : diff > 0 ? `+${fmt(diff)} so'm ortiqcha` : `-${fmt(Math.abs(diff))} so'm kam`}
                        </div>}
                    </div>
                    <div className="pos-fg"><label className="pos-label">Izoh</label>
                        <textarea className="pos-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>
                <div className="pos-mf">
                    <button className="pos-btn-s" onClick={onClose}>Bekor</button>
                    <button className="pos-btn-p" style={{ background: '#ef4444' }} onClick={handle} disabled={loading}>{loading ? 'Yopilmoqda...' : 'Smena yopish'}</button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── To'lov modali ────────────────────────────
function PaymentModal({ sale, onClose, onCompleted }) {
    const total = Number(sale?.totalAmount || 0)
    const [payments, setPayments] = useState([{ method: 'CASH', amount: String(total), dueDate: '', notes: '' }])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [limitWarning, setLimitWarning] = useState(null) // { exceeded, strict, remaining, debtLimit }
    const [limitChecking, setLimitChecking] = useState(false)

    const totalPaid = payments.reduce((s, p) => s + parseNum(p.amount), 0)
    const change = totalPaid - total
    const upd = (i, k, v) => setPayments(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

    const debtAmount = payments
        .filter(p => p.method === 'DEBT')
        .reduce((s, p) => s + parseNum(p.amount), 0)

    // DEBT tanlanganda limit tekshiruvi
    useEffect(() => {
        if (!sale?.customerId || debtAmount <= 0) { setLimitWarning(null); return }
        setLimitChecking(true)
        api.get(`/api/v1/customers/${sale.customerId}/check-debt-limit`, {
            params: { amount: debtAmount }
        })
            .then(res => {
                const d = res.data
                if (d.hasLimit && d.exceeded) setLimitWarning(d)
                else setLimitWarning(null)
            })
            .catch(() => setLimitWarning(null))
            .finally(() => setLimitChecking(false))
    }, [debtAmount, sale?.customerId])

    const handle = async () => {
        if (payments.some(p => p.method === 'DEBT' && parseNum(p.amount) > 0) && !sale.customerId)
            return setError('Nasiya uchun mijoz tanlanishi kerak')
        if (limitWarning?.strict)
            return setError(`Mijozning qarz limiti (${fmt(limitWarning.debtLimit)} UZS) to'ldi. Nasiya berib bo'lmaydi.`)
        setLoading(true); setError('')
        try {
            const r = await salesApi.complete(sale.id, payments.filter(p => parseNum(p.amount) > 0).map(p => ({
                paymentMethod: p.method, amount: parseNum(p.amount), dueDate: p.dueDate || null, notes: p.notes || null
            })))
            onCompleted(r.data)
        } catch (e) { setError(e.response?.data?.message || 'Xatolik') }
        finally { setLoading(false) }
    }

    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal" style={{ maxWidth: 500 }}>
                <div className="pos-mh">To'lov <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button></div>
                <div className="pos-mb">
                    {error && <div className="pos-alert">{error}</div>}

                    {/* Limit ogohlantirish */}
                    {limitWarning && !limitWarning.strict && (
                        <div style={{
                            padding: '10px 14px', marginBottom: 12,
                            background: 'rgba(245,158,11,0.1)', borderRadius: 8,
                            border: '1px solid rgba(245,158,11,0.3)',
                            fontSize: 13, color: '#b45309', fontWeight: 500
                        }}>
                            ⚠ Diqqat! Bu mijozning qarz limiti ({fmt(limitWarning.debtLimit)} UZS) oshib ketmoqda.
                            Qolgan limit: {fmt(Math.max(0, limitWarning.remaining))} UZS
                        </div>
                    )}
                    {limitWarning?.strict && (
                        <div style={{
                            padding: '10px 14px', marginBottom: 12,
                            background: 'rgba(220,38,38,0.1)', borderRadius: 8,
                            border: '1px solid rgba(220,38,38,0.3)',
                            fontSize: 13, color: '#dc2626', fontWeight: 600
                        }}>
                            🚫 Bu mijozning qarz limiti to'ldi ({fmt(limitWarning.debtLimit)} UZS). Nasiya berib bo'lmaydi!
                        </div>
                    )}

                    <div style={{ background: '#1a1a2e', borderRadius: 10, padding: '14px 20px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>To'lash kerak</span>
                        <span style={{ color: '#fff', fontSize: 24, fontWeight: 800 }}>{fmt(total)} so'm</span>
                    </div>
                    {payments.map((p, i) => (
                        <div key={i} style={{ border: '1.5px solid #e8eaed', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <select className="pos-select" style={{ width: 130, flexShrink: 0 }} value={p.method} onChange={e => upd(i, 'method', e.target.value)}>
                                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                                <input className="pos-input" type="text" inputMode="numeric" placeholder="Summa"
                                       value={fmtPrice(p.amount)} onChange={e => upd(i, 'amount', e.target.value.replace(/\D/g, ''))} />
                                {payments.length > 1 && <button onClick={() => setPayments(prev => prev.filter((_, idx) => idx !== i))}
                                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}><X size={16} /></button>}
                            </div>
                            {p.method === 'DEBT' && (
                                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                    <input className="pos-input" type="date" value={p.dueDate} onChange={e => upd(i, 'dueDate', e.target.value)} style={{ flex: 1 }} />
                                    <input className="pos-input" placeholder="Izoh" value={p.notes} onChange={e => upd(i, 'notes', e.target.value)} style={{ flex: 1 }} />
                                </div>
                            )}
                        </div>
                    ))}
                    {payments.length < 4 && (
                        <button className="pos-note-btn" style={{ marginBottom: 14 }}
                                onClick={() => { const used = payments.map(p => p.method); const next = PAYMENT_METHODS.find(m => !used.includes(m.value)); if (next) setPayments(p => [...p, { method: next.value, amount: '', dueDate: '', notes: '' }]) }}>
                            <Plus size={14} /> To'lov usuli qo'shish
                        </button>
                    )}
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: '#6b7280' }}>Kiritildi</span><span style={{ fontWeight: 600 }}>{fmt(totalPaid)} so'm</span>
                        </div>
                        {change > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontWeight: 700 }}><span>Qaytim</span><span>{fmt(change)} so'm</span></div>}
                        {change < 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#f59e0b', fontWeight: 700 }}><span>Qoldiq</span><span>{fmt(Math.abs(change))} so'm</span></div>}
                    </div>
                </div>
                <div className="pos-mf">
                    <button className="pos-btn-s" onClick={onClose}>Bekor</button>
                    <button className="pos-btn-p" onClick={handle}
                            disabled={loading || totalPaid === 0 || (limitWarning?.strict && debtAmount > 0)}
                            style={limitWarning?.strict && debtAmount > 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                        {loading ? 'Saqlanmoqda...' : '✓ Tasdiqlash'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── Chek modali ──────────────────────────────
function ReceiptModal({ sale, onClose }) {
    const dl = async () => {
        if (!window.jspdf) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script')
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
                script.onload = resolve; script.onerror = reject
                document.head.appendChild(script)
            })
        }
        const { jsPDF } = window.jspdf
        const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' })
        const W = 80; let y = 8

        const line = (text, size = 9, bold = false, align = 'left') => {
            doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal')
            const x = align === 'center' ? W / 2 : align === 'right' ? W - 5 : 5
            doc.text(String(text), x, y, { align }); y += size * 0.45
        }
        const divider = (ch = '-') => {
            doc.setFontSize(8); doc.setFont('helvetica', 'normal')
            doc.text(ch.repeat(42), 5, y); y += 4
        }
        const row = (left, right) => {
            doc.setFontSize(9); doc.setFont('helvetica', 'normal')
            doc.text(String(left), 5, y)
            doc.setFont('helvetica', 'bold')
            doc.text(String(right), W - 5, y, { align: 'right' }); y += 5
        }

        line('BUILDPOS', 13, true, 'center')
        line('SOTUV CHEKI', 10, false, 'center'); y += 2
        divider('=')

        line('Chek:    ' + sale.referenceNo, 8); y += 1
        line('Sana:    ' + new Date(sale.completedAt || sale.createdAt).toLocaleString('ru-RU'), 8); y += 1
        line('Kassir:  ' + (sale.cashierName || sale.sellerName || '-'), 8); y += 1
        if (sale.customerName) { line('Mijoz:   ' + sale.customerName, 8); y += 1 }
        divider()

        ;(sale.items || []).forEach(item => {
            line(item.productName + ' (' + item.unitSymbol + ')', 9, true)
            row('  ' + item.quantity + ' x ' + fmt(item.salePrice) + " so'm", fmt(item.totalPrice) + " so'm")
        })
        divider()

        if (sale.discountAmount > 0) row("Chegirma:", '-' + fmt(sale.discountAmount) + " so'm")
        row('JAMI:', fmt(sale.totalAmount) + " so'm")
        divider()

        ;(sale.payments || []).forEach(p => {
            const label = PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod
            row(label + ':', fmt(p.amount) + " so'm")
        })
        if (sale.changeAmount > 0) row("Qaytim:", fmt(sale.changeAmount) + " so'm")

        divider('='); y += 2
        line('Rahmat! Yana keling :)', 9, false, 'center')
        doc.save('chek-' + sale.referenceNo + '.pdf')
    }
    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal" style={{ maxWidth: 420 }}>
                <div className="pos-mh" style={{ color: '#16a34a' }}>✓ Sotuv yakunlandi
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                </div>
                <div className="pos-mb">
                    <div className="receipt">
                        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>BUILDPOS — SOTUV CHEKI</div>
                        <div className="receipt-div" />
                        <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                            <div>Chek: <b>{sale.referenceNo}</b></div>
                            <div>Sana: {new Date(sale.completedAt||sale.createdAt).toLocaleString('ru-RU')}</div>
                            <div>Kassir: {sale.cashierName||sale.sellerName||'—'}</div>
                            {sale.customerName && <div>Mijoz: {sale.customerName}</div>}
                        </div>
                        <div className="receipt-div" />
                        {(sale.items||[]).map((item,i) => (
                            <div key={i} style={{ marginBottom: 6 }}>
                                <div style={{ fontWeight: 600 }}>{item.productName} <span style={{ color: '#888', fontWeight: 400 }}>({item.unitSymbol})</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ color: '#555' }}>{item.quantity} × {fmt(item.salePrice)}</span>
                                    <b>{fmt(item.totalPrice)} so'm</b>
                                </div>
                            </div>
                        ))}
                        <div className="receipt-div" />
                        {sale.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}><span>Chegirma</span><span>-{fmt(sale.discountAmount)} so'm</span></div>}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}><span>JAMI</span><span>{fmt(sale.totalAmount)} so'm</span></div>
                        <div className="receipt-div" />
                        {(sale.payments||[]).map((p,i) => {
                            const pm = PAYMENT_METHODS.find(m => m.value === p.paymentMethod)
                            return <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}><span style={{ color: pm?.color }}>{pm?.label}</span><b>{fmt(p.amount)} so'm</b></div>
                        })}
                        {sale.changeAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e', fontWeight: 700, fontSize: 12 }}><span>Qaytim</span><span>{fmt(sale.changeAmount)} so'm</span></div>}
                        <div className="receipt-div" />
                        <div style={{ textAlign: 'center', color: '#888', fontSize: 12 }}>Rahmat! Yana keling 😊</div>
                    </div>
                </div>
                <div className="pos-mf">
                    <button className="pos-btn-s" onClick={dl}><Download size={14} style={{ marginRight: 6 }} />PDF</button>
                    <button className="pos-btn-s" onClick={() => window.print()}><Printer size={14} style={{ marginRight: 6 }} />Chop etish</button>
                    <button className="pos-btn-p" onClick={onClose}>Yangi sotuv</button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── Mijoz / Hamkor yaratish modali ──────────
function CreateModal({ type, onClose, onCreated }) {
    const [name, setName] = useState('')
    const [phone, setPhone] = useState('')
    const [notes, setNotes] = useState('')
    const [debtLimit, setDebtLimit] = useState('')
    const [debtLimitStrict, setDebtLimitStrict] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const isCustomer = type === 'customer'
    const title = isCustomer ? 'Yangi mijoz' : 'Yangi hamkor'
    const endpoint = isCustomer ? '/api/v1/customers' : '/api/v1/partners'

    const handle = async () => {
        if (!name.trim()) return setError('Ism kiritish shart')
        if (!phone.trim()) return setError('Telefon kiritish shart')
        setLoading(true); setError('')
        try {
            const payload = {
                name: name.trim(), phone: phone.trim(), notes: notes.trim() || null,
                ...(isCustomer && {
                    debtLimit: debtLimit ? Number(debtLimit) : null,
                    debtLimitStrict: debtLimitStrict,
                })
            }
            const r = await api.post(endpoint, payload)
            onCreated(r.data, type)
        } catch (e) {
            setError(e.response?.data?.message || e.response?.data?.name?.[0] || 'Xatolik')
        } finally { setLoading(false) }
    }

    return ReactDOM.createPortal(
        <div className="pos-overlay" style={{ zIndex: 1100 }}>
            <div className="pos-modal" style={{ maxWidth: 420 }}>
                <div className="pos-mh">
                    {title}
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                </div>
                <div className="pos-mb">
                    {error && <div className="pos-alert">{error}</div>}
                    <div className="pos-fg">
                        <label className="pos-label">Ism familiya *</label>
                        <input className="pos-input" placeholder="To'liq ism" autoFocus
                               value={name} onChange={e => setName(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && handle()} />
                    </div>
                    <div className="pos-fg">
                        <label className="pos-label">Telefon *</label>
                        <input className="pos-input" placeholder="+998901234567" type="tel"
                               value={phone} onChange={e => setPhone(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && handle()} />
                    </div>
                    <div className="pos-fg">
                        <label className="pos-label">Izoh</label>
                        <textarea className="pos-input" rows={2} placeholder="Ixtiyoriy..."
                                  value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>

                    {/* Qarz limiti — faqat mijoz uchun */}
                    {isCustomer && (
                        <div style={{
                            marginTop: 8, padding: '12px 14px',
                            background: '#f8f9fa', borderRadius: 8,
                            border: '1px solid #e8eaed'
                        }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af',
                                textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 10 }}>
                                Qarz limiti (ixtiyoriy)
                            </div>
                            <div className="pos-fg" style={{ marginBottom: 8 }}>
                                <label className="pos-label">Maksimal nasiya summasi (UZS)</label>
                                <input className="pos-input" placeholder="Bo'sh = limit yo'q"
                                       value={debtLimit}
                                       onChange={e => setDebtLimit(e.target.value.replace(/\D/g, ''))} />
                            </div>
                            {debtLimit && (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button type="button"
                                            onClick={() => setDebtLimitStrict(false)}
                                            style={{
                                                flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: 12,
                                                fontWeight: 600, cursor: 'pointer',
                                                border: `2px solid ${!debtLimitStrict ? '#f59e0b' : '#e8eaed'}`,
                                                background: !debtLimitStrict ? 'rgba(245,158,11,0.08)' : '#fff',
                                                color: !debtLimitStrict ? '#f59e0b' : '#9ca3af'
                                            }}>
                                        ⚠ Ogohlantirish
                                    </button>
                                    <button type="button"
                                            onClick={() => setDebtLimitStrict(true)}
                                            style={{
                                                flex: 1, padding: '7px 10px', borderRadius: 7, fontSize: 12,
                                                fontWeight: 600, cursor: 'pointer',
                                                border: `2px solid ${debtLimitStrict ? '#ef4444' : '#e8eaed'}`,
                                                background: debtLimitStrict ? 'rgba(239,68,68,0.08)' : '#fff',
                                                color: debtLimitStrict ? '#ef4444' : '#9ca3af'
                                            }}>
                                        🚫 Qat'iy blok
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="pos-mf">
                    <button className="pos-btn-s" onClick={onClose}>Bekor</button>
                    <button className="pos-btn-p" onClick={handle} disabled={loading}>
                        {loading ? 'Saqlanmoqda...' : 'Saqlash'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Unit tanlash ─────────────────────────────
function UnitModal({ data, onSelect, onClose }) {
    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal" style={{ maxWidth: 360 }}>
                <div className="pos-mh">{data.productName}
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}><X size={18} /></button>
                </div>
                <div className="pos-mb">
                    <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 12 }}>O'lchov birligini tanlang:</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.units.map(u => (
                            <button key={u.id} onClick={() => onSelect(data.product, u)}
                                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1.5px solid #e8eaed', borderRadius: 8, background: '#f8f9fa', cursor: 'pointer', transition: 'all .15s' }}
                                    onMouseEnter={e => { e.currentTarget.style.borderColor='#2563eb'; e.currentTarget.style.background='#eff6ff' }}
                                    onMouseLeave={e => { e.currentTarget.style.borderColor='#e8eaed'; e.currentTarget.style.background='#f8f9fa' }}>
                                <div>
                                    <div style={{ fontWeight: 700, fontSize: 15 }}>{u.unitSymbol}</div>
                                    {u.barcode && <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.barcode}</div>}
                                </div>
                                <div style={{ fontWeight: 800, color: '#2563eb', fontSize: 16 }}>{fmt(u.salePrice)} so'm</div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── ASOSIY KOMPONENT ─────────────────────────
export default function CashierPage() {
    const [shift, setShift] = useState(null)
    const [shiftLoading, setShiftLoading] = useState(true)
    const [showCloseShift, setShowCloseShift] = useState(false)
    const [warehouses, setWarehouses] = useState([])
    const [customers, setCustomers] = useState([])

    // Qidiruv
    const [search, setSearch] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [showDrop, setShowDrop] = useState(false)
    const searchRef = useRef()
    const searchTO = useRef()

    const { user } = useAuth()
    const isAdmin = ['ADMIN', 'OWNER', 'ROLE_ADMIN', 'ROLE_OWNER'].includes(user?.role)
    const [priceInfoId, setPriceInfoId] = React.useState(null)
    const [holdSales, setHoldSales] = React.useState([])
    const [showHoldList, setShowHoldList] = React.useState(false)
    const [confirmCancel, setConfirmCancel] = React.useState(null)  // { id, referenceNo }
    const [warehouseModal, setWarehouseModal] = React.useState(null)  // { items: [{productUnitId, warehouses}] }
    const [warehouseSelections, setWarehouseSelections] = React.useState({})  // { productUnitId: warehouseId }
    const [pricePopoverPos, setPricePopoverPos] = React.useState({ top: 0, left: 0 })

    // Outside click — popovers yopilsin
    useEffect(() => {
        if (!priceInfoId) return
        const handler = (e) => {
            if (!e.target.closest('[data-price-info]')) setPriceInfoId(null)
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [priceInfoId])

    // Savat — localStorage dan tiklanadi
    const [cart, setCart] = useState(() => {
        try { return JSON.parse(localStorage.getItem('pos_cart') || '[]') } catch { return [] }
    })
    const [activeIdx, setActiveIdx] = useState(0)
    const [refNo] = useState(() => {
        const saved = localStorage.getItem('pos_ref')
        if (saved) return saved
        const ref = '#' + String(Date.now()).slice(-12).padStart(12, '0')
        localStorage.setItem('pos_ref', ref)
        return ref
    })

    // Mijoz
    const [customerId, setCustomerId] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')

    // Hamkor
    const [partnerId, setPartnerId] = useState('')
    const [partnerSearch, setPartnerSearch] = useState('')
    const [partners, setPartners] = useState([])
    const partnerTO = useRef()

    // Chegirma
    const [discountType, setDiscountType] = useState('PERCENT')
    const [discountValue, setDiscountValue] = useState('')

    // Eslatma
    const [notes, setNotes] = useState('')
    const [showNotes, setShowNotes] = useState(false)

    // Mobile tab
    const [activeTab, setActiveTab] = useState('cart') // 'cart' | 'panel'

    // Toast
    const [toast, setToast] = useState(null) // { msg, type: 'success'|'error' }
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Modals
    const [unitModal, setUnitModal] = useState(null)
    const [createModal, setCreateModal] = useState(null) // 'customer' | 'partner'
    const [currentSale, setCurrentSale] = useState(null)
    const [showPayment, setShowPayment] = useState(false)
    const [completedSale, setCompletedSale] = useState(null)
    const [saving, setSaving] = useState(false)
    // ── Cart → localStorage ──
    useEffect(() => {
        localStorage.setItem('pos_cart', JSON.stringify(cart))
    }, [cart])

    // ── Init ────────────────────────
    // Modal ochilganda body scroll o'chirish + layout siljishini oldini olish
    useEffect(() => {
        const hasModal = showPayment || completedSale || confirmCancel || warehouseModal
        if (hasModal) {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
            document.body.style.overflow = 'hidden'
            document.body.style.paddingRight = scrollbarWidth + 'px'
        } else {
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
        }
        return () => {
            document.body.style.overflow = ''
            document.body.style.paddingRight = ''
        }
    }, [showPayment, completedSale, confirmCancel, warehouseModal])

    useEffect(() => {
        loadShift()
        loadHoldSales()
        api.get('/api/v1/warehouses?size=100&active=true').then(r => setWarehouses(r.data.content || r.data || []))
        // customers lazy yuklanadi — qidiruv orqali
        // partners lazy yuklanadi — qidiruv orqali
    }, [])

    const loadShift = async () => {
        setShiftLoading(true)
        try { const r = await shiftsApi.getCurrent(); setShift(r.data) }
        catch { setShift(null) }
        finally { setShiftLoading(false) }
    }

    // ── Keyboard shortcuts ──────────
    useEffect(() => {
        const h = (e) => {
            const tag = document.activeElement.tagName
            const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
            if (e.key === '/' && !inInput) { e.preventDefault(); searchRef.current?.focus() }
            if (e.key === 'Escape') { setShowDrop(false); setSearch(''); searchRef.current?.blur() }
            if (!showDrop && !inInput) {
                if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)) }
                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(cart.length - 1, i + 1)) }
                if (e.key === 'ArrowRight') setCart(prev => prev.map((c, i) => i === activeIdx ? { ...c, quantity: c.quantity + 1 } : c))
                if (e.key === 'ArrowLeft') setCart(prev => prev.map((c, i) => i === activeIdx ? { ...c, quantity: Math.max(0.001, c.quantity - 1) } : c).filter(c => c.quantity > 0))
            }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [cart, activeIdx, showDrop])

    // ── Mijoz qidirish (server, min 4 belgi) ──
    const custTO = useRef()
    const custDropRef = useRef()
    useEffect(() => {
        clearTimeout(custTO.current)
        if (!customerSearch || customerSearch.length < 4) { setCustomers([]); return }
        custTO.current = setTimeout(async () => {
            try {
                const r = await api.get('/api/v1/customers', { params: { search: customerSearch, size: 20 } })
                setCustomers(r.data.content || r.data || [])
            } catch {}
        }, 300)
    }, [customerSearch])

    // ── Hamkor qidirish (server, min 4 belgi) ──
    useEffect(() => {
        clearTimeout(partnerTO.current)
        if (!partnerSearch || partnerSearch.length < 4) { setPartners([]); return }
        partnerTO.current = setTimeout(async () => {
            try {
                const r = await api.get('/api/v1/partners', { params: { search: partnerSearch, size: 20, active: true } })
                setPartners(r.data.content || r.data || [])
            } catch {}
        }, 300)
    }, [partnerSearch])

    // ── Qidiruv ─────────────────────
    useEffect(() => {
        clearTimeout(searchTO.current)
        if (!search.trim()) { setSearchResults([]); setShowDrop(false); return }
        searchTO.current = setTimeout(async () => {
            setSearching(true)
            try {
                const r = await api.get('/api/v1/products', { params: { search: search.trim(), size: 10, active: true } })
                const list = r.data.content || r.data || []
                setSearchResults(list)
                setShowDrop(list.length > 0)
            } catch {}
            finally { setSearching(false) }
        }, 250)
    }, [search])

    // ── Mahsulot tanlash ────────────
    const selectProduct = async (product) => {
        setSearch(''); setShowDrop(false)
        try {
            const r = await api.get(`/api/v1/products/${product.id}`)
            const full = r.data
            const units = full.units || []
            if (!units.length) return showToast('Mahsulotda birlik yo\'q', 'error')
            if (units.length === 1) addUnitToCart(full, units[0])
            else setUnitModal({ product: full, productName: full.name, units })
        } catch { showToast('Xatolik', 'error') }
    }

    const addUnitToCart = (product, unit) => {
        const ws = (unit.warehouseStocks || []).find(w => w.warehouseId === shift?.warehouseId)
        const stock = Number(ws?.quantity ?? unit.warehouseStocks?.[0]?.quantity ?? 0)
        setCart(prev => {
            const ex = prev.find(c => c.productUnitId === unit.id)
            if (ex) return prev.map(c => c.productUnitId === unit.id ? { ...c, quantity: c.quantity + 1 } : c)
            const next = [...prev, {
                productUnitId: unit.id, productName: product.name,
                unitSymbol: unit.unitSymbol, barcode: unit.barcode,
                artikul: product.artikul || product.sku || '',
                image: product.imageUrl || product.image || null,
                salePrice: Math.round(Number(unit.salePrice || 0)),
                originalPrice: Math.round(Number(unit.salePrice || 0)),
                minPrice: Math.round(Number(unit.minPrice || 0)),
                costPrice: Math.round(Number(unit.costPrice || 0)),
                availableStock: stock, quantity: 1,
            }]
            setActiveIdx(next.length - 1)
            return next
        })
        setUnitModal(null)
    }

    const updateQty = (id, delta) => setCart(prev =>
        prev.map(c => {
            if (c.productUnitId !== id) return c
            const newQty = Math.max(0.001, c.quantity + delta)
            if (delta > 0 && c.availableStock != null && newQty > c.availableStock) {
                showToast(`Omborda faqat ${c.availableStock} ${c.unitSymbol} bor`, 'error')
                return c
            }
            return { ...c, quantity: newQty }
        })
    )
    const updatePrice = (id, val) => {
        // onChange: faqat saqlaymiz, tekshirmaymiz
        const price = parseNum(val)
        setCart(prev => prev.map(c => c.productUnitId !== id ? c : { ...c, salePrice: price }))
    }

    const commitPrice = (id) => {
        // onBlur: tekshiramiz — minPrice dan past bo'lsa asl narxga qaytaramiz
        setCart(prev => prev.map(c => {
            if (c.productUnitId !== id) return c
            if (Number(c.salePrice) < Number(c.minPrice)) {
                showToast('Min narx: ' + fmt(c.minPrice) + " so'm. Narx qaytarildi.", 'error')
                return { ...c, salePrice: c.originalPrice ?? c.minPrice, editPrice: false }
            }
            return { ...c, editPrice: false }
        }))
    }
    const removeItem = (id) => setCart(prev => prev.filter(c => c.productUnitId !== id))

    // ── Hisob ───────────────────────
    const subtotal = cart.reduce((s, c) => s + Math.round(Number(c.salePrice) * c.quantity), 0)
    const discountAmount = (() => {
        if (!discountValue) return 0
        const v = parseNum(discountValue)
        return discountType === 'PERCENT' ? subtotal * v / 100 : Math.min(v, subtotal)
    })()
    const totalAmount = subtotal - discountAmount

    const selectedCustomer = customers.find(c => c.id === Number(customerId))

    // ── To'lov ──────────────────────
    const handlePay = async () => {
        if (!cart.length) return showToast('Savat bo\'sh', 'error')
        if (!shift) return showToast('Avval smena oching', 'error')
        setSaving(true)
        try {
            // Har bir tovar uchun ombor tekshiramiz
            const productUnitIds = cart.map(c => c.productUnitId)
            const res = await api.post('/api/v1/sales/check-warehouses', productUnitIds)
            const needsSelection = res.data.filter(i => i.needsSelection)
            if (needsSelection.length > 0) {
                const selections = {}
                res.data.forEach(i => {
                    if (!i.needsSelection) selections[i.productUnitId] = i.warehouses[0]?.warehouseId
                })
                setWarehouseSelections(selections)
                setWarehouseModal({ items: needsSelection })
                setSaving(false)
                return
            }
            const warehouseMap = {}
            res.data.forEach(i => { warehouseMap[i.productUnitId] = i.warehouses[0]?.warehouseId })
            await createDraftAndPay(warehouseMap)
        } catch (e) {
            showToast(e.response?.data?.message || 'Xatolik', 'error')
        } finally { setSaving(false) }
    }

    const createDraftAndPay = async (warehouseMap) => {
        try {
            const items = cart.map(c => ({
                productUnitId: c.productUnitId,
                warehouseId: warehouseMap[c.productUnitId],
                quantity: c.quantity,
                salePrice: c.salePrice
            }))
            const r = await salesApi.createDraft({
                warehouseId: shift.warehouseId,
                customerId: customerId ? Number(customerId) : null,
                partnerId: partnerId ? Number(partnerId) : null,
                discountType: discountValue ? discountType : null,
                discountValue: discountValue ? parseNum(discountValue) : null,
                notes: notes || null,
                items,
                payments: []
            })
            setCurrentSale(r.data)
            setShowPayment(true)
        } catch (e) {
            showToast(e.response?.data?.message || 'Xatolik', 'error')
        }
    }

    const confirmWarehouseSelection = async () => {
        // Barcha tanlovlar to'liqmi
        const allSelected = warehouseModal.items.every(i => warehouseSelections[i.productUnitId])
        if (!allSelected) return showToast('Barcha tovarlar uchun ombor tanlang', 'error')
        setWarehouseModal(null)
        setSaving(true)
        // 1 ombordagilar + tanlanganlar
        const res = await api.post('/api/v1/sales/check-warehouses', cart.map(c => c.productUnitId))
        const warehouseMap = {}
        res.data.forEach(i => {
            warehouseMap[i.productUnitId] = i.needsSelection
                ? warehouseSelections[i.productUnitId]
                : i.warehouses[0]?.warehouseId
        })
        await createDraftAndPay(warehouseMap)
        setSaving(false)
    }

    // ── Hold ────────────────────────
    const loadHoldSales = async () => {
        try {
            const r = await api.get('/api/v1/sales/open?size=50')
            setHoldSales(r.data.content || [])
        } catch (e) {
            console.error('Hold load error:', e.response?.status, e.response?.data)
        }
    }

    const resumeHold = async (sale) => {
        try {
            await api.patch(`/api/v1/sales/${sale.id}/unhold`)
            clearCart()
            const r = await api.get(`/api/v1/sales/${sale.id}`)
            const s = r.data
            setCart((s.items || []).map(item => ({
                productUnitId: item.productUnitId,
                productName: item.productName,
                unitSymbol: item.unitSymbol,
                barcode: item.barcode || '',
                artikul: item.artikul || '',
                image: item.imageUrl || null,
                salePrice: Math.round(Number(item.salePrice || 0)),
                originalPrice: Math.round(Number(item.salePrice || 0)),
                minPrice: Math.round(Number(item.minPrice || 0)),
                costPrice: Math.round(Number(item.costPrice || 0)),
                availableStock: item.availableStock ?? null,
                quantity: Number(item.quantity),
            })))
            if (s.customerId) { setCustomerId(String(s.customerId)); setCustomerSearch(s.customerName || '') }
            setCurrentSale(s)
            setShowHoldList(false)
            await loadHoldSales()
            showToast('Savatcha qaytarildi')
        } catch (e) { showToast(e.response?.data?.message || 'Xatolik', 'error') }
    }

    const handleHold = async () => {
        if (!cart.length || !shift) return
        setSaving(true)
        try {
            const r = await salesApi.createDraft({
                warehouseId: shift.warehouseId,
                customerId: customerId ? Number(customerId) : null,
                items: cart.map(c => ({ productUnitId: c.productUnitId, warehouseId: shift.warehouseId, quantity: c.quantity, salePrice: c.salePrice })),
                payments: []
            })
            await api.patch(`/api/v1/sales/${r.data.id}/hold`)
            clearCart()
            await loadHoldSales()
            showToast('Savatcha kechiktirildi')
        } catch (e) { showToast(e.response?.data?.message || 'Xatolik', 'error') }
        finally { setSaving(false) }
    }

    const cancelOpenSale = async (saleId) => {
        try {
            await api.patch(`/api/v1/sales/${saleId}/cancel`)
            // Agar hozirgi aktiv savatcha bekor bo'lsa — tozalaymiz
            if (currentSale?.id === saleId) { setCurrentSale(null); clearCart() }
            setConfirmCancel(null)
            await loadHoldSales()
            showToast('Savatcha bekor qilindi')
        } catch (e) { showToast(e.response?.data?.message || 'Xatolik', 'error') }
    }

    const handleCreated = (data, type) => {
        if (type === 'customer') {
            setCustomers(prev => [data, ...prev])
            setCustomerId(String(data.id))
            setCustomerSearch('')
            showToast(`✓ Mijoz qo'shildi: ${data.fullName || data.name}`)
        } else {
            setPartners(prev => [data, ...prev])
            setPartnerId(String(data.id))
            setPartnerSearch('')
            showToast(`✓ Hamkor qo'shildi: ${data.name}`)
        }
        setCreateModal(null)
    }

    const clearCart = (resetSale = true) => {
        setCart([]); setCustomerId(''); setCustomerSearch('')
        localStorage.removeItem('pos_cart'); localStorage.removeItem('pos_ref')
        setPartnerId(''); setPartnerSearch(''); setDiscountValue(''); setNotes('')
        if (resetSale) setCurrentSale(null)
        setActiveIdx(0)
    }

    if (shiftLoading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: 12 }}>
            <RefreshCw size={24} className="spin" style={{ color: '#2563eb' }} />
            <span style={{ color: '#6b7280' }}>Yuklanmoqda...</span>
        </div>
    )

    return (
        <>
            <div className="pos-root">

                {/* Modals */}
                {!shift && <OpenShiftModal warehouses={warehouses} onOpen={setShift} />}
                {showCloseShift && <CloseShiftModal shift={shift} onClose={() => setShowCloseShift(false)} onClosed={() => { setShift(null); setShowCloseShift(false) }} />}
                {/* Toast */}
                {toast && (
                    <div style={{
                        position: 'fixed', top: 24, right: 24,
                        background: toast.type === 'error' ? '#ef4444' : '#22c55e',
                        color: '#fff', padding: '12px 20px', borderRadius: 10,
                        fontSize: 14, fontWeight: 600, zIndex: 2000,
                        boxShadow: '0 4px 20px rgba(0,0,0,.2)',
                        animation: 'fadeInRight .2s ease'
                    }}>
                        {toast.msg}
                    </div>
                )}

                {createModal && <CreateModal type={createModal} onClose={() => setCreateModal(null)} onCreated={handleCreated} />}
                {unitModal && <UnitModal data={unitModal} onSelect={addUnitToCart} onClose={() => setUnitModal(null)} />}

                {/* ── Ombor tanlash modal ── */}
                {warehouseModal && (
                    <div className="pos-confirm-overlay" onClick={() => setWarehouseModal(null)}>
                        <div className="pos-confirm-modal" style={{ width: 420 }} onClick={e => e.stopPropagation()}>
                            <div className="pos-confirm-title" style={{ marginBottom: 4 }}>Ombor tanlash</div>
                            <div className="pos-confirm-desc" style={{ marginBottom: 16 }}>
                                Quyidagi tovarlar bir nechta omborda mavjud. Har biri uchun ombor tanlang:
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                                {warehouseModal.items.map(item => {
                                    const cartItem = cart.find(c => c.productUnitId === item.productUnitId)
                                    return (
                                        <div key={item.productUnitId} className="pos-wh-select-row">
                                            <div className="pos-wh-select-name">{cartItem?.productName}</div>
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {item.warehouses.map(w => (
                                                    <button
                                                        key={w.warehouseId}
                                                        className={`pos-wh-btn${warehouseSelections[item.productUnitId] === w.warehouseId ? ' selected' : ''}`}
                                                        onClick={() => setWarehouseSelections(prev => ({ ...prev, [item.productUnitId]: w.warehouseId }))}
                                                    >
                                                        {w.warehouseName}
                                                        <span className="pos-wh-qty">{w.quantity} ta</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="pos-confirm-actions">
                                <button className="pos-confirm-btn-cancel" onClick={() => setWarehouseModal(null)}>Bekor</button>
                                <button className="pos-confirm-btn-ok" style={{ background: '#0ea5e9' }} onClick={confirmWarehouseSelection}>
                                    Tasdiqlash
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Bekor qilish confirm modal ── */}
                {confirmCancel && (
                    <div className="pos-confirm-overlay" onClick={() => setConfirmCancel(null)}>
                        <div className="pos-confirm-modal" onClick={e => e.stopPropagation()}>
                            <div className="pos-confirm-icon">🗑️</div>
                            <div className="pos-confirm-title">Savatchani bekor qilish</div>
                            <div className="pos-confirm-desc">
                                <b>#{confirmCancel.referenceNo}</b> savatchani bekor qilmoqchimisiz?<br/>
                                Bu amalni qaytarib bo'lmaydi.
                            </div>
                            <div className="pos-confirm-actions">
                                <button className="pos-confirm-btn-cancel" onClick={() => setConfirmCancel(null)}>
                                    Yo'q, qaytish
                                </button>
                                <button className="pos-confirm-btn-ok" onClick={() => cancelOpenSale(confirmCancel.id)}>
                                    Ha, bekor qilish
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Topbar ── */}
                <div className="pos-topbar">
                    <div className="pos-search-wrap">
                        <Search size={16} className="pos-search-icon" />
                        <input ref={searchRef} className="pos-search"
                               placeholder="Artikul, shtrix-kod, nom"
                               value={search}
                               onChange={e => setSearch(e.target.value)}
                               onFocus={() => search && setShowDrop(true)}
                               onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                        />
                        {!search && (
                            <div className="pos-search-actions">
                                <span style={{ fontSize: 12, color: '#94a3b8', marginRight: 4 }}>Bosing</span>
                                <span className="pos-kbd" style={{ background: '#f1f5f9', padding: '2px 6px' }}>/</span>
                            </div>
                        )}
                        {search && <button onClick={() => { setSearch(''); setShowDrop(false) }}
                                           style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                            <X size={14} /></button>}

                        {/* Dropdown */}
                        {showDrop && (
                            <div className="pos-search-dropdown">
                                {searching
                                    ? <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Qidirilmoqda...</div>
                                    : searchResults.length === 0
                                        ? <div style={{ padding: 16, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>Topilmadi</div>
                                        : searchResults.map(p => (
                                            <div key={p.id} className="pos-search-item" onMouseDown={() => selectProduct(p)}>
                                                <div className="pos-search-img">
                                                    {p.imageUrl ? <img src={p.imageUrl} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 8 }} />
                                                        : <Package size={18} style={{ color: '#d1d5db' }} />}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                                                    <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.defaultBarcode || p.sku}</div>
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: 14, color: '#0ea5e9', whiteSpace: 'nowrap' }}>{fmt(p.defaultSalePrice)} so'm</div>
                                            </div>
                                        ))
                                }
                            </div>
                        )}
                    </div>

                    {shift && <div className="pos-smena-badge">● Smena #{shift.id} — {shift.warehouseName}</div>}

                    {shift && <button className="pos-tbtn pos-tbtn-danger" onClick={() => setShowCloseShift(true)}>Smena yopish</button>}
                </div>

                {/* ── Main ── */}
                <div className="pos-main">

                    {/* ── CHAP: Savatcha ── */}
                    <div className={`pos-left${activeTab === 'cart' ? ' pos-tab-visible' : ''}`}>
                        <div className="pos-cart-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="pos-cart-title">Savatcha</span>
                                <span className="pos-cart-badge">
                                    {cart.length}
                                    {cart.length > 0 && (
                                        <Trash2
                                            size={14}
                                            className="pos-cart-badge-trash"
                                            onClick={() => clearCart()}
                                        />
                                    )}
                                </span>
                                {currentSale && cart.length > 0 && (
                                    <button className="pos-cart-cancel-btn" onClick={() => setConfirmCancel({ id: currentSale.id, referenceNo: currentSale.referenceNo })}>
                                        Bekor qilish
                                    </button>
                                )}
                            </div>
                            <span className="pos-ref">{refNo}</span>
                        </div>

                        <div className="pos-cart-body">
                            {!cart.length ? (
                                <div className="pos-cart-empty">
                                    <div className="pos-cart-empty-icon"><ShoppingCart size={30} style={{ color: '#d1d5db' }} /></div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>Savatcha hozircha bo'sh</div>
                                    <div style={{ fontSize: 13 }}>
                                        Tovarlarni qidirish uchun <kbd className="pos-kbd">/</kbd> tugmasini bosing yoki tovarlarni skanerlang
                                    </div>
                                </div>
                            ) : cart.map((item, idx) => (
                                <div key={item.productUnitId}
                                     className={`pos-cart-item${activeIdx === idx ? ' pos-active' : ''}`}
                                     onClick={() => setActiveIdx(idx)}>

                                    {/* Miqdor box — screenshot uslubida */}
                                    <div className="pos-qty-box">
                                        {item.editQty ? (
                                            <div className="pos-qty-value" style={{ padding: '4px 6px' }}>
                                                <input
                                                    autoFocus
                                                    type="text" inputMode="decimal"
                                                    defaultValue={item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}
                                                    onClick={e => e.stopPropagation()}
                                                    onBlur={e => {
                                                        e.stopPropagation()
                                                        const val = parseFloat(e.target.value.replace(',', '.')) || item.quantity
                                                        const newQty = Math.max(0.001, val)
                                                        if (item.availableStock != null && newQty > item.availableStock) {
                                                            showToast(`Omborda faqat ${item.availableStock} ${item.unitSymbol} bor`, 'error')
                                                            setCart(prev => prev.map(c => c.productUnitId === item.productUnitId ? { ...c, editQty: false } : c))
                                                            return
                                                        }
                                                        setCart(prev => prev.map(c => c.productUnitId === item.productUnitId ? { ...c, quantity: newQty, editQty: false } : c))
                                                    }}
                                                    onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { e.stopPropagation(); setCart(prev => prev.map(c => c.productUnitId === item.productUnitId ? { ...c, editQty: false } : c)) } }}
                                                    style={{ width: 52, border: 'none', outline: 'none', fontWeight: 700, fontSize: 14, background: 'transparent', textAlign: 'center' }}
                                                />
                                                <span>{item.unitSymbol}</span>
                                            </div>
                                        ) : (
                                            <div className="pos-qty-value" onClick={e => { e.stopPropagation(); setCart(prev => prev.map(c => c.productUnitId === item.productUnitId ? { ...c, editQty: true } : c)) }} style={{ cursor: 'text' }} title="Bosib miqdorni kiriting">
                                                <span>{item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(2)}</span>
                                                <span>{item.unitSymbol}</span>
                                            </div>
                                        )}
                                        <div className="pos-qty-arrows">
                                            <button className="pos-qty-btn" onClick={e => { e.stopPropagation(); updateQty(item.productUnitId, 1) }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 15l-6-6-6 6"/></svg>
                                            </button>
                                            <button className="pos-qty-btn" onClick={e => { e.stopPropagation(); updateQty(item.productUnitId, -1) }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6"/></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Rasm */}
                                    <div style={{ width: 48, height: 48, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                        {item.image
                                            ? <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            : <Package size={20} style={{ color: '#94a3b8' }} />}
                                    </div>

                                    {/* Nom + artikul / barcode */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</div>
                                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 3 }}>
                                            {[item.artikul, item.barcode].filter(Boolean).join(' / ')}
                                            {item.availableStock != null && (
                                                <span style={{ marginLeft: 6, color: (item.availableStock - item.quantity) <= 3 ? '#f59e0b' : '#94a3b8' }}>
                                                    ({Math.max(0, item.availableStock - item.quantity)} ta qoldi)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Narx + info icon */}
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        {item.editPrice ? (
                                            <input className="pos-price-input"
                                                   autoFocus
                                                   type="text" inputMode="numeric"
                                                   value={fmtPrice(item.salePrice)}
                                                   onClick={e => e.stopPropagation()}
                                                   onBlur={e => { e.stopPropagation(); commitPrice(item.productUnitId) }}
                                                   onChange={e => updatePrice(item.productUnitId, e.target.value.replace(/\s/g, ''))}
                                                   onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); if (e.key === 'Escape') { setCart(prev => prev.map(c => c.productUnitId === item.productUnitId ? { ...c, salePrice: c.originalPrice, editPrice: false } : c)) } }} />
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                                                {/* ℹ️ Narx ma'lumoti popover */}
                                                <div data-price-info style={{ position: 'relative' }}>
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation()
                                                            if (priceInfoId === item.productUnitId) { setPriceInfoId(null); return }
                                                            const rect = e.currentTarget.getBoundingClientRect()
                                                            setPricePopoverPos({ top: rect.top - 8, left: rect.right })
                                                            setPriceInfoId(item.productUnitId)
                                                        }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: priceInfoId === item.productUnitId ? '#0ea5e9' : '#94a3b8', padding: '0 2px', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                                <span style={{ fontSize: 15, fontWeight: 700, color: '#f59e0b' }}>
                                                    {fmt(Math.round(Number(item.salePrice) * item.quantity))} UZS
                                                </span>
                                                <button onClick={e => { e.stopPropagation(); setCart(prev => prev.map(c => c.productUnitId === item.productUnitId ? { ...c, editPrice: true } : c)) }}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#22c55e', padding: 0, display: 'flex', alignItems: 'center' }}>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* O'chirish tugmasi */}
                                    <button onClick={e => { e.stopPropagation(); removeItem(item.productUnitId) }}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 4, display: 'flex', alignItems: 'center', transition: 'color 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                            onMouseLeave={e => e.currentTarget.style.color = '#cbd5e1'}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── O'NG: Panel ── */}
                    {/* ── Hold Drawer ── */}
                    <div className={`pos-hold-drawer${showHoldList ? ' open' : ''}`}>
                        <div className="pos-hold-drawer-inner">
                            <div className="pos-hold-drawer-header">
                                <span className="pos-hold-drawer-title">Ochiq savatchalar</span>
                                <button className="pos-hold-drawer-close" onClick={() => setShowHoldList(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="pos-hold-drawer-body">
                                {holdSales.length === 0 ? (
                                    <div className="pos-hold-drawer-empty">Kechiktirilgan savat yo'q</div>
                                ) : holdSales.map(s => (
                                    <div key={s.id} className="pos-hold-item" onClick={() => resumeHold(s)}>
                                        <div className="pos-hold-item-info">
                                            <div className="pos-hold-item-ref-row">
                                                <span className="pos-hold-item-ref">#{s.referenceNo}</span>
                                                <span className={`pos-hold-status-badge ${s.status === 'HOLD' ? 'hold' : 'draft'}`}>
                                                    {s.status === 'HOLD' ? 'Kechiktirilgan' : 'Aktiv'}
                                                </span>
                                            </div>
                                            <div className="pos-hold-item-seller">{s.sellerName}</div>
                                            <div className="pos-hold-item-meta">
                                                {s.items?.length || 0} ta • {fmt(s.totalAmount)} so'm
                                            </div>
                                            <div className="pos-hold-item-date">
                                                {new Date(s.createdAt).toLocaleString('ru-RU')}
                                            </div>
                                        </div>
                                        <div className="pos-hold-item-actions">
                                            <span className="pos-hold-item-btn">Ochish</span>
                                            <span className="pos-hold-item-cancel" onClick={e => { e.stopPropagation(); setConfirmCancel({ id: s.id, referenceNo: s.referenceNo }) }}>✕</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className={`pos-right${activeTab === 'panel' ? ' pos-tab-visible' : ''}`}>
                        <div className="pos-right-body">

                            {/* Mijoz */}
                            {/* Mijoz */}
                            <div className="pos-fg">
                                <div className="pos-sec-label">
                                    Mijoz
                                    <span className="pos-sec-link" onClick={() => setCreateModal('customer')}>Yaratish</span>
                                </div>
                                <SearchSelect
                                    placeholder="Mijozning ismi yoki raqami"
                                    value={customerId}
                                    search={customerSearch}
                                    onSearchChange={v => { setCustomerSearch(v); setCustomerId('') }}
                                    onSelect={id => setCustomerId(id)}
                                    onClear={() => { setCustomerId(''); setCustomerSearch('') }}
                                    items={customers}
                                    getLabel={c => c.fullName || c.name || c.firstName || '—'}
                                    getSub={c => c.phone}
                                    minChars={4}
                                />
                            </div>

                            {/* Hamkor */}
                            <div className="pos-fg">
                                <div className="pos-sec-label">
                                    Hamkor
                                    <span className="pos-sec-link" onClick={() => setCreateModal('partner')}>Yaratish</span>
                                </div>
                                <SearchSelect
                                    placeholder="Hamkor nomi yoki raqami"
                                    value={partnerId}
                                    search={partnerSearch}
                                    onSearchChange={v => { setPartnerSearch(v); setPartnerId('') }}
                                    onSelect={id => setPartnerId(id)}
                                    onClear={() => { setPartnerId(''); setPartnerSearch('') }}
                                    items={partners}
                                    getLabel={p => p.name || '—'}
                                    getSub={p => p.phone}
                                    minChars={4}
                                />
                            </div>

                            {/* Chegirma */}
                            <div className="pos-fg">
                                <div className="pos-sec-label">
                                    Chegirma
                                    <span className="pos-sec-link" onClick={() => {}}>Kodni kiritish</span>
                                </div>
                                <div className="pos-disc-row">
                                    <input className="pos-disc-input" type="text" inputMode="numeric"
                                           placeholder="Chegirmani kiriting"
                                           value={discountValue}
                                           onChange={e => setDiscountValue(e.target.value.replace(/\D/g, ''))} />
                                    <div className="pos-disc-type">
                                        <button className={discountType === 'PERCENT' ? 'on' : ''} onClick={() => setDiscountType('PERCENT')}>%</button>
                                        <button className={discountType === 'FIXED' ? 'on' : ''} onClick={() => setDiscountType('FIXED')}>UZS</button>
                                    </div>
                                </div>
                                <div className="pos-quick">
                                    {QUICK_DISCOUNTS.map(d => (
                                        <button key={d} onClick={() => { setDiscountType('PERCENT'); setDiscountValue(String(d)) }}>{d}%</button>
                                    ))}
                                </div>
                            </div>

                            {/* Eslatma */}
                            {!showNotes
                                ? <button className="pos-note-btn" onClick={() => setShowNotes(true)}><Plus size={14} /> Eslatma qo'shish</button>
                                : <div className="pos-fg">
                                    <div className="pos-sec-label">Eslatma</div>
                                    <textarea className="pos-input" rows={2} placeholder="Izoh..." value={notes} onChange={e => setNotes(e.target.value)} />
                                </div>
                            }
                        </div>

                        {/* ── Jami + To'lash ── */}
                        <div className="pos-totals">
                            <div className="pos-tot-row">
                                <span>Oraliq jami</span>
                                <span style={{ fontWeight: 600 }}>{fmt(subtotal)} UZS</span>
                            </div>
                            <div className="pos-tot-row">
                                <span>Chegirma</span>
                                <span style={{ fontWeight: 600 }}>{discountAmount > 0 ? `-${fmt(discountAmount)}` : '0'} UZS</span>
                            </div>
                            <button className="pos-pay-btn" onClick={handlePay} disabled={!cart.length || saving}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontWeight: 700 }}>TO'LASH</span>
                                    <span style={{ background: 'rgba(255,255,255,.2)', borderRadius: 4, padding: '2px 8px', fontSize: 12 }}>L</span>
                                </div>
                                <span style={{ fontWeight: 800, fontSize: 18 }}>{fmt(totalAmount)} UZS</span>
                            </button>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button className="pos-hold-btn" onClick={handleHold} disabled={!cart.length || saving} style={{ flex: 1 }}>
                                    Kechiktirish <span className="pos-kbd">O</span>
                                </button>
                                <button className={`pos-hold-count-btn${holdSales.length > 0 ? ' has-items' : ''}`}
                                        onClick={() => { loadHoldSales(); setShowHoldList(true) }}>
                                    {holdSales.length}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>



                {/* ── Price Info Popover (fixed position — overflow muammosini hal qiladi) ── */}
                {priceInfoId && (() => {
                    const item = cart.find(c => c.productUnitId === priceInfoId)
                    if (!item) return null
                    return (
                        <div data-price-info
                             style={{ position: 'fixed', top: pricePopoverPos.top, left: pricePopoverPos.left, transform: 'translate(-100%, -100%)', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', padding: '10px 14px', minWidth: 170, zIndex: 9999, whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>Narx ma'lumoti</div>
                            {isAdmin && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12, marginBottom: 5 }}>
                                    <span style={{ color: '#64748b' }}>Tannarx</span>
                                    <b style={{ color: '#0f172a' }}>{fmt(item.costPrice)} so'm</b>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }}>
                                <span style={{ color: '#64748b' }}>Min narx</span>
                                <b style={{ color: '#ef4444' }}>{fmt(item.minPrice)} so'm</b>
                            </div>
                        </div>
                    )
                })()}

                {/* ── Mobile Tab Bar ── */}
                <div className="pos-tab-bar">
                    <button className={`pos-tab-btn${activeTab === 'cart' ? ' pos-tab-active' : ''}`} onClick={() => setActiveTab('cart')}>
                        <ShoppingCart size={20} />
                        <span>Savatcha</span>
                        {cart.length > 0 && <span className="pos-tab-badge">{cart.length}</span>}
                    </button>
                    <button className={`pos-tab-btn${activeTab === 'panel' ? ' pos-tab-active' : ''}`} onClick={() => setActiveTab('panel')}>
                        <CreditCard size={20} />
                        <span>To'lov</span>
                    </button>
                </div>
            </div>
            {showPayment && currentSale?.id && <PaymentModal sale={{ ...currentSale, customerId: customerId ? Number(customerId) : null }} onClose={() => setShowPayment(false)} onCompleted={(s) => { setShowPayment(false); setCompletedSale(s); clearCart() }} />}
            {completedSale && <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />}
        </>
    )
}