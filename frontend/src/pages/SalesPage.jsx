import { useState, useEffect, useCallback } from 'react'
import ReactDOM from 'react-dom'
import {
    ShoppingBag, Search, Filter, RotateCcw, Eye, CornerUpLeft,
    XCircle, Loader2, ChevronLeft, ChevronRight,
    TrendingUp, CreditCard, Banknote, Smartphone, Clock,
    CheckCircle, AlertCircle, Download, X,
    User, Package, Printer, ReceiptText, FileSpreadsheet
} from 'lucide-react'
import { salesApi } from '../api/sales'
import api from '../api/api'
import { useAuth } from '../context/AuthContext'
import { exportToCSV, exportToPDF, fmtNum, fmtDateTime as fmtDT } from '../utils/exportUtils'
import '../styles/ProductsPage.css'
import '../styles/SalesPage.css'

// ── Yordamchi funksiyalar ────────────────────────────────────────
const fmt = (num) =>
    num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const fmtDate = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const fmtDateShort = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('ru-RU')
}

// ── Status konfiguratsiyasi ──────────────────────────────────────
const STATUS_MAP = {
    COMPLETED: { label: 'Yakunlangan', color: '#16a34a', bg: 'rgba(22,163,74,0.1)',  icon: CheckCircle },
    CANCELLED:  { label: 'Bekor',       color: '#dc2626', bg: 'rgba(220,38,38,0.1)',  icon: XCircle     },
    RETURNED:   { label: 'Qaytarilgan', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)', icon: CornerUpLeft },
    DRAFT:      { label: 'Qoralama',    color: '#64748b', bg: 'rgba(100,116,139,0.1)',icon: Clock       },
    HOLD:       { label: 'Kutmoqda',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', icon: Clock       },
}

// ── To'lov usuli konfiguratsiyasi ────────────────────────────────
const PAYMENT_MAP = {
    CASH:     { label: 'Naqd',     icon: Banknote,    color: '#16a34a' },
    CARD:     { label: 'Karta',    icon: CreditCard,  color: '#2563eb' },
    TRANSFER: { label: "O'tkazma", icon: Smartphone,  color: '#7c3aed' },
    DEBT:     { label: 'Nasiya',   icon: Clock,       color: '#f59e0b' },
}

// ── Tezkor sana filterlari ───────────────────────────────────────
const getDateRange = (key) => {
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`

    switch (key) {
        case 'today': {
            const t = fmt(now)
            return { from: t + 'T00:00:00', to: t + 'T23:59:59' }
        }
        case 'yesterday': {
            const y = new Date(now); y.setDate(y.getDate()-1)
            const t = fmt(y)
            return { from: t + 'T00:00:00', to: t + 'T23:59:59' }
        }
        case 'week': {
            const w = new Date(now); w.setDate(w.getDate()-6)
            return { from: fmt(w) + 'T00:00:00', to: fmt(now) + 'T23:59:59' }
        }
        case 'month': {
            const m = new Date(now.getFullYear(), now.getMonth(), 1)
            return { from: fmt(m) + 'T00:00:00', to: fmt(now) + 'T23:59:59' }
        }
        default: return { from: '', to: '' }
    }
}

// ── StatusBadge komponenti ───────────────────────────────────────
const StatusBadge = ({ status }) => {
    const s = STATUS_MAP[status] || { label: status, color: '#64748b', bg: '#f1f5f9' }
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
            color: s.color, background: s.bg, whiteSpace: 'nowrap'
        }}>
            {s.label}
        </span>
    )
}

// ── PaymentBadges komponenti ─────────────────────────────────────
const PaymentBadges = ({ payments }) => {
    if (!payments?.length) return <span className="cell-muted">—</span>
    return (
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {payments.map((p, i) => {
                const pm = PAYMENT_MAP[p.paymentMethod] || {}
                return (
                    <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                        color: pm.color || '#64748b',
                        background: pm.color ? pm.color + '18' : '#f1f5f9',
                        whiteSpace: 'nowrap'
                    }}>
                        {pm.label || p.paymentMethod}
                    </span>
                )
            })}
        </div>
    )
}

// ════════════════════════════════════════════════════════════════
// SaleDetailModal
// ════════════════════════════════════════════════════════════════
function SaleDetailModal({ sale, onClose, onReturn, onCancel, onPrev, onNext, hasPermission }) {
    const returnedItems = (sale.items || []).filter(i => Number(i.returnedQuantity || 0) > 0)
    const totalReturnedAmount = returnedItems.reduce(
        (s, i) => s + Math.round(Number(i.salePrice) * Number(i.returnedQuantity || 0)), 0
    )
    const hasReturnableItems = (sale.items || []).some(
        i => Number(i.returnedQuantity || 0) < Number(i.quantity)
    )
    const canReturn = sale.status === 'COMPLETED' && hasReturnableItems && hasPermission('SALES_RETURN')
    const canCancel = (sale.status === 'DRAFT' || sale.status === 'HOLD') && hasPermission('SALES_CANCEL')

    // PDF chek (jsPDF CDN orqali)
    const printReceipt = () => {
        const win = window.open('', '_blank', 'width=400,height=700')
        const dp = (sale.payments || []).find(p => p.paymentMethod === 'DEBT')
        win.document.write(`<!DOCTYPE html><html><head><title>Chek - ${sale.referenceNo}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; background: #fff; padding: 4mm; padding-bottom: 30mm; width: 72mm; }
            .center { text-align: center; }
            .bold { font-weight: 700; }
            .store { text-align: center; font-size: 16px; font-weight: 900; letter-spacing: 2px; margin-bottom: 2px; }
            .subtitle { text-align: center; font-size: 10px; letter-spacing: 1px; margin-bottom: 6px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .divider-double { border-top: 2px solid #000; margin: 7px 0; }
            .meta { font-size: 11px; margin-bottom: 4px; }
            .meta-row { display: flex; justify-content: space-between; padding: 1px 0; }
            .section-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 4px 0 5px; }
            .item { margin-bottom: 6px; }
            .item-name { font-weight: 600; font-size: 12px; }
            .item-row { display: flex; justify-content: space-between; font-size: 11px; }
            .total-row { display: flex; justify-content: space-between; font-size: 17px; font-weight: 900; margin: 2px 0; }
            .payment-row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
            .discount-row { display: flex; justify-content: space-between; font-size: 12px; }
            .debt-block { margin: 7px 0; padding: 8px 10px; border: 1.5px solid #000; }
            .debt-title { text-align: center; font-weight: 800; font-size: 13px; letter-spacing: 1px; margin-bottom: 5px; }
            .debt-row { display: flex; justify-content: space-between; font-size: 11px; padding: 1px 0; }
            .thanks { text-align: center; font-size: 11px; margin-top: 4px; }
            @page { size: 80mm auto; margin: 0; }
        </style></head><body>
        <div class="store">PrimeStroy</div>
        <div class="subtitle">SOTUV CHEKI</div>
        <div class="divider-double"></div>
        <div class="meta">
            <div class="meta-row"><span>Chek</span><b>${sale.referenceNo}</b></div>
            <div class="meta-row"><span>Sana</span><span>${new Date(sale.completedAt || sale.createdAt).toLocaleString('ru-RU')}</span></div>
            <div class="meta-row"><span>Kassir</span><span>${sale.cashierName || sale.sellerName || '—'}</span></div>
            ${sale.customerName ? `<div class="meta-row"><span>Mijoz</span><b>${sale.customerName}</b></div>` : ''}
        </div>
        <div class="divider"></div>
        <div class="section-label">TOVARLAR</div>
        ${(sale.items || []).map(item => `
            <div class="item">
                <div class="item-name">${item.productName} (${item.unitSymbol})</div>
                <div class="item-row"><span>${item.quantity} × ${fmt(item.salePrice)} so'm</span><b>${fmt(item.totalPrice)} so'm</b></div>
            </div>
        `).join('')}
        ${sale.discountAmount > 0 ? `<div class="divider"></div><div class="discount-row"><span>Chegirma</span><span>−${fmt(sale.discountAmount)} so'm</span></div>` : ''}
        <div class="divider-double"></div>
        <div class="total-row"><span>JAMI</span><span>${fmt(sale.totalAmount)} so'm</span></div>
        <div class="divider-double"></div>
        <div class="section-label">TO'LOV</div>
        ${(sale.payments || []).map(p => `
            <div class="payment-row"><span>${PAYMENT_MAP[p.paymentMethod]?.label || p.paymentMethod}</span><b>${fmt(p.amount)} so'm</b></div>
        `).join('')}
        ${sale.changeAmount > 0 ? `<div class="payment-row"><span>Qaytim</span><span>${fmt(sale.changeAmount)} so'm</span></div>` : ''}
        ${sale.debtAmount > 0 ? `
            <div class="divider"></div>
            <div class="debt-block">
                <div class="debt-title">⚠ NASIYA YOZUVI</div>
                ${sale.customerName ? `<div class="debt-row"><span>Mijoz</span><b>${sale.customerName}</b></div>` : ''}
                <div class="debt-row"><span>Summa</span><b>${fmt(sale.debtAmount)} so'm</b></div>
                ${dp?.dueDate ? `<div class="debt-row"><span>Muddat</span><b>${new Date(dp.dueDate + 'T00:00:00').toLocaleDateString('ru-RU')}</b></div>` : ''}
            </div>
        ` : ''}
        <div class="divider-double"></div>
        <div class="thanks">Xaridingiz uchun rahmat!</div>
        <div style="height:40mm;line-height:40mm;">&nbsp;</div>
        </body></html>`)
        win.document.close()
        win.focus()
        setTimeout(() => { win.print(); win.close() }, 300)
    }

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box sale-detail-modal" style={{ maxWidth: 720 }}>
                {/* Header */}
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg,#eff6ff,#dbeafe)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#2563eb'
                        }}>
                            <ReceiptText size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">Sotuv #{sale.referenceNo}</h3>
                            <p className="modal-subtitle">{fmtDate(sale.completedAt || sale.createdAt)}</p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <StatusBadge status={sale.status} />
                        {onPrev && (
                            <button className="modal-close-btn" onClick={onPrev} title="Oldingi sotuv"
                                    style={{ fontSize: 18, fontWeight: 700 }}>‹</button>
                        )}
                        {onNext && (
                            <button className="modal-close-btn" onClick={onNext} title="Keyingi sotuv"
                                    style={{ fontSize: 18, fontWeight: 700 }}>›</button>
                        )}
                        <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                    </div>
                </div>

                <div className="modal-body" style={{ gap: 16 }}>

                    {/* Meta ma'lumotlar */}
                    <div className="sale-meta-grid">
                        <div className="sale-meta-item">
                            <span className="sale-meta-label">Kassir</span>
                            <span className="sale-meta-value">{sale.cashierName || sale.sellerName || '—'}</span>
                        </div>
                        <div className="sale-meta-item">
                            <span className="sale-meta-label">Mijoz</span>
                            <span className="sale-meta-value">{sale.customerName || '—'}</span>
                        </div>
                        <div className="sale-meta-item">
                            <span className="sale-meta-label">Hamkor</span>
                            <span className="sale-meta-value">{sale.partnerName || '—'}</span>
                        </div>
                        <div className="sale-meta-item">
                            <span className="sale-meta-label">Ombor</span>
                            <span className="sale-meta-value">{sale.warehouseName || '—'}</span>
                        </div>
                        {sale.shiftId && (
                            <div className="sale-meta-item">
                                <span className="sale-meta-label">Smena</span>
                                <span className="sale-meta-value">#{sale.shiftId}</span>
                            </div>
                        )}
                    </div>

                    {/* Mahsulotlar jadvali */}
                    <div className="sale-section">
                        <div className="sale-section-title">
                            <Package size={14} /> Mahsulotlar ({sale.items?.length || 0} ta)
                        </div>
                        <div className="sale-items-table-wrapper table-responsive">
                            <table className="ptable" style={{ fontSize: 13 }}>
                                <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Mahsulot</th>
                                    <th className="th-right">Narx</th>
                                    <th className="th-center">Miqdor</th>
                                    <th className="th-right">Chegirma</th>
                                    <th className="th-right">Jami</th>
                                </tr>
                                </thead>
                                <tbody>
                                {(sale.items || []).map((item, i) => (
                                    <tr key={item.id}>
                                        <td className="cell-num">{i + 1}</td>
                                        <td>
                                            <div className="cell-name">{item.productName}</div>
                                            <div className="cell-muted" style={{ fontSize: 11 }}>{item.warehouseName}</div>
                                        </td>
                                        <td className="th-right cell-price">{fmt(item.salePrice)} UZS</td>
                                        <td className="th-center">
                                            {item.quantity} <span className="cell-muted">{item.unitSymbol}</span>
                                            {Number(item.returnedQuantity || 0) > 0 && (
                                                <div className="sale-item-returned">
                                                    -{item.returnedQuantity} qaytarildi
                                                </div>
                                            )}
                                        </td>
                                        <td className="th-right">
                                            {item.discountAmount > 0
                                                ? <span style={{ color: '#dc2626' }}>-{fmt(item.discountAmount)}</span>
                                                : <span className="cell-muted">—</span>
                                            }
                                        </td>
                                        <td className="th-right cell-price" style={{ fontWeight: 700 }}>
                                            {fmt(item.totalPrice)} UZS
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="sale-items-cards">
                            {(sale.items || []).map((item, i) => (
                                <div key={item.id} className="sale-item-card">
                                    <div className="sale-item-card-left">
                                        <div className="sale-item-card-name">{item.productName}</div>
                                        <div className="sale-item-card-meta">
                                            {item.quantity} {item.unitSymbol} × {fmt(item.salePrice)} UZS
                                            {item.discountAmount > 0 && <span style={{ color: '#dc2626' }}> · -{fmt(item.discountAmount)}</span>}
                                            {Number(item.returnedQuantity || 0) > 0 && (
                                                <span className="sale-item-returned" style={{ display: 'inline', marginLeft: 6 }}>-{item.returnedQuantity} qaytarildi</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="sale-item-card-right">
                                        <div className="sale-item-card-total">{fmt(item.totalPrice)} UZS</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* To'lov breakdown */}
                    <div className="sale-payment-breakdown">
                        <div className="sale-totals">
                            <div className="sale-total-row">
                                <span>Subtotal</span>
                                <span>{fmt(sale.subtotal)} UZS</span>
                            </div>
                            {sale.discountAmount > 0 && (
                                <div className="sale-total-row" style={{ color: '#dc2626' }}>
                                    <span>Chegirma</span>
                                    <span>-{fmt(sale.discountAmount)} UZS</span>
                                </div>
                            )}
                            <div className="sale-total-row sale-total-main">
                                <span>JAMI</span>
                                <span>{fmt(sale.totalAmount)} UZS</span>
                            </div>
                        </div>

                        <div className="sale-payments">
                            <div className="sale-section-title" style={{ marginBottom: 10 }}>
                                <CreditCard size={14} /> To'lov usullari
                            </div>
                            {(sale.payments || []).map((p, i) => {
                                const pm = PAYMENT_MAP[p.paymentMethod] || {}
                                return (
                                    <div key={i} className="sale-payment-row">
                                        <span style={{ color: pm.color, fontWeight: 600 }}>
                                            {pm.label || p.paymentMethod}
                                        </span>
                                        <span style={{ fontWeight: 700 }}>{fmt(p.amount)} UZS</span>
                                    </div>
                                )
                            })}
                            {sale.changeAmount > 0 && (
                                <div className="sale-payment-row" style={{ color: '#16a34a' }}>
                                    <span>Qaytim</span>
                                    <span style={{ fontWeight: 700 }}>{fmt(sale.changeAmount)} UZS</span>
                                </div>
                            )}
                            {/* Nasiya holati */}
                            {sale.debtAmount > 0 && (
                                <div className="sale-debt-info">
                                    <AlertCircle size={14} color="#f59e0b" />
                                    <span>Nasiya: <strong>{fmt(sale.debtAmount)} UZS</strong></span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Qaytarishlar bloki */}
                    {returnedItems.length > 0 && (
                        <div className="sale-return-block">
                            <div className="sale-section-title">
                                <CornerUpLeft size={14} /> Qaytarilgan mahsulotlar
                            </div>
                            <div className="sale-return-list">
                                {returnedItems.map(item => (
                                    <div key={item.id} className="sale-return-row">
                                        <span className="sale-return-name">{item.productName}</span>
                                        <span className="sale-return-qty">
                                            {item.returnedQuantity} {item.unitSymbol}
                                        </span>
                                        <span className="sale-return-sum">
                                            -{fmt(Math.round(Number(item.salePrice) * Number(item.returnedQuantity)))} UZS
                                        </span>
                                    </div>
                                ))}
                                <div className="sale-return-total">
                                    <span>Jami qaytarildi</span>
                                    <span>-{fmt(totalReturnedAmount)} UZS</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Izohlar (sale_notes jadvalidan) */}
                    {sale.saleNotes?.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {sale.saleNotes.map(n => {
                                const isReject = n.message.startsWith('↩')
                                return (
                                    <div key={n.id} style={{
                                        padding: '10px 14px',
                                        background: isReject ? '#fef2f2' : 'var(--surface-secondary)',
                                        borderRadius: 8, fontSize: 13,
                                        border: isReject ? '1px solid #fecaca' : 'none',
                                        display: 'flex', flexDirection: 'column', gap: 4
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <span>{isReject ? '↩' : '📝'}</span>
                                            <span style={{ fontWeight: 600, color: isReject ? '#dc2626' : 'var(--text-primary)' }}>
                                                {n.senderName}
                                            </span>
                                            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                                                {n.createdAt && new Date(n.createdAt).toLocaleString('ru-RU')}
                                            </span>
                                        </div>
                                        <div style={{ paddingLeft: 22, color: isReject ? '#dc2626' : 'var(--text-secondary)' }}>
                                            {n.message.replace('↩ Rad etildi: ', '').replace('↩ Rad etildi', '').trim() || n.message}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn-cancel" style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={printReceipt}>
                            <Printer size={15} /> Chek
                        </button>
                        {canReturn && (
                            <button className="btn-cancel" style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                color: '#7c3aed', borderColor: '#7c3aed'
                            }} onClick={() => onReturn(sale)}>
                                <CornerUpLeft size={15} /> Qaytarish
                            </button>
                        )}
                        {canCancel && (
                            <button className="btn-cancel" style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                color: '#dc2626', borderColor: '#dc2626'
                            }} onClick={() => onCancel(sale.id)}>
                                <XCircle size={15} /> Bekor qilish
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
// ReturnModal
// ════════════════════════════════════════════════════════════════
function ReturnModal({ sale, onClose, onDone }) {
    const [items, setItems] = useState(
        (sale.items || [])
            .map(i => {
                const returned = Number(i.returnedQuantity || 0)
                const remaining = Number(i.quantity) - returned
                return { ...i, returned, remaining, checked: false, returnQty: remaining }
            })
            .filter(i => i.remaining > 0) // to'liq qaytarilganlarni ko'rsatma
    )
    const [reason, setReason] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')

    const toggle = (id) => setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i))
    const setQty = (id, val) => setItems(prev => prev.map(i => i.id === id ? { ...i, returnQty: val } : i))

    const checkedItems = items.filter(i => i.checked)
    const totalReturn = checkedItems.reduce((s, i) => s + Number(i.salePrice) * Number(i.returnQty), 0)

    const handleSubmit = async () => {
        if (!checkedItems.length) { setError('Kamida bitta mahsulot tanlang'); return }
        for (const i of checkedItems) {
            if (!i.returnQty || Number(i.returnQty) <= 0) { setError('Miqdor 0 dan katta bo\'lishi kerak'); return }
            if (Number(i.returnQty) > i.remaining) { setError(`"${i.productName}" uchun qaytarish mumkin: ${i.remaining} ${i.unitSymbol}`); return }
        }
        setSaving(true); setError('')
        try {
            await salesApi.returnSale(sale.id, {
                items: checkedItems.map(i => ({ saleItemId: i.id, quantity: Number(i.returnQty) })),
                reason
            })
            onDone()
        } catch (e) {
            setError(e.response?.data?.message || 'Xatolik yuz berdi')
        } finally {
            setSaving(false)
        }
    }

    return ReactDOM.createPortal(
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box" style={{ maxWidth: 560 }}>
                <div className="modal-header">
                    <div className="modal-header-left">
                        <div style={{
                            width: 40, height: 40, borderRadius: 12,
                            background: 'linear-gradient(135deg,#f5f3ff,#ede9fe)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#7c3aed'
                        }}>
                            <CornerUpLeft size={20} />
                        </div>
                        <div>
                            <h3 className="modal-title">Qaytarish</h3>
                            <p className="modal-subtitle">#{sale.referenceNo}</p>
                        </div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
                        Qaytariladigan mahsulotlarni tanlang:
                    </p>

                    {items.map(item => (
                        <div key={item.id} className={`return-item ${item.checked ? 'return-item-active' : ''}`}
                             onClick={() => toggle(item.id)}>
                            <input type="checkbox" checked={item.checked} onChange={() => toggle(item.id)}
                                   onClick={e => e.stopPropagation()} style={{ marginRight: 10 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{item.productName}</div>
                                <div className="cell-muted" style={{ fontSize: 12 }}>
                                    Qaytarish mumkin: {item.remaining} {item.unitSymbol} · {fmt(item.salePrice)} UZS
                                    {item.returned > 0 && ` · allaqachon qaytarildi: ${item.returned}`}
                                </div>
                            </div>
                            {item.checked && (
                                <div onClick={e => e.stopPropagation()}>
                                    <input
                                        type="number" className="form-input-sm"
                                        style={{ width: 80, textAlign: 'right' }}
                                        min={0.001} max={item.remaining} step="any"
                                        value={item.returnQty}
                                        onChange={e => setQty(item.id, e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    ))}

                    <div>
                        <label className="form-label-sm">Sabab (ixtiyoriy)</label>
                        <textarea
                            className="form-input-sm" rows={2}
                            style={{ width: '100%', resize: 'vertical', padding: '8px 12px', height: 'auto' }}
                            placeholder="Qaytarish sababi..."
                            value={reason} onChange={e => setReason(e.target.value)}
                        />
                    </div>

                    {checkedItems.length > 0 && (
                        <div style={{
                            padding: '10px 14px', background: 'rgba(124,58,237,0.07)',
                            borderRadius: 10, fontSize: 13, color: '#7c3aed', fontWeight: 600
                        }}>
                            Qaytariladigan summa: ≈ {fmt(totalReturn)} UZS
                        </div>
                    )}

                    {error && (
                        <div style={{
                            padding: '10px 14px', background: 'var(--danger-bg)',
                            borderRadius: 8, fontSize: 13, color: 'var(--danger)'
                        }}>
                            ⚠ {error}
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Bekor</button>
                    <button className="btn-save" style={{ background: '#7c3aed' }}
                            onClick={handleSubmit} disabled={saving || !checkedItems.length}>
                        {saving ? <><Loader2 size={15} className="spin" /> Saqlanmoqda...</> : 'Qaytarishni tasdiqlash'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ════════════════════════════════════════════════════════════════
// SalesPage — Asosiy komponent
// ════════════════════════════════════════════════════════════════
export default function SalesPage() {
    const { hasPermission, user } = useAuth()
    const isAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN'

    // ── State ────────────────────────────────────────────────────
    const [sales, setSales]             = useState([])
    const [total, setTotal]             = useState(0)
    const [page, setPage]               = useState(0)
    const [size]                        = useState(20)
    const [loading, setLoading]         = useState(false)
    const [todayStats, setTodayStats]   = useState(null)
    const [statsLoading, setStatsLoading] = useState(false)

    const [filterStatus, setFilterStatus]   = useState('')
    const [filterSearch, setFilterSearch]   = useState('')
    const [filterSellerId, setFilterSellerId] = useState('')
    const todayRange = getDateRange('today')
    const [filterFrom, setFilterFrom]     = useState(todayRange.from)
    const [filterTo, setFilterTo]         = useState(todayRange.to)
    const [activeQuick, setActiveQuick]   = useState('today')

    const [employees, setEmployees]       = useState([])
    const [exportLoading, setExportLoading] = useState(false)

    const [selectedSale, setSelectedSale]   = useState(null)
    const [detailLoading, setDetailLoading] = useState(false)
    const [returnSale, setReturnSale]       = useState(null)

    const [toast, setToast] = useState(null)
    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    // ── Xodimlar ro'yxati (faqat admin/owner uchun) ─────────────
    useEffect(() => {
        if (!isAdmin) return
        api.get('/api/v1/employees', { params: { size: 100 } })
            .then(res => setEmployees(res.data.content || res.data || []))
            .catch(() => {})
    }, [isAdmin])

    // ── Bugungi statistika ───────────────────────────────────────
    const loadStats = useCallback(() => {
        if (!filterFrom || !filterTo) return
        setStatsLoading(true)
        salesApi.getStats(filterFrom, filterTo)
            .then(res => setTodayStats(res.data))
            .catch(console.error)
            .finally(() => setStatsLoading(false))
    }, [filterFrom, filterTo])  // ← filterFrom, filterTo ga bog'liq

    useEffect(() => { loadStats() }, [loadStats])

    // ── Sotuvlar ro'yxati ────────────────────────────────────────
    const load = useCallback(() => {
        setLoading(true)
        salesApi.getHistory({
            page, size,
            status:   filterStatus    || undefined,
            sellerId: filterSellerId  || undefined,
            from:     filterFrom      || undefined,
            to:       filterTo        || undefined,
        })
            .then(res => {
                setSales(res.data.content || [])
                setTotal(res.data.totalElements || 0)
            })
            .catch(console.error)
            .finally(() => setLoading(false))
    }, [page, size, filterStatus, filterSellerId, filterFrom, filterTo])

    useEffect(() => { load() }, [load])

    // ── Tezkor sana filterlari ───────────────────────────────────
    const applyQuick = (key) => {
        setActiveQuick(key)
        const range = getDateRange(key)
        setFilterFrom(range.from)
        setFilterTo(range.to)
        setPage(0)
    }

    const handleReset = () => {
        setFilterStatus('')
        setFilterSearch('')
        setFilterSellerId('')
        const range = getDateRange('today')
        setFilterFrom(range.from)
        setFilterTo(range.to)
        setActiveQuick('today')
        setPage(0)
    }

    // ── Excel export ─────────────────────────────────────────────
    const handleExport = async (format = 'csv') => {
        setExportLoading(true)
        try {
            const res = await salesApi.getHistory({
                page: 0, size: 1000,
                status:   filterStatus   || undefined,
                sellerId: filterSellerId || undefined,
                from:     filterFrom     || undefined,
                to:       filterTo       || undefined,
            })
            const rows = res.data.content || []

            const headers = ['#', 'Chek raqami', 'Sana', 'Kassir', 'Mijoz', 'Summa', "To'lov", 'Status']
            const data = rows.map((s, i) => [
                i + 1,
                s.referenceNo || '',
                fmtDT(s.completedAt || s.createdAt),
                s.cashierName || s.sellerName || '',
                s.customerName || '',
                fmtNum(s.totalAmount) + ' UZS',
                (s.payments || []).map(p => PAYMENT_MAP[p.paymentMethod]?.label || p.paymentMethod).join('+'),
                STATUS_MAP[s.status]?.label || s.status
            ])

            const filename = `sotuvlar_${filterFrom?.slice(0,10) || 'barchasi'}`
            const totalSum = rows.reduce((s, r) => s + Number(r.totalAmount || 0), 0)
            const subtitle = `${filterFrom?.slice(0,10) || ''}${filterTo ? ' — ' + filterTo.slice(0,10) : ''}`

            if (format === 'pdf') {
                await exportToPDF({
                    filename, title: 'Sotuvlar hisoboti', subtitle, headers, rows: data,
                    summary: [
                        { label: 'Jami sotuvlar', value: rows.length + ' ta' },
                        { label: 'Jami summa', value: fmtNum(totalSum) + ' UZS' },
                    ]
                })
            } else {
                exportToCSV(filename, headers, data)
            }
        } catch (e) {
            showToast('Export xatosi', 'error')
        } finally {
            setExportLoading(false)
        }
    }

    // ── Qidirish (client-side, referenceNo va mijoz nomi) ────────
    const filtered = filterSearch
        ? sales.filter(s =>
            s.referenceNo?.toLowerCase().includes(filterSearch.toLowerCase()) ||
            s.customerName?.toLowerCase().includes(filterSearch.toLowerCase()) ||
            s.sellerName?.toLowerCase().includes(filterSearch.toLowerCase())
        )
        : sales

    const totalPages = Math.ceil(total / size)

    // ── Detail ko'rish ───────────────────────────────────────────
    const openDetail = async (id) => {
        setDetailLoading(true)
        try {
            const res = await salesApi.getById(id)
            setSelectedSale(res.data)
        } catch (e) {
            showToast('Sotuv ma\'lumotlarini yuklashda xatolik', 'error')
        } finally {
            setDetailLoading(false)
        }
    }

    // ── Bekor qilish ─────────────────────────────────────────────
    const handleCancel = async (id) => {
        if (!confirm('Bu sotuvni bekor qilishni tasdiqlaysizmi?')) return
        try {
            await salesApi.cancel(id)
            setSelectedSale(null)
            load(); loadStats()
            showToast('Sotuv bekor qilindi')
        } catch (e) {
            showToast(e.response?.data?.message || 'Xatolik', 'error')
        }
    }

    // ── Qaytarish ────────────────────────────────────────────────
    const handleReturnDone = () => {
        setReturnSale(null)
        setSelectedSale(null)
        load(); loadStats()
        showToast('Qaytarish muvaffaqiyatli amalga oshirildi')
    }

    // ── Keyboard Esc ─────────────────────────────────────────────
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') { setSelectedSale(null); setReturnSale(null) } }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [])

    // ════════════════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════════════════
    return (
        <div className="products-wrapper">

            {/* ── Header ─────────────────────────────────────── */}
            <div className="products-header">
                <div className="products-header-left">
                    <div className="page-icon-wrap">
                        <ShoppingBag size={22} />
                    </div>
                    <div>
                        <h1 className="page-title">
                            Sotuvlar
                            <span className="page-count">({total})</span>
                        </h1>
                        <p className="page-subtitle">Sotuv tarixi va hisobot</p>
                    </div>
                </div>
            </div>

            {/* ── Bugungi statistika paneli ───────────────────── */}
            <div className="sales-stats-grid">
                <StatCard
                    label="Jami sotuv"
                    value={todayStats ? `${fmt(todayStats.totalAmount)} UZS` : '—'}
                    sub={todayStats ? `${todayStats.saleCount} ta · ${todayStats.cancelledCount} bekor` : ''}
                    icon={TrendingUp}
                    color="#2563eb"
                    loading={statsLoading}
                />
                <StatCard
                    label="Naqd"
                    value={todayStats ? `${fmt(todayStats.totalCash)} UZS` : '—'}
                    icon={Banknote}
                    color="#16a34a"
                    loading={statsLoading}
                />
                <StatCard
                    label="Karta"
                    value={todayStats ? `${fmt(todayStats.totalCard)} UZS` : '—'}
                    icon={CreditCard}
                    color="#7c3aed"
                    loading={statsLoading}
                />
                <StatCard
                    label="O'tkazma"
                    value={todayStats ? `${fmt(todayStats.totalTransfer)} UZS` : '—'}
                    icon={Smartphone}
                    color="#0891b2"
                    loading={statsLoading}
                />
                <StatCard
                    label="Nasiya"
                    value={todayStats ? `${fmt(todayStats.totalDebt)} UZS` : '—'}
                    icon={Clock}
                    color="#f59e0b"
                    loading={statsLoading}
                />
                <StatCard
                    label="Qaytarilgan"
                    value={todayStats ? `${fmt(todayStats.returnedAmount)} UZS` : '—'}
                    sub={todayStats && todayStats.returnedCount > 0 ? `${todayStats.returnedCount} ta sotuv` : ''}
                    icon={CornerUpLeft}
                    color="#dc2626"
                    loading={statsLoading}
                />
            </div>

            {/* ── Tezkor sana tugmalari ───────────────────────── */}
            <div className="quick-date-bar">
                {[
                    { key: 'today',     label: 'Bugun'    },
                    { key: 'yesterday', label: 'Kecha'    },
                    { key: 'week',      label: 'Bu hafta' },
                    { key: 'month',     label: 'Bu oy'    },
                ].map(q => (
                    <button key={q.key}
                            className={`btn-outline${activeQuick === q.key ? ' active' : ''}`}
                            onClick={() => applyQuick(q.key)}>
                        {q.label}
                    </button>
                ))}
            </div>

            {/* ── Filter bar ──────────────────────────────────── */}
            <div className="filter-bar">
                {/* Qidiruv */}
                <div className="filter-search-wrap">
                    <Search size={16} className="filter-search-icon" />
                    <input
                        className="filter-search"
                        placeholder="Chek raqami, mijoz, kassir..."
                        value={filterSearch}
                        onChange={e => setFilterSearch(e.target.value)}
                    />
                </div>

                {/* Status */}
                <div className="filter-select-wrap">
                    <Filter size={14} className="filter-select-icon" />
                    <select className="filter-select" value={filterStatus}
                            onChange={e => { setFilterStatus(e.target.value); setPage(0) }}>
                        <option value="">Barcha statuslar</option>
                        <option value="COMPLETED">Yakunlangan</option>
                        <option value="CANCELLED">Bekor qilingan</option>
                        <option value="RETURNED">Qaytarilgan</option>
                        <option value="HOLD">Kutmoqda</option>
                        <option value="DRAFT">Qoralama</option>
                    </select>
                </div>

                {/* Kassir */}
                <div className="filter-select-wrap">
                    <User size={14} className="filter-select-icon" />
                    <select className="filter-select" value={filterSellerId}
                            onChange={e => { setFilterSellerId(e.target.value); setPage(0) }}>
                        <option value="">Barcha kassirlar</option>
                        {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.fullName}</option>
                        ))}
                    </select>
                </div>

                {/* Sana dan */}
                <div style={{ position: 'relative' }}>
                    <input type="datetime-local" className="filter-search"
                           style={{ minWidth: 180, paddingLeft: 12 }}
                           value={filterFrom.slice(0, 16)}
                           onChange={e => { setFilterFrom(e.target.value + ':00'); setActiveQuick(''); setPage(0) }} />
                </div>

                {/* Sana gacha */}
                <div style={{ position: 'relative' }}>
                    <input type="datetime-local" className="filter-search"
                           style={{ minWidth: 180, paddingLeft: 12 }}
                           value={filterTo.slice(0, 16)}
                           onChange={e => { setFilterTo(e.target.value + ':59'); setActiveQuick(''); setPage(0) }} />
                </div>

                {/* Reset */}
                <button className="btn-reset" onClick={handleReset}>
                    <RotateCcw size={14} /> Tozalash
                </button>

                {/* Export */}
                <button className="btn-reset" onClick={() => handleExport('csv')} disabled={exportLoading}
                        style={{ color: '#16a34a', borderColor: '#16a34a' }}>
                    {exportLoading
                        ? <><Loader2 size={14} className="spin" /> ...</>
                        : <><FileSpreadsheet size={14} /> Excel</>
                    }
                </button>
                <button className="btn-reset" onClick={() => handleExport('pdf')} disabled={exportLoading}
                        style={{ color: '#dc2626', borderColor: '#dc2626' }}>
                    <Download size={14} /> PDF
                </button>
            </div>

            {/* ── Jadval ──────────────────────────────────────── */}
            <div className="table-card">
                {loading ? (
                    <div className="table-loading">
                        <Loader2 size={28} className="spin" />
                        <p>Yuklanmoqda...</p>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="table-empty">
                        <ShoppingBag size={40} strokeWidth={1} />
                        <p>Sotuvlar topilmadi</p>
                    </div>
                ) : (
                    <>
                    <div className="sales-table-wrapper">
                    <div className="table-responsive">
                        <table className="ptable sales-ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Chek raqami</th>
                                <th>Sana</th>
                                <th>Kassir</th>
                                <th>Mijoz</th>
                                <th className="th-center">To'lov</th>
                                <th className="th-right">Summa</th>
                                <th className="th-center">Status</th>
                                <th className="th-center">Amallar</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filtered.map((s, i) => {
                                const rowClass = s.status === 'CANCELLED' ? 'row-cancelled'
                                    : s.status === 'RETURNED'   ? 'row-returned'
                                        : s.status === 'DRAFT'      ? 'row-draft'
                                            : s.status === 'HOLD'       ? 'row-hold'
                                                : ''
                                return (
                                    <tr key={s.id} className={rowClass} style={{ cursor: 'pointer' }}
                                        onClick={() => openDetail(s.id)}>
                                        <td className="cell-num">{page * size + i + 1}</td>
                                        <td>
                                            <span className="cell-barcode">{s.referenceNo}</span>
                                        </td>
                                        <td>
                                        <span className="cell-muted" style={{ fontSize: 12 }}>
                                            {fmtDate(s.completedAt || s.createdAt)}
                                        </span>
                                        </td>
                                        <td>
                                            <div className="cell-name" style={{ fontSize: 13 }}>
                                                {s.cashierName || s.sellerName || '—'}
                                            </div>
                                        </td>
                                        <td>
                                            {s.customerName
                                                ? <div className="cell-name" style={{ fontSize: 13 }}>{s.customerName}</div>
                                                : <span className="cell-muted">—</span>
                                            }
                                        </td>
                                        <td className="th-center" onClick={e => e.stopPropagation()}>
                                            <PaymentBadges payments={s.payments} />
                                        </td>
                                        <td className="th-right">
                                            <span className="cell-price" style={{ fontWeight: 700 }}>
                                                {fmt(s.totalAmount)}
                                            </span>
                                            <span className="cell-muted" style={{ fontSize: 11 }}> UZS</span>
                                            {(() => {
                                                const ret = (s.items||[]).reduce(
                                                    (acc, i) => acc + Math.round(Number(i.salePrice) * Number(i.returnedQuantity||0)), 0
                                                )
                                                return ret > 0
                                                    ? <div className="sale-row-returned-amount">−{fmt(ret)} UZS</div>
                                                    : null
                                            })()}
                                        </td>
                                        <td className="th-center">
                                            <StatusBadge status={s.status} />
                                            {s.status === 'COMPLETED' && (s.items||[]).some(i => Number(i.returnedQuantity||0) > 0) && (
                                                <div className="sale-partial-return-badge">Qisman qaytarilgan</div>
                                            )}
                                        </td>
                                        <td onClick={e => e.stopPropagation()}>
                                            <div className="action-group">
                                                <button
                                                    className="act-btn act-edit"
                                                    title="Ko'rish"
                                                    disabled={detailLoading}
                                                    onClick={() => openDetail(s.id)}
                                                >
                                                    {detailLoading
                                                        ? <Loader2 size={14} className="spin" />
                                                        : <Eye size={14} />
                                                    }
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                    </div>

                    <div className="sales-mobile-cards">
                        {filtered.map((s) => {
                            const st = STATUS_MAP[s.status] || {}
                            return (
                                <div key={s.id} className="sale-card" onClick={() => openDetail(s.id)}>
                                    <div className="sale-card-top">
                                        <span className="sale-card-ref">{s.referenceNo}</span>
                                        <span className="sale-card-date">{fmtDate(s.completedAt || s.createdAt)}</span>
                                    </div>
                                    <div className="sale-card-meta">
                                        <span>{s.cashierName || s.sellerName || '—'}</span>
                                        {s.customerName && <span style={{ color: 'var(--primary)' }}>{s.customerName}</span>}
                                    </div>
                                    <div className="sale-card-bottom">
                                        <div>
                                            <div className="sale-card-amount">{fmt(s.totalAmount)} UZS</div>
                                            <PaymentBadges payments={s.payments} />
                                        </div>
                                        <span style={{
                                            padding: '3px 10px', borderRadius: 20,
                                            fontSize: 12, fontWeight: 600,
                                            color: st.color, background: st.bg
                                        }}>{st.label}</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="pagination">
                        <button className="page-btn" disabled={page === 0}
                                onClick={() => setPage(p => p - 1)}>
                            <ChevronLeft size={16} />
                        </button>
                        <span className="page-info">{page + 1} / {totalPages}</span>
                        <button className="page-btn" disabled={page >= totalPages - 1}
                                onClick={() => setPage(p => p + 1)}>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── Modallar ────────────────────────────────────── */}
            {selectedSale && !returnSale && (
                <SaleDetailModal
                    sale={selectedSale}
                    onClose={() => setSelectedSale(null)}
                    onReturn={(s) => { setReturnSale(s); setSelectedSale(null) }}
                    onCancel={handleCancel}
                    hasPermission={hasPermission}
                    onPrev={() => {
                        const idx = sales.findIndex(s => s.id === selectedSale.id)
                        if (idx > 0) openDetail(sales[idx - 1].id)
                    }}
                    onNext={() => {
                        const idx = sales.findIndex(s => s.id === selectedSale.id)
                        if (idx < sales.length - 1) openDetail(sales[idx + 1].id)
                    }}
                />
            )}

            {returnSale && (
                <ReturnModal
                    sale={returnSale}
                    onClose={() => setReturnSale(null)}
                    onDone={handleReturnDone}
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

// ── StatCard yordamchi komponenti ────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, loading }) {
    return (
        <div className="stat-card">
            <div className="stat-card-icon" style={{ background: color + '18', color }}>
                <Icon size={20} />
            </div>
            <div className="stat-card-content">
                <div className="stat-card-label">{label}</div>
                {loading
                    ? <div className="stat-card-value" style={{ color: 'var(--text-muted)' }}>...</div>
                    : <div className="stat-card-value">{value}</div>
                }
                {sub && <div className="stat-card-sub">{sub}</div>}
            </div>
        </div>
    )
}