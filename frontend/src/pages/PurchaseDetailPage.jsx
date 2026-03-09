import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ShoppingCart, ArrowLeft, CheckCircle, XCircle, CreditCard,
    Loader2, AlertCircle, Package, Truck, Building2, Calendar,
    DollarSign, Clock, X, Plus
} from 'lucide-react'
import { getPurchaseById, receivePurchase, addPayment, cancelPurchase } from '../api/purchases'
import { useAuth } from '../context/AuthContext'
import '../styles/ProductsPage.css'

const fmt = (num) => num == null ? '0' : String(Math.round(Number(num))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const STATUS_MAP = {
    PENDING:            { label: 'Kutilmoqda',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    PARTIALLY_RECEIVED: { label: 'Qisman qabul',  color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    RECEIVED:           { label: 'Qabul qilindi', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    CANCELLED:          { label: 'Bekor qilindi', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
}

const PAYMENT_METHODS = [
    { value: 'CASH', label: 'Naqd' },
    { value: 'CARD', label: 'Karta' },
    { value: 'BANK_TRANSFER', label: 'Bank o\'tkazma' },
    { value: 'OTHER', label: 'Boshqa' },
]

const fmtPrice = (val) => {
    if (val === '' || val === null || val === undefined) return ''
    const num = String(val).replace(/[^\d]/g, '')
    if (!num) return ''
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export default function PurchaseDetailPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { hasPermission } = useAuth()

    const [purchase, setPurchase] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Payment modal
    const [showPayment, setShowPayment] = useState(false)
    const [paymentAmount, setPaymentAmount] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('CASH')
    const [paymentNote, setPaymentNote] = useState('')
    const [paymentSaving, setPaymentSaving] = useState(false)
    const [paymentError, setPaymentError] = useState('')

    // Actions loading
    const [receiving, setReceiving] = useState(false)
    const [cancelling, setCancelling] = useState(false)

    const [showReceive, setShowReceive] = useState(false)
    const [receiveItems, setReceiveItems] = useState([])

    const load = () => {
        setLoading(true)
        getPurchaseById(id)
            .then(res => setPurchase(res.data))
            .catch(() => setError('Xarid topilmadi'))
            .finally(() => setLoading(false))
    }

    useEffect(() => { load() }, [id])

    const handleReceive = () => {
        setReceiveItems(
            purchase.items
                .filter(i => Number(i.remainingQty) > 0)
                .map(i => ({
                    purchaseItemId: i.id,
                    productName: i.productName,
                    unitSymbol: i.unitSymbol,
                    orderedQty: i.quantity,
                    remainingQty: i.remainingQty,
                    receivedQty: String(i.remainingQty),
                    unitPrice: String(i.unitPrice),
                    currency: i.currency || 'UZS',
                }))
        )
        setShowReceive(true)
    }

    const handleCancel = async () => {
        if (!confirm('Bu xaridni bekor qilishni tasdiqlaysizmi?')) return
        setCancelling(true)
        try {
            await cancelPurchase(id)
            load()
        } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        } finally { setCancelling(false) }
    }

    const handleAddPayment = async () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) {
            setPaymentError("Summa kiritilishi shart"); return
        }
        setPaymentSaving(true); setPaymentError('')
        try {
            await addPayment(id, {
                amount: Number(paymentAmount),
                paymentMethod,
                note: paymentNote || undefined,
            })
            setShowPayment(false)
            setPaymentAmount('')
            setPaymentNote('')
            setPaymentMethod('CASH')
            load()
        } catch (e) {
            setPaymentError(e.response?.data?.message || 'Xatolik')
        } finally { setPaymentSaving(false) }
    }

    const handleConfirmReceive = async () => {
        setReceiving(true)
        try {
            const items = receiveItems
                .filter(i => Number(i.receivedQty) > 0)
                .map(i => ({
                    purchaseItemId: i.purchaseItemId,
                    receivedQty: Number(i.receivedQty),
                    unitPrice: i.unitPrice ? Number(i.unitPrice) : undefined,
                }))
            await receivePurchase(id, { items })
            setShowReceive(false)
            load()
        } catch (e) {
            alert(e.response?.data?.message || 'Xatolik')
        } finally { setReceiving(false) }
    }

    if (loading) return (
        <div className="products-wrapper">
            <div className="table-loading"><Loader2 size={28} className="spin" /><p>Yuklanmoqda...</p></div>
        </div>
    )

    if (error || !purchase) return (
        <div className="products-wrapper">
            <div className="table-empty"><AlertCircle size={40} strokeWidth={1} /><p>{error || 'Topilmadi'}</p></div>
        </div>
    )

    const st = STATUS_MAP[purchase.status] || {}

    return (
        <div className="products-wrapper">
            {/* Header */}
            <div className="products-header">
                <div className="products-header-left">
                    <button className="act-btn" onClick={() => navigate('/purchases')} style={{ marginRight: 8 }}>
                        <ArrowLeft size={18} />
                    </button>
                    <div className="page-icon-wrap"><ShoppingCart size={22} /></div>
                    <div>
                        <h1 className="page-title">{purchase.referenceNo}</h1>
                        <p className="page-subtitle">{purchase.supplierName}</p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        color: st.color, background: st.bg
                    }}>{st.label}</span>

                    {(purchase.status === 'PENDING' || purchase.status === 'PARTIALLY_RECEIVED') &&
                        hasPermission('PURCHASES_RECEIVE') && (
                            <button className="btn-add" style={{ background: '#10b981' }} onClick={handleReceive} disabled={receiving}>
                                {receiving ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                                Qabul qilish
                            </button>
                        )}

                    {purchase.status !== 'CANCELLED' && purchase.status !== 'RECEIVED' &&
                        hasPermission('PURCHASES_DELETE') && (
                            <button className="btn-add" style={{ background: '#ef4444' }} onClick={handleCancel} disabled={cancelling}>
                                {cancelling ? <Loader2 size={14} className="spin" /> : <XCircle size={14} />}
                                Bekor qilish
                            </button>
                        )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {/* Asosiy ma'lumotlar */}
                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Asosiy ma'lumotlar</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <InfoRow icon={<Truck size={14} />} label="Yetkazuvchi" value={purchase.supplierName} />
                        <InfoRow icon={<Building2 size={14} />} label="Ombor" value={purchase.warehouseName} />
                        <InfoRow icon={<Calendar size={14} />} label="Yaratilgan" value={purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString('uz-UZ') : '—'} />
                        <InfoRow icon={<Calendar size={14} />} label="Qabul sanasi" value={purchase.receivedAt ? new Date(purchase.receivedAt).toLocaleDateString('uz-UZ') : '—'} />
                        {purchase.notes && <InfoRow icon={<Clock size={14} />} label="Izoh" value={purchase.notes} />}
                    </div>
                </div>

                {/* Moliyaviy ma'lumotlar */}
                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Moliyaviy holat</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <AmountRow label="Jami summa" amount={purchase.totalAmount} color="var(--text-primary)" />
                        <AmountRow label="To'langan" amount={purchase.paidAmount} color="#10b981" />
                        <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: 10 }}>
                            <AmountRow label="Qarz" amount={purchase.debtAmount} color={Number(purchase.debtAmount) > 0 ? '#ef4444' : '#10b981'} bold />
                        </div>
                        {purchase.status !== 'CANCELLED' && Number(purchase.debtAmount) > 0 &&
                            hasPermission('PURCHASES_PAY') && (
                                <button className="btn-add" style={{ marginTop: 4 }} onClick={() => setShowPayment(true)}>
                                    <CreditCard size={14} /> To'lov qo'shish
                                </button>
                            )}
                    </div>
                </div>
            </div>

            {/* Mahsulotlar */}
            <div className="table-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                    <Package size={15} style={{ display: 'inline', marginRight: 6 }} />
                    Mahsulotlar ({purchase.items?.length || 0} ta)
                </div>
                <div className="table-responsive">
                    <table className="ptable">
                        <thead>
                        <tr>
                            <th className="th-num">#</th>
                            <th>Mahsulot</th>
                            <th className="th-center">O'lchov</th>
                            <th className="th-right">Miqdor</th>
                            <th className="th-right">Narx</th>
                            <th className="th-center">Valyuta</th>
                            <th className="th-right">Jami (UZS)</th>
                            <th className="th-right">Qabul qilindi</th>
                            <th className="th-right">Qoldi</th>
                        </tr>
                        </thead>
                        <tbody>
                        {(purchase.items || []).map((item, i) => (
                            <tr key={item.id}>
                                <td className="cell-num">{i + 1}</td>
                                <td><div className="cell-name">{item.productName}</div></td>
                                <td className="th-center"><span className="cell-muted">{item.unitSymbol}</span></td>
                                <td className="th-right">{fmt(item.quantity)}</td>
                                <td className="th-right">
                                    {fmt(item.unitPrice)}
                                    {item.currency === 'USD' && item.exchangeRate && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                            kurs: {fmt(item.exchangeRate)}
                                        </div>
                                    )}
                                </td>
                                <td className="th-center">
                                        <span style={{
                                            fontSize: 12, fontWeight: 600, padding: '2px 8px',
                                            borderRadius: 10,
                                            color: item.currency === 'USD' ? '#3b82f6' : 'var(--text-muted)',
                                            background: item.currency === 'USD' ? 'rgba(59,130,246,0.1)' : 'var(--surface-2)'
                                        }}>{item.currency || 'UZS'}</span>
                                </td>
                                <td className="th-right" style={{ fontWeight: 600 }}>{fmt(item.totalPrice)}</td>
                                <td className="th-right" style={{ color: '#10b981' }}>{fmt(item.receivedQty)}</td>
                                <td className="th-right" style={{ color: Number(item.remainingQty) > 0 ? '#f59e0b' : '#10b981' }}>
                                    {fmt(item.remainingQty)}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* To'lovlar tarixi */}
            <div className="table-card" style={{ padding: '16px 20px' }}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>
                    <CreditCard size={15} style={{ display: 'inline', marginRight: 6 }} />
                    To'lovlar tarixi ({purchase.payments?.length || 0} ta)
                </div>
                {!purchase.payments?.length ? (
                    <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
                        To'lovlar yo'q
                    </div>
                ) : (
                    <div className="table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th className="th-right">Summa</th>
                                <th className="th-center">Usul</th>
                                <th>Izoh</th>
                                <th className="th-center">Sana</th>
                                <th className="th-center">Kim tomonidan</th>
                            </tr>
                            </thead>
                            <tbody>
                            {purchase.payments.map((p, i) => (
                                <tr key={p.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td className="th-right" style={{ fontWeight: 700, color: '#10b981' }}>
                                        {fmt(p.amount)} UZS
                                    </td>
                                    <td className="th-center">
                                            <span style={{
                                                fontSize: 12, padding: '2px 8px', borderRadius: 10,
                                                background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600
                                            }}>
                                                {PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod}
                                            </span>
                                    </td>
                                    <td><span className="cell-muted">{p.note || '—'}</span></td>
                                    <td className="th-center">
                                            <span className="cell-muted" style={{ fontSize: 12 }}>
                                                {p.paidAt ? new Date(p.paidAt).toLocaleDateString('uz-UZ') : '—'}
                                            </span>
                                    </td>
                                    <td className="th-center">
                                        <span className="cell-muted">{p.paidBy || '—'}</span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* To'lov modal */}
            {showPayment && (
                <div className="modal-overlay" onClick={() => setShowPayment(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <CreditCard size={20} />
                                <div><h6 className="modal-title">To'lov qo'shish</h6></div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowPayment(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            {paymentError && <div className="form-error"><AlertCircle size={16} />{paymentError}</div>}
                            <div style={{
                                padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                                background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 13, fontWeight: 600
                            }}>
                                Qarz: {fmt(purchase.debtAmount)} UZS
                            </div>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Summa (UZS) <span className="required">*</span></label>
                                <input
                                    className="form-input"
                                    type="text"
                                    inputMode="numeric"
                                    value={fmtPrice(paymentAmount)}
                                    onChange={e => setPaymentAmount(e.target.value.replace(/\s/g, ''))}
                                    placeholder={fmt(purchase.debtAmount)}
                                    autoFocus
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">To'lov usuli</label>
                                <select className="form-select" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Izoh</label>
                                <input className="form-input" value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowPayment(false)}>Bekor</button>
                            <button className="btn-save" onClick={handleAddPayment} disabled={paymentSaving}>
                                {paymentSaving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            // Tovarlarni qabul qilish modali
            {showReceive && (
                <div className="modal-overlay" onClick={() => setShowReceive(false)}>
                    <div className="modal-box products-modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <CheckCircle size={20} />
                                <div><h6 className="modal-title">Tovarlarni qabul qilish</h6></div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowReceive(false)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <table className="ptable">
                                <thead>
                                <tr>
                                    <th>Mahsulot</th>
                                    <th className="th-right">Buyurtma</th>
                                    <th className="th-right">Qabul miqdori</th>
                                    <th className="th-right">Narx ({' '})</th>
                                </tr>
                                </thead>
                                <tbody>
                                {receiveItems.map((item, idx) => (
                                    <tr key={item.purchaseItemId}>
                                        <td>
                                            <div className="cell-name">{item.productName}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.unitSymbol}</div>
                                        </td>
                                        <td className="th-right">{fmt(item.remainingQty)}</td>
                                        <td className="th-right">
                                            <input
                                                className="form-input"
                                                type="text"
                                                inputMode="numeric"
                                                style={{ width: 100, textAlign: 'right' }}
                                                value={fmtPrice(item.receivedQty)}
                                                onChange={e => setReceiveItems(prev => prev.map((r, i) =>
                                                    i === idx ? { ...r, receivedQty: e.target.value.replace(/\s/g, '') } : r
                                                ))}
                                            />
                                        </td>
                                        <td className="th-right">
                                            <input
                                                className="form-input"
                                                type="text"
                                                inputMode="numeric"
                                                style={{ width: 120, textAlign: 'right' }}
                                                value={fmtPrice(item.unitPrice)}
                                                onChange={e => setReceiveItems(prev => prev.map((r, i) =>
                                                    i === idx ? { ...r, unitPrice: e.target.value.replace(/\s/g, '') } : r
                                                ))}
                                            />
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowReceive(false)}>Bekor</button>
                            <button
                                className="btn-save"
                                onClick={handleConfirmReceive}
                                disabled={receiving}
                            >
                                {receiving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Qabul qilish'}
                            </button>
                        </div>
                    </div>
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

function AmountRow({ label, amount, color, bold }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: bold ? 18 : 15, fontWeight: bold ? 800 : 600, color }}>
                {String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} UZS
            </span>
        </div>
    )
}