import { useState, useEffect } from 'react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useNavigate, useParams } from 'react-router-dom'
import {
    ShoppingCart, ArrowLeft, CheckCircle, XCircle, CreditCard,
    Loader2, AlertCircle, Package, Truck, Building2, Calendar,
    DollarSign, Clock, X, FileText, Edit2
} from 'lucide-react'
import { getPurchaseById, receivePurchase, addPayment, cancelPurchase } from '../api/purchases'
import { getExchangeRate } from '../api/products'
import { shiftsApi } from '../api/shifts'
import { useAuth } from '../context/AuthContext'
import { exportToPDF, exportToCSV, fmtNum } from '../utils/exportUtils'
import { supplierDebtsApi } from '../api/debts'
import ConfirmModal from '../components/ConfirmModal'
import '../styles/ProductsPage.css'
import '../styles/PurchasesPage.css'

const fmt = (num) => {
    if (num == null) return '0'
    const n = Number(num)
    if (!Number.isFinite(n)) return '0'
    const str = n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
    const [int, dec] = str.split('.')
    return dec ? int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + '.' + dec : int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

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
    const str = String(val).replace(/[^\d.]/g, '')
    const parts = str.split('.')
    const intPart = (parts[0] || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    if (parts.length > 1) return intPart + '.' + parts[1].slice(0, 2)
    if (str.endsWith('.')) return intPart + '.'
    return intPart || ''
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
    const [paymentCurrency, setPaymentCurrency] = useState('UZS')
    const [paymentSaving, setPaymentSaving] = useState(false)
    const [paymentError, setPaymentError] = useState('')
    const [currentShift, setCurrentShift] = useState(null)
    const [recordExpense, setRecordExpense] = useState(true)
    const [expenseAmount, setExpenseAmount] = useState('')

    // Actions loading
    const [receiving, setReceiving] = useState(false)
    const [cancelling, setCancelling] = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)

    const [showReceive, setShowReceive] = useState(false)
    const [receiveItems, setReceiveItems] = useState([])

    const [exchangeRate, setExchangeRate] = useState(12700)

    const [confirmModal, setConfirmModal] = useState(null) // { title, message, onConfirm, variant }
    const [toast, setToast] = useState(null)
    const [dueDateModal, setDueDateModal] = useState(null) // { debtId, currency, currentDate }
    const [dueDateValue, setDueDateValue] = useState('')
    const [dueDateNotes, setDueDateNotes] = useState('')
    const [dueDateSaving, setDueDateSaving] = useState(false)

    const showToast = (msg, type = 'error') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    const openDueDateModal = (debt) => {
        setDueDateModal({ debtId: debt.id, currency: debt.currency, currentDate: debt.dueDate })
        setDueDateValue(debt.dueDate || '')
        setDueDateNotes('')
    }

    const handleSaveDueDate = async () => {
        if (!dueDateValue) { showToast('Sanani tanlang'); return }
        setDueDateSaving(true)
        try {
            await supplierDebtsApi.setDueDate(dueDateModal.debtId, dueDateValue, dueDateNotes || undefined)
            setDueDateModal(null)
            setDueDateValue('')
            setDueDateNotes('')
            showToast('Muddat belgilandi', 'success')
            load()
        } catch (e) {
            showToast(e.response?.data?.message || 'Xatolik')
        } finally { setDueDateSaving(false) }
    }

    const findDebt = (currency) => (purchase?.debts || []).find(d => d.currency === currency && !d.isPaid)

    const load = () => {
        setLoading(true)
        getPurchaseById(id)
            .then(res => setPurchase(res.data))
            .catch(() => setError('Xarid topilmadi'))
            .finally(() => setLoading(false))
    }

    useEffect(() => {
        load()
        getExchangeRate().then(res => setExchangeRate(Number(res.data?.rate) || 12700)).catch(() => {})
    }, [id])

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

    const handleCancel = () => {
        setConfirmModal({
            title: 'Xaridni bekor qilish',
            message: "Bu xarid bekor qilinadi va qaytarib tiklab bo'lmaydi. Davom etasizmi?",
            confirmLabel: 'Ha, bekor qilish',
            cancelLabel: "Yo'q",
            confirmClass: 'btn-danger',
            variant: 'danger',
            onConfirm: async () => {
                setConfirmModal(null)
                setCancelling(true)
                try {
                    await cancelPurchase(id)
                    load()
                } catch (e) {
                    showToast(e.response?.data?.message || 'Xatolik')
                } finally { setCancelling(false) }
            }
        })
    }

    // To'lov modali ochilganda joriy smenani yuklash
    useEffect(() => {
        if (showPayment) {
            shiftsApi.getCurrent()
                .then(res => { setCurrentShift(res.data || null); setRecordExpense(true) })
                .catch(() => setCurrentShift(null))
        }
    }, [showPayment])

    // To'lov summasi o'zgarganda expense summasini sinxronlashtirish
    useEffect(() => {
        if (recordExpense) setExpenseAmount(paymentAmount)
    }, [paymentAmount, recordExpense])

    const handleAddPayment = async () => {
        if (!paymentAmount || Number(paymentAmount) <= 0) {
            setPaymentError("Summa kiritilishi shart"); return
        }
        const expAmt = (recordExpense && currentShift)
            ? Number(String(expenseAmount).replace(/\s/g, '')) || 0
            : 0
        setPaymentSaving(true); setPaymentError('')
        try {
            await addPayment(id, {
                amount: Number(String(paymentAmount).replace(/\s/g, '')),
                currency: paymentCurrency,
                paymentMethod,
                note: paymentNote || undefined,
                shiftExpenseAmount: expAmt > 0 ? expAmt : undefined,
            })
            setShowPayment(false)
            setPaymentAmount('')
            setPaymentNote('')
            setPaymentMethod('CASH')
            setPaymentCurrency('UZS')
            setExpenseAmount('')
            setCurrentShift(null)
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
            showToast(e.response?.data?.message || 'Xatolik')
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

    const handlePDF = async () => {
        if (!purchase) return
        setPdfLoading(true)
        try {
            const isPending = ['PENDING', 'PARTIALLY_RECEIVED'].includes(purchase.status)
            const date = purchase.createdAt
                ? new Date(purchase.createdAt).toLocaleDateString('ru-RU')
                : '—'

            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

            // ── Sarlavha ──────────────────────────────────────────
            doc.setFontSize(15); doc.setTextColor(30, 30, 30)
            doc.text(
                isPending
                    ? `Buyurtma varaqasi — ${purchase.referenceNo}`
                    : `Xarid hujjati — ${purchase.referenceNo}`,
                14, 16
            )
            doc.setFontSize(9); doc.setTextColor(100, 100, 100)
            doc.text(
                `Yetkazuvchi: ${purchase.supplierName || '—'}  |  Ombor: ${purchase.warehouseName || '—'}  |  Sana: ${date}`,
                14, 23
            )
            doc.setFontSize(8); doc.setTextColor(130, 130, 130)
            doc.text(
                `Chop etilgan: ${new Date().toLocaleDateString('ru-RU')} ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
                14, 29
            )

            let y = 33

            if (isPending) {
                // ── Buyurtma varaqasi — narxsiz ───────────────────
                autoTable(doc, {
                    head: [['#', 'Mahsulot', 'Miqdor', 'Birlik']],
                    body: (purchase.items || []).map((item, i) => [
                        i + 1,
                        item.productName || '',
                        item.quantity || '',
                        item.unitSymbol || ''
                    ]),
                    startY: y,
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 249, 250] },
                    margin: { left: 14, right: 14 },
                    foot: [[
                        { content: `Jami: ${(purchase.items || []).length} ta mahsulot`, colSpan: 4,
                            styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: 20 }
                        }
                    ]],
                    showFoot: 'lastPage',
                })
            } else {
                // ── To'liq hujjat — mahsulotlar ───────────────────
                const uzsItems = (purchase.items || []).filter(i => (i.currency || 'UZS') === 'UZS')
                const usdItems = (purchase.items || []).filter(i => i.currency === 'USD')

                const makeRows = (items, offset = 0) => items.map((item, i) => {
                    const total = Number(item.quantity || 0) * Number(item.unitPrice || 0)
                    const currency = item.currency || 'UZS'
                    return [
                        offset + i + 1,
                        item.productName || '',
                        item.quantity || '',
                        item.unitSymbol || '',
                        `${fmtNum(item.unitPrice)} ${currency}`,
                        `${fmtNum(total)} ${currency}`
                    ]
                })

                const allRows = makeRows(purchase.items || [])

                // Jami qatorlar
                const totalUzs = uzsItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0)
                const totalUsd = usdItems.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0)

                const footRow = []
                if (totalUzs > 0) footRow.push(`Jami UZS: ${fmtNum(totalUzs)} UZS`)
                if (totalUsd > 0) footRow.push(`Jami USD: ${fmtNum(totalUsd)} USD`)
                if (Number(purchase.debtUzs) > 0) footRow.push(`Qarz UZS: ${fmtNum(purchase.debtUzs)} UZS`)
                if (Number(purchase.debtUsd) > 0) footRow.push(`Qarz USD: ${fmtNum(purchase.debtUsd)} USD`)

                autoTable(doc, {
                    head: [['#', 'Mahsulot', 'Miqdor', 'Birlik', 'Tan narx', 'Jami']],
                    body: allRows,
                    startY: y,
                    styles: { fontSize: 9, cellPadding: 3 },
                    headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
                    alternateRowStyles: { fillColor: [248, 249, 250] },
                    margin: { left: 14, right: 14 },
                    foot: [[{
                        content: footRow.join('    |    '),
                        colSpan: 6,
                        styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [30, 30, 30] }
                    }]],
                    showFoot: 'lastPage',
                })

                // ── To'lovlar tarixi ──────────────────────────────
                if (purchase.payments?.length) {
                    const payY = doc.lastAutoTable.finalY + 10
                    doc.setFontSize(11); doc.setTextColor(30, 30, 30)
                    doc.text(`To'lovlar tarixi (${purchase.payments.length} ta)`, 14, payY)

                    autoTable(doc, {
                        head: [['#', 'Sana', "To'lov usuli", 'Summa', 'Valyuta', 'Izoh']],
                        body: purchase.payments.map((p, i) => [
                            i + 1,
                            p.paidAt ? new Date(p.paidAt).toLocaleDateString('ru-RU') : '—',
                            p.paymentMethod || '',
                            fmtNum(p.amount),
                            p.currency || 'UZS',
                            p.notes || ''
                        ]),
                        startY: payY + 4,
                        styles: { fontSize: 9, cellPadding: 3 },
                        headStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                        alternateRowStyles: { fillColor: [240, 253, 244] },
                        margin: { left: 14, right: 14 },
                    })
                }
            }

            doc.save(`${isPending ? 'buyurtma' : 'xarid'}_${purchase.referenceNo}.pdf`)
        } catch (e) {
            console.error('PDF xatosi:', e)
        } finally {
            setPdfLoading(false)
        }
    }
    const isPending = ['PENDING', 'PARTIALLY_RECEIVED'].includes(purchase.status)
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
                <div className="purchase-detail-actions" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{
                        padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                        color: st.color, background: st.bg
                    }}>{st.label}</span>

                    {/* PDF tugma */}
                    <button className="btn-reset" onClick={handlePDF} disabled={pdfLoading}
                            style={{ color: '#dc2626', borderColor: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {pdfLoading
                            ? <Loader2 size={14} className="spin" />
                            : <FileText size={14} />
                        }
                        {isPending ? 'Buyurtma PDF' : 'Hujjat PDF'}
                    </button>

                    {purchase.status === 'PENDING' && hasPermission('PURCHASES_CREATE') && (
                        <button className="btn-add" onClick={() => navigate(`/purchases/${id}/edit`)}>
                            <Edit2 size={14} />
                            Tahrirlash
                        </button>
                    )}

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

            <div className="purchase-detail-grid">
                {/* Asosiy ma'lumotlar */}
                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Asosiy ma'lumotlar</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <InfoRow icon={<Truck size={14} />} label="Yetkazuvchi" value={purchase.supplierName} />
                        <InfoRow icon={<Building2 size={14} />} label="Ombor" value={purchase.warehouseName} />
                        <InfoRow icon={<Calendar size={14} />} label="Yaratilgan" value={purchase.createdAt ? new Date(purchase.createdAt).toLocaleDateString('ru-RU') : '—'} />
                        <InfoRow icon={<Calendar size={14} />} label="Qabul sanasi" value={purchase.receivedAt ? new Date(purchase.receivedAt).toLocaleDateString('ru-RU') : '—'} />
                        {purchase.notes && <InfoRow icon={<Clock size={14} />} label="Izoh" value={purchase.notes} />}
                    </div>
                </div>

                {/* Moliyaviy ma'lumotlar - multi-currency */}
                <div className="table-card" style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Moliyaviy holat</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

                        {/* USD qism */}
                        {Number(purchase.totalUsd) > 0 && (
                            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', marginBottom: 6, letterSpacing: 0.5 }}>USD QISM</div>
                                <MultiCurrencyRow label="Jami" amount={purchase.totalUsd} currency="USD" />
                                <MultiCurrencyRow label="To'langan" amount={purchase.paidUsd} currency="USD" color="#10b981" />
                                <div style={{ borderTop: '1px solid rgba(59,130,246,0.15)', marginTop: 6, paddingTop: 6 }}>
                                    <MultiCurrencyRow label="Qarz" amount={purchase.debtUsd} currency="USD"
                                                      color={Number(purchase.debtUsd) > 0 ? '#ef4444' : '#10b981'} bold />
                                </div>
                                {Number(purchase.debtUsd) > 0 && findDebt('USD') && (
                                    <DueDateRow debt={findDebt('USD')} onEdit={() => openDueDateModal(findDebt('USD'))} />
                                )}
                                {purchase.status !== 'CANCELLED' && Number(purchase.debtUsd) > 0 && hasPermission('PURCHASES_PAY') && (
                                    <button className="btn-add" style={{ marginTop: 8, width: '100%', justifyContent: 'center', fontSize: 13, background: '#3b82f6' }}
                                            onClick={() => { setPaymentCurrency('USD'); setShowPayment(true) }}>
                                        <CreditCard size={13} /> USD da to'lash
                                    </button>
                                )}
                            </div>
                        )}

                        {/* UZS qism */}
                        {Number(purchase.totalUzs) > 0 && (
                            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', marginBottom: 6, letterSpacing: 0.5 }}>UZS QISM</div>
                                <MultiCurrencyRow label="Jami" amount={purchase.totalUzs} currency="UZS" />
                                <MultiCurrencyRow label="To'langan" amount={purchase.paidUzs} currency="UZS" color="#10b981" />
                                <div style={{ borderTop: '1px solid rgba(16,185,129,0.15)', marginTop: 6, paddingTop: 6 }}>
                                    <MultiCurrencyRow label="Qarz" amount={purchase.debtUzs} currency="UZS"
                                                      color={Number(purchase.debtUzs) > 0 ? '#ef4444' : '#10b981'} bold />
                                </div>
                                {Number(purchase.debtUzs) > 0 && findDebt('UZS') && (
                                    <DueDateRow debt={findDebt('UZS')} onEdit={() => openDueDateModal(findDebt('UZS'))} />
                                )}
                                {purchase.status !== 'CANCELLED' && Number(purchase.debtUzs) > 0 && hasPermission('PURCHASES_PAY') && (
                                    <button className="btn-add" style={{ marginTop: 8, width: '100%', justifyContent: 'center', fontSize: 13 }}
                                            onClick={() => { setPaymentCurrency('UZS'); setShowPayment(true) }}>
                                        <CreditCard size={13} /> UZS da to'lash
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Faqat bitta valyuta bo'lsa oddiy ko'rinish */}
                        {Number(purchase.totalUsd) === 0 && Number(purchase.totalUzs) === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <AmountRow label="Jami summa" amount={purchase.totalAmount} color="var(--text-primary)" />
                                <AmountRow label="To'langan" amount={purchase.paidAmount} color="#10b981" />
                                <div style={{ borderTop: '1.5px solid var(--border-color)', paddingTop: 10 }}>
                                    <AmountRow label="Qarz" amount={purchase.debtAmount}
                                               color={Number(purchase.debtAmount) > 0 ? '#ef4444' : '#10b981'} bold />
                                </div>
                                {purchase.status !== 'CANCELLED' && Number(purchase.debtAmount) > 0 && hasPermission('PURCHASES_PAY') && (
                                    <button className="btn-add" style={{ marginTop: 4 }} onClick={() => { setPaymentCurrency('UZS'); setShowPayment(true) }}>
                                        <CreditCard size={14} /> To'lov qo'shish
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Mahsulotlar */}
            <div className="table-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                        <Package size={15} style={{ display: 'inline', marginRight: 6 }} />
                        Mahsulotlar ({purchase.items?.length || 0} ta)
                    </div>
                </div>
                <div className="purchase-items-table-wrapper">
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
                                            fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
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

                <div className="purchase-items-cards">
                    {(purchase.items || []).map((item) => (
                        <div key={item.id} className="purchase-item-card">
                            <div className="purchase-item-name">{item.productName}</div>
                            <div className="purchase-item-row">
                                <span>O'lchov</span>
                                <span>{item.unitSymbol} &nbsp; {fmt(item.quantity)} ta</span>
                            </div>
                            <div className="purchase-item-row">
                                <span>Narx</span>
                                <span>{fmt(item.unitPrice)} {item.currency || 'UZS'}</span>
                            </div>
                            <div className="purchase-item-total">
                                <span>Jami</span>
                                <span>{fmt(item.totalPrice)} UZS</span>
                            </div>
                        </div>
                    ))}
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
                    <>
                    <div className="purchase-pay-table-wrapper table-responsive">
                        <table className="ptable">
                            <thead>
                            <tr>
                                <th className="th-num">#</th>
                                <th className="th-right">Summa</th>
                                <th className="th-center">Valyuta</th>
                                <th className="th-center">Usul</th>
                                <th>Izoh</th>
                                <th className="th-center">Sana</th>
                                <th className="th-center">Kim</th>
                            </tr>
                            </thead>
                            <tbody>
                            {purchase.payments.map((p, i) => (
                                <tr key={p.id}>
                                    <td className="cell-num">{i + 1}</td>
                                    <td className="th-right" style={{ fontWeight: 700, color: '#10b981' }}>
                                        {(p.currency || 'UZS') === 'USD'
                                            ? (Number(p.amount)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
                                            : fmt(p.amount)
                                        } {p.currency || 'UZS'}
                                    </td>
                                    <td className="th-center">
                                        <span style={{
                                            fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                            color: (p.currency||'UZS')==='USD' ? '#3b82f6' : '#10b981',
                                            background: (p.currency||'UZS')==='USD' ? 'rgba(59,130,246,0.1)' : 'rgba(16,185,129,0.1)'
                                        }}>{p.currency || 'UZS'}</span>
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
                                            {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ru-RU') : '—'}
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
                    <div className="purchase-pay-cards">
                        {purchase.payments.map((p, i) => {
                            const cur = p.currency || 'UZS'
                            const amountStr = cur === 'USD'
                                ? (Number(p.amount)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})
                                : fmt(p.amount)
                            const methodLabel = PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod
                            return (
                                <div key={p.id} className="purchase-pay-card">
                                    <div className="purchase-pay-card-top">
                                        <span className="purchase-pay-amount" style={{ color: '#10b981' }}>{amountStr} {cur}</span>
                                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 10, background: 'var(--primary-light)', color: 'var(--primary)', fontWeight: 600 }}>{methodLabel}</span>
                                    </div>
                                    <div className="purchase-pay-meta">
                                        {p.paidAt ? new Date(p.paidAt).toLocaleDateString('ru-RU') : '—'}
                                        {p.paidBy && ` · ${p.paidBy}`}
                                        {p.note && ` · ${p.note}`}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    </>
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
                            {/* Valyuta va qarz ko'rsatish */}
                            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                                {[
                                    { cur: 'USD', debt: purchase.debtUsd, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                                    { cur: 'UZS', debt: purchase.debtUzs, color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
                                ].filter(x => Number(x.debt) > 0).map(({ cur, debt, color, bg }) => (
                                    <button key={cur}
                                            onClick={() => setPaymentCurrency(cur)}
                                            style={{
                                                flex: 1, padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                                                background: paymentCurrency === cur ? bg : 'var(--surface-2)',
                                                border: paymentCurrency === cur ? `2px solid ${color}` : '2px solid transparent',
                                                color: paymentCurrency === cur ? color : 'var(--text-muted)',
                                                fontWeight: 600, fontSize: 13, textAlign: 'center',
                                                transition: 'all 0.15s'
                                            }}>
                                        <div style={{ fontSize: 11, marginBottom: 2, opacity: 0.8 }}>Qarz ({cur})</div>
                                        <div style={{ fontSize: 15 }}>{fmt(debt)} {cur}</div>
                                    </button>
                                ))}
                            </div>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Summa ({paymentCurrency}) <span className="required">*</span></label>
                                <input
                                    className="form-input"
                                    type="text"
                                    inputMode="numeric"
                                    value={fmtPrice(paymentAmount)}
                                    onChange={e => setPaymentAmount(e.target.value.replace(/\s/g, ''))}
                                    placeholder={paymentCurrency === 'USD' ? fmt(purchase.debtUsd) : fmt(purchase.debtUzs)}
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
                            {currentShift && paymentCurrency === 'UZS' && (
                                <div style={{
                                    marginTop: 10, padding: '10px 12px',
                                    border: '1px solid #7c3aed44', borderRadius: 8,
                                    background: '#faf5ff'
                                }}>
                                    <label style={{
                                        display: 'flex', alignItems: 'center', gap: 7,
                                        fontSize: 13, fontWeight: 600, color: '#7c3aed',
                                        cursor: 'pointer', marginBottom: recordExpense ? 10 : 0
                                    }}>
                                        <input type="checkbox" checked={recordExpense}
                                               style={{ width: 15, height: 15, accentColor: '#7c3aed' }}
                                               onChange={e => {
                                                   setRecordExpense(e.target.checked)
                                                   if (e.target.checked) setExpenseAmount(paymentAmount)
                                               }} />
                                        Joriy smenaga harajat sifatida qayd etish
                                    </label>
                                    {recordExpense && (
                                        <div>
                                            <label className="form-label" style={{ fontSize: 12 }}>
                                                Smenaga kiritiladigan summa (UZS)
                                            </label>
                                            <input
                                                className="form-input"
                                                type="text"
                                                inputMode="numeric"
                                                value={fmtPrice(expenseAmount)}
                                                onChange={e => setExpenseAmount(e.target.value.replace(/\s/g, ''))}
                                                placeholder="0"
                                            />
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                                Shaxsiy mablag'dan to'langan qismni 0 qoldiring
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
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

            {/* Tovarlarni qabul qilish modali */}
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
                                    <th className="th-right">Qoldi</th>
                                    <th className="th-right">Qabul miqdori</th>
                                    <th className="th-right">Narx</th>
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
                            <button className="btn-save" onClick={handleConfirmReceive} disabled={receiving}>
                                {receiving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Qabul qilish'}
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

            {dueDateModal && (
                <div className="modal-overlay" onClick={() => setDueDateModal(null)}>
                    <div className="modal-box" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <Calendar size={20} />
                                <div><h6 className="modal-title">Qarz muddati ({dueDateModal.currency})</h6></div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setDueDateModal(null)}><X size={16} /></button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Sana <span className="required">*</span></label>
                                <input className="form-input" type="date"
                                       value={dueDateValue}
                                       onChange={e => setDueDateValue(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Izoh (ixtiyoriy)</label>
                                <input className="form-input" value={dueDateNotes}
                                       onChange={e => setDueDateNotes(e.target.value)}
                                       placeholder="Masalan: oy oxirigacha" />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setDueDateModal(null)}>Bekor</button>
                            <button className="btn-save" onClick={handleSaveDueDate} disabled={dueDateSaving}>
                                {dueDateSaving ? <><Loader2 size={14} className="spin" />Saqlanmoqda...</> : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
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

function MultiCurrencyRow({ label, amount, currency, color, bold }) {
    const isUsd = currency === 'USD'
    const displayAmt = isUsd
        ? (Number(amount) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : String(Math.round(Number(amount) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: bold ? 15 : 13, fontWeight: bold ? 800 : 600, color: color || 'var(--text-primary)' }}>
                {displayAmt} {currency}
            </span>
        </div>
    )
}

function DueDateRow({ debt, onEdit }) {
    const hasDate = !!debt.dueDate
    const isOverdue = hasDate && new Date(debt.dueDate) < new Date(new Date().toDateString())
    return (
        <div style={{
            marginTop: 6, paddingTop: 6, display: 'flex',
            alignItems: 'center', justifyContent: 'space-between',
            fontSize: 12, borderTop: '1px dashed var(--border-color)'
        }}>
            <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Calendar size={13} />
                Muddat:{' '}
                {hasDate
                    ? <strong style={{ color: isOverdue ? '#ef4444' : 'var(--text-primary)' }}>
                        {new Date(debt.dueDate).toLocaleDateString('ru-RU')}
                        {isOverdue && ' (o\'tib ketgan)'}
                    </strong>
                    : <span style={{ color: 'var(--text-muted)' }}>belgilanmagan</span>
                }
            </span>
            <button onClick={onEdit}
                    style={{
                        background: 'none', border: '1px solid var(--border-color)',
                        padding: '3px 10px', borderRadius: 6, fontSize: 11,
                        cursor: 'pointer', color: 'var(--primary)', fontWeight: 600
                    }}>
                {hasDate ? 'Tahrirlash' : 'Belgilash'}
            </button>
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