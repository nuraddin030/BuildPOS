import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ShoppingBag, ArrowLeft, CheckCircle, XCircle, CornerUpLeft,
    Loader2, AlertCircle, Package, Building2, Calendar,
    CreditCard, Clock, X, Printer, Banknote, Smartphone, User
} from 'lucide-react'
import { salesApi } from '../api/sales'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ProductsPage.css'
import '../styles/SaleDetailPage.css'

const fmt = (num) => {
    if (num == null) return '0'
    const n = Number(num)
    if (!Number.isFinite(n)) return '0'
    return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

const fmtDate = (dt) => {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString('ru-RU')
}

const fmtDateTime = (dt) => {
    if (!dt) return '—'
    const d = new Date(dt)
    return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

const STATUS_MAP = {
    COMPLETED: { label: 'Yakunlangan', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
    CANCELLED: { label: 'Bekor qilingan', color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
    RETURNED:  { label: 'Qaytarilgan', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
    DRAFT:     { label: 'Qoralama', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    HOLD:      { label: 'Kutmoqda', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

const PAYMENT_MAP = {
    CASH:     { label: 'Naqd', icon: Banknote, color: '#16a34a' },
    CARD:     { label: 'Karta', icon: CreditCard, color: '#2563eb' },
    TRANSFER: { label: "O'tkazma", icon: Smartphone, color: '#7c3aed' },
    DEBT:     { label: 'Nasiya', icon: Clock, color: '#f59e0b' },
}

export default function SaleDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { hasPermission } = useAuth()

    const [sale, setSale] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [confirmModal, setConfirmModal] = useState(null)
    const [toast, setToast] = useState(null)
    const [cancelling, setCancelling] = useState(false)

    // Return modal
    const [showReturn, setShowReturn] = useState(false)
    const [returnItems, setReturnItems] = useState([])
    const [returnReason, setReturnReason] = useState('')
    const [returnSaving, setReturnSaving] = useState(false)
    const [returnError, setReturnError] = useState('')

    const showToast = (msg, type = 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const load = () => {
        setLoading(true)
        salesApi.getById(id)
            .then(res => setSale(res.data))
            .catch(() => setError('Sotuv topilmadi'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [id])

    const handleCancel = () => {
        setConfirmModal({
            title: 'Sotuvni bekor qilish',
            message: "Bu sotuv bekor qilinadi. Davom etasizmi?",
            confirmLabel: 'Ha, bekor qilish',
            cancelLabel: "Yo'q",
            confirmClass: 'btn-danger',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(null)
                setCancelling(true)
                try {
                    await salesApi.cancel(id)
                    load()
                } catch (e) {
                    showToast(e.response?.data?.message || 'Xatolik')
                } finally { setCancelling(false) }
            }
        })
    }

    const handleOpenReturn = () => {
        setReturnItems(
            (sale.items || [])
                .map(i => {
                    const returned = Number(i.returnedQuantity || 0)
                    const remaining = Number(i.quantity) - returned
                    return { ...i, returned, remaining, checked: false, returnQty: remaining }
                })
                .filter(i => i.remaining > 0)
        )
        setReturnReason('')
        setReturnError('')
        setShowReturn(true)
    }

    const handleReturnSubmit = async () => {
        const checked = returnItems.filter(i => i.checked)
        if (!checked.length) { setReturnError('Kamida bitta mahsulot tanlang'); return }
        for (const i of checked) {
            if (!i.returnQty || Number(i.returnQty) <= 0) { setReturnError('Miqdor 0 dan katta bo\'lishi kerak'); return }
            if (Number(i.returnQty) > i.remaining) { setReturnError(`"${i.productName}" uchun qaytarish mumkin: ${i.remaining} ${i.unitSymbol}`); return }
        }
        setReturnSaving(true)
        setReturnError('')
        try {
            await salesApi.returnSale(id, {
                items: checked.map(i => ({ saleItemId: i.id, quantity: Number(i.returnQty) })),
                reason: returnReason || undefined
            })
            setShowReturn(false)
            showToast('Qaytarish muvaffaqiyatli', 'success')
            load()
        } catch (e) {
            setReturnError(e.response?.data?.message || 'Xatolik')
        } finally { setReturnSaving(false) }
    }

    const printReceipt = () => {
        if (!sale) return
        const dp = (sale.payments || []).find(p => p.paymentMethod === 'DEBT')
        const win = window.open('', '_blank', 'width=400,height=700')
        win.document.write(`<!DOCTYPE html><html><head><title>Chek - ${sale.referenceNo}</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000; background: #fff; padding: 4mm; width: 72mm; }
            .center { text-align: center; } .bold { font-weight: 700; }
            .store { text-align: center; font-size: 16px; font-weight: 900; letter-spacing: 2px; margin-bottom: 2px; }
            .subtitle { text-align: center; font-size: 10px; letter-spacing: 1px; margin-bottom: 6px; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .divider-double { border-top: 2px solid #000; margin: 7px 0; }
            .meta { font-size: 11px; margin-bottom: 4px; }
            .meta-row { display: flex; justify-content: space-between; padding: 1px 0; }
            .section-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin: 4px 0 5px; }
            .item { margin-bottom: 6px; } .item-name { font-weight: 600; font-size: 12px; }
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
        ${sale.discountAmount > 0 ? `<div class="divider"></div><div class="discount-row"><span>Chegirma</span><span>-${fmt(sale.discountAmount)} so'm</span></div>` : ''}
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
                <div class="debt-title">NASIYA YOZUVI</div>
                ${sale.customerName ? `<div class="debt-row"><span>Mijoz</span><b>${sale.customerName}</b></div>` : ''}
                <div class="debt-row"><span>Summa</span><b>${fmt(sale.debtAmount)} so'm</b></div>
                ${dp?.dueDate ? `<div class="debt-row"><span>Muddat</span><b>${new Date(dp.dueDate + 'T00:00:00').toLocaleDateString('ru-RU')}</b></div>` : ''}
            </div>
        ` : ''}
        <div class="divider-double"></div>
        <div class="thanks">Xaridingiz uchun rahmat!</div>
        </body></html>`)
        win.document.close()
        win.focus()
        setTimeout(() => { win.print(); win.close() }, 300)
    }

    if (loading) return (
        <div className="products-wrapper">
            <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
        </div>
    )

    if (error || !sale) return (
        <div className="products-wrapper">
            <div className="table-empty"><AlertCircle size={40} strokeWidth={1} /><p>{error || 'Topilmadi'}</p></div>
        </div>
    )

    const st = STATUS_MAP[sale.status] || {}
    const returnedItems = (sale.items || []).filter(i => Number(i.returnedQuantity || 0) > 0)
    const totalReturnedAmount = returnedItems.reduce(
        (s, i) => s + Math.round(Number(i.salePrice) * Number(i.returnedQuantity || 0)), 0
    )
    const hasReturnableItems = (sale.items || []).some(
        i => Number(i.returnedQuantity || 0) < Number(i.quantity)
    )
    const canReturn = sale.status === 'COMPLETED' && hasReturnableItems && hasPermission('SALES_RETURN')
    const canCancel = (sale.status === 'DRAFT' || sale.status === 'HOLD') && hasPermission('SALES_CANCEL')

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <button className="act-btn" onClick={() => navigate(-1)} style={{ marginRight: 8 }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="page-icon-wrap"><ShoppingBag size={22} /></div>
                    <div>
                        <h1 className="page-title">{sale.referenceNo}</h1>
                        <p className="page-subtitle">{sale.customerName || 'Sotuv'}</p>
                    </div>
                </div>
                <div className="sale-detail-actions">
                    <span style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        color: st.color, background: st.bg
                    }}>{st.label}</span>

                    <button className="btn-reset" onClick={printReceipt}
                            style={{ color: '#2563eb', borderColor: '#2563eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Printer size={14} /> Chek
                    </button>

                    {canReturn && (
                        <button className="btn-reset" onClick={handleOpenReturn}
                                style={{ color: '#7c3aed', borderColor: '#7c3aed', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <CornerUpLeft size={14} /> Qaytarish
                        </button>
                    )}

                    {canCancel && (
                        <button className="btn-add" style={{ background: '#ef4444' }} onClick={handleCancel} disabled={cancelling}>
                            {cancelling ? <Loader2 size={14} className="spin" /> : <XCircle size={14} />}
                            Bekor qilish
                        </button>
                    )}
                </div>
            </div>

            {/* Asosiy ma'lumotlar + Moliyaviy holat */}
            <div className="sale-detail-grid">
                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Asosiy ma'lumotlar</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <InfoRow icon={<User size={14} />} label="Kassir" value={sale.cashierName || sale.sellerName} />
                        <InfoRow icon={<User size={14} />} label="Mijoz" value={sale.customerName} />
                        <InfoRow icon={<Building2 size={14} />} label="Ombor" value={sale.warehouseName} />
                        <InfoRow icon={<Calendar size={14} />} label="Sana" value={fmtDateTime(sale.completedAt || sale.createdAt)} />
                        {sale.partnerName && <InfoRow icon={<User size={14} />} label="Hamkor" value={sale.partnerName} />}
                        {sale.notes && <InfoRow icon={<Calendar size={14} />} label="Izoh" value={sale.notes} />}
                    </div>
                </div>

                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Moliyaviy holat</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <AmountRow label="Subtotal" amount={sale.subtotal} />
                        {sale.discountAmount > 0 && (
                            <AmountRow label="Chegirma" amount={sale.discountAmount} color="#dc2626" prefix="-" />
                        )}
                        <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: 10 }}>
                            <AmountRow label="JAMI" amount={sale.totalAmount} bold />
                        </div>
                        <AmountRow label="To'langan" amount={sale.paidAmount} color="#10b981" />
                        {sale.debtAmount > 0 && (
                            <AmountRow label="Nasiya" amount={sale.debtAmount} color="#ef4444" bold />
                        )}
                        {sale.changeAmount > 0 && (
                            <AmountRow label="Qaytim" amount={sale.changeAmount} color="#16a34a" />
                        )}
                    </div>
                </div>
            </div>

            {/* Mahsulotlar */}
            <div className="table-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                    <Package size={15} style={{ display: 'inline', marginRight: 6 }} />
                    Mahsulotlar ({sale.items?.length || 0} ta)
                </div>
                <div className="sale-items-table-wrap table-responsive">
                    <table className="ptable">
                        <thead>
                        <tr>
                            <th className="th-num">#</th>
                            <th>Mahsulot</th>
                            <th className="th-center">O'lchov</th>
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
                                    {item.warehouseName && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.warehouseName}</div>
                                    )}
                                </td>
                                <td className="th-center"><span className="cell-muted">{item.unitSymbol}</span></td>
                                <td className="th-right">{fmt(item.salePrice)}</td>
                                <td className="th-center">
                                    {item.quantity}
                                    {Number(item.returnedQuantity || 0) > 0 && (
                                        <div style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>
                                            -{item.returnedQuantity} qayt.
                                        </div>
                                    )}
                                </td>
                                <td className="th-right">
                                    {item.discountAmount > 0
                                        ? <span style={{ color: '#dc2626' }}>-{fmt(item.discountAmount)}</span>
                                        : <span className="cell-muted">—</span>
                                    }
                                </td>
                                <td className="th-right" style={{ fontWeight: 600 }}>{fmt(item.totalPrice)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>

                <div className="sale-items-cards-detail">
                    {(sale.items || []).map((item) => (
                        <div key={item.id} className="purchase-item-card">
                            <div className="purchase-item-name">{item.productName}</div>
                            <div className="purchase-item-row">
                                <span>Narx</span>
                                <span>{fmt(item.salePrice)} UZS</span>
                            </div>
                            <div className="purchase-item-row">
                                <span>Miqdor</span>
                                <span>{item.quantity} {item.unitSymbol}</span>
                            </div>
                            {item.discountAmount > 0 && (
                                <div className="purchase-item-row">
                                    <span>Chegirma</span>
                                    <span style={{ color: '#dc2626' }}>-{fmt(item.discountAmount)}</span>
                                </div>
                            )}
                            {Number(item.returnedQuantity || 0) > 0 && (
                                <div className="purchase-item-row">
                                    <span style={{ color: '#7c3aed' }}>Qaytarildi</span>
                                    <span style={{ color: '#7c3aed', fontWeight: 600 }}>-{item.returnedQuantity} {item.unitSymbol}</span>
                                </div>
                            )}
                            <div className="purchase-item-total">
                                <span>Jami</span>
                                <span>{fmt(item.totalPrice)} UZS</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* To'lovlar */}
            <div className="table-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                    <CreditCard size={15} style={{ display: 'inline', marginRight: 6 }} />
                    To'lovlar ({sale.payments?.length || 0} ta)
                </div>
                {!sale.payments?.length ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                        To'lovlar yo'q
                    </div>
                ) : (
                    <>
                    <div className="sale-pay-table-wrap table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th>Usul</th>
                                <th className="th-right">Summa</th>
                                {sale.payments.some(p => p.dueDate) && <th className="th-center">Muddat</th>}
                            </tr>
                            </thead>
                            <tbody>
                            {sale.payments.map((p, i) => {
                                const pm = PAYMENT_MAP[p.paymentMethod] || {}
                                return (
                                    <tr key={i}>
                                        <td className="cell-num">{i + 1}</td>
                                        <td>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                                padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                                                color: pm.color || '#64748b',
                                                background: pm.color ? pm.color + '18' : '#f1f5f9'
                                            }}>
                                                {pm.label || p.paymentMethod}
                                            </span>
                                        </td>
                                        <td className="th-right" style={{ fontWeight: 700, color: '#10b981' }}>
                                            {fmt(p.amount)} UZS
                                        </td>
                                        {sale.payments.some(pp => pp.dueDate) && (
                                            <td className="th-center">
                                                {p.dueDate ? fmtDate(p.dueDate + 'T00:00:00') : '—'}
                                            </td>
                                        )}
                                    </tr>
                                )
                            })}
                            </tbody>
                        </table>
                    </div>
                    <div className="sale-pay-cards-detail">
                        {sale.payments.map((p, i) => {
                            const pm = PAYMENT_MAP[p.paymentMethod] || {}
                            return (
                                <div key={i} className="purchase-pay-card">
                                    <div className="purchase-pay-card-top">
                                        <span className="purchase-pay-amount" style={{ color: '#10b981' }}>{fmt(p.amount)} UZS</span>
                                        <span style={{
                                            fontSize: 12, padding: '2px 8px', borderRadius: 10,
                                            background: pm.color ? pm.color + '18' : '#f1f5f9',
                                            color: pm.color || '#64748b', fontWeight: 600
                                        }}>{pm.label || p.paymentMethod}</span>
                                    </div>
                                    {p.dueDate && (
                                        <div className="purchase-pay-meta">Muddat: {fmtDate(p.dueDate + 'T00:00:00')}</div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    </>
                )}
            </div>

            {/* Qaytarishlar */}
            {returnedItems.length > 0 && (
                <div className="table-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: '#7c3aed' }}>
                        <CornerUpLeft size={15} style={{ display: 'inline', marginRight: 6 }} />
                        Qaytarilgan mahsulotlar
                    </div>
                    {returnedItems.map(item => (
                        <div key={item.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 0', borderBottom: '1px solid var(--border-color)'
                        }}>
                            <span style={{ fontSize: 13 }}>{item.productName}</span>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <span style={{ fontSize: 13, color: '#7c3aed', fontWeight: 600 }}>
                                    {item.returnedQuantity} {item.unitSymbol}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#ef4444' }}>
                                    -{fmt(Math.round(Number(item.salePrice) * Number(item.returnedQuantity)))} UZS
                                </span>
                            </div>
                        </div>
                    ))}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', paddingTop: 10,
                        fontWeight: 700, fontSize: 14, color: '#7c3aed'
                    }}>
                        <span>Jami qaytarildi</span>
                        <span>-{fmt(totalReturnedAmount)} UZS</span>
                    </div>
                </div>
            )}

            {/* Izohlar */}
            {sale.saleNotes?.length > 0 && (
                <div className="table-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Izohlar</div>
                    {sale.saleNotes.map(n => {
                        const isReject = n.message.startsWith('↩')
                        return (
                            <div key={n.id} style={{
                                padding: '10px 14px', marginBottom: 8,
                                background: isReject ? '#fef2f2' : 'var(--surface-secondary)',
                                borderRadius: 8, fontSize: 13,
                                border: isReject ? '1px solid #fecaca' : 'none'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600, color: isReject ? '#dc2626' : 'var(--text-primary)' }}>
                                        {n.senderName}
                                    </span>
                                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
                                        {n.createdAt && fmtDateTime(n.createdAt)}
                                    </span>
                                </div>
                                <div style={{ color: isReject ? '#dc2626' : 'var(--text-secondary)' }}>
                                    {n.message}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Return modal */}
            {showReturn && (
                <div className="modal-overlay" onClick={() => setShowReturn(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <CornerUpLeft size={20} />
                                <div><h6 className="modal-title">Mahsulot qaytarish</h6></div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowReturn(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {returnError && <div className="form-error"><AlertCircle size={16} />{returnError}</div>}
                            {returnItems.map(item => (
                                <div key={item.id} style={{
                                    display: 'flex', gap: 10, alignItems: 'center',
                                    padding: '10px 0', borderBottom: '1px solid var(--border-color)'
                                }}>
                                    <input type="checkbox" checked={item.checked}
                                           onChange={() => setReturnItems(prev => prev.map(i =>
                                               i.id === item.id ? { ...i, checked: !i.checked } : i
                                           ))}
                                           style={{ width: 16, height: 16 }} />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{item.productName}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            Qoldi: {item.remaining} {item.unitSymbol}
                                        </div>
                                    </div>
                                    {item.checked && (
                                        <input className="form-input" type="text" inputMode="numeric"
                                               style={{ width: 80, textAlign: 'right' }}
                                               value={item.returnQty}
                                               onChange={e => setReturnItems(prev => prev.map(i =>
                                                   i.id === item.id ? { ...i, returnQty: e.target.value } : i
                                               ))} />
                                    )}
                                </div>
                            ))}
                            <div className="form-group" style={{ marginTop: 14 }}>
                                <label className="form-label">Sabab (ixtiyoriy)</label>
                                <input className="form-input" value={returnReason}
                                       onChange={e => setReturnReason(e.target.value)}
                                       placeholder="Qaytarish sababi" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowReturn(false)}>Bekor</button>
                            <button className="btn-save" onClick={handleReturnSubmit} disabled={returnSaving}
                                    style={{ background: '#7c3aed' }}>
                                {returnSaving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Qaytarish'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {confirmModal && (
                <ConfirmModal
                    title={confirmModal.title}
                    message={confirmModal.message}
                    confirmLabel={confirmModal.confirmLabel}
                    cancelLabel={confirmModal.cancelLabel}
                    confirmClass={confirmModal.confirmClass}
                    variant={confirmModal.variant}
                    onConfirm={confirmModal.onConfirm}
                    onCancel={() => setConfirmModal(null)}
                />
            )}

            {toast && (
                <div className={`toast-msg toast-msg--${toast.type}`}>
                    {toast.type === 'error' ? '⚠ ' : '✓ '}{toast.msg}
                </div>
            )}
        </div>
    )
}

function InfoRow({ icon, label, value }) {
    return (
        <div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                {icon} {label}
            </div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>{value || '—'}</div>
        </div>
    )
}

function AmountRow({ label, amount, color, bold, prefix }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: bold ? 18 : 15, fontWeight: bold ? 800 : 600, color: color || 'var(--text-primary)' }}>
                {prefix || ''}{String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} UZS
            </span>
        </div>
    )
}