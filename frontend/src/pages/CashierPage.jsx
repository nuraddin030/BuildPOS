import React, { useState, useEffect, useRef } from 'react'
import { jsPDF } from 'jspdf'
import ReactDOM from 'react-dom'
import {
    Search, X, Plus, Minus, Trash2, User, CreditCard,
    Banknote, ArrowLeftRight, Clock, RefreshCw,
    Download, PauseCircle, Package, ShoppingCart, Printer,
    Calendar, ArrowUpDown, History, Bell, CheckCircle, XCircle, CornerUpLeft, Home, LogOut as ShiftClose, Camera
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useReactToPrint } from 'react-to-print'
import { salesApi } from '../api/sales'
import { shiftsApi } from '../api/shifts'
import api from '../api/api'
import '../styles/CashierPage.css'
import CameraScanner from '../components/CameraScanner'

// ─── Helpers ─────────────────────────────────
const fmt = (n) => n == null ? '0' : Number(n).toLocaleString('ru-RU')

// ─── Favorites (localStorage) ─────────────────────
const FAV_KEY = 'pos_favorites'
const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '{}') } catch { return {} } }
const saveFav = (productId, name, price, imageUrl) => {
    const favs = getFavs()
    const existing = favs[productId] || { productId, name, price, imageUrl, count: 0 }
    existing.count += 1
    existing.name = name
    existing.price = price
    existing.imageUrl = imageUrl
    favs[productId] = existing
    localStorage.setItem(FAV_KEY, JSON.stringify(favs))
}
const getTopFavs = (limit = 10) => {
    const favs = getFavs()
    return Object.values(favs).sort((a, b) => b.count - a.count).slice(0, limit)
}
const UZ_MONTHS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentyabr','oktyabr','noyabr','dekabr']
const fmtShiftDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
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
        <div ref={wrapRef} className="pos-ss-wrap">
            <div className="pos-ss-inner">
                <User size={14} className="pos-ss-icon" />
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
                    <button onClick={onClear} className="pos-ss-clear">
                        <X size={14} />
                    </button>
                )}
            </div>
            {open && !selected && (
                <div className="pos-ss-dropdown">
                    {search.length < minChars ? (
                        <div className="pos-ss-hint">Kamida {minChars} ta harf yozing...</div>
                    ) : items.length === 0 ? (
                        <div className="pos-ss-hint">Topilmadi</div>
                    ) : items.map(item => (
                        <div key={item.id}
                             onClick={() => { onSelect(String(item.id)); setOpen(false) }}
                             className="pos-ss-item">
                            <div className="pos-ss-item-name">{getLabel(item)}</div>
                            {getSub && getSub(item) && <div className="pos-ss-item-sub">{getSub(item)}</div>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Smena ochish ─────────────────────────────
function OpenShiftModal({ warehouses, onOpen }) {
    const [warehouseId, setWarehouseId] = useState('')
    const [openingCash, setOpeningCash] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (warehouses.length > 0 && !warehouseId) {
            setWarehouseId(warehouses[0].id)
        }
    }, [warehouses])
    const handle = async () => {
        if (!warehouseId) return setError('Ombor tanlang')
        setLoading(true); setError('')
        try { const r = await shiftsApi.open({ warehouseId: Number(warehouseId), openingCash: parseNum(openingCash) }); onOpen(r.data) }
        catch (e) { setError(e.response?.data?.message || 'Xatolik') }
        finally { setLoading(false) }
    }
    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal pos-modal--md">
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
            <div className="pos-modal pos-modal--lg">
                <div className="pos-mh">Smena yopish <button onClick={onClose} className="pos-modal-close"><X size={18} /></button></div>
                <div className="pos-mb">
                    {error && <div className="pos-alert">{error}</div>}
                    <div className="pos-shift-stats">
                        {[['Jami sotuv', fmt(shift?.totalSales) + ' so\'m'], ['Sotuvlar', (shift?.saleCount || 0) + ' ta'],
                            ['Naqd', fmt(shift?.totalCash) + ' so\'m'], ['Karta', fmt(shift?.totalCard) + ' so\'m'],
                            ["O'tkazma", fmt(shift?.totalTransfer) + ' so\'m'], ['Nasiya', fmt(shift?.totalDebt) + ' so\'m']
                        ].map(([k, v]) => (
                            <div key={k} className="pos-shift-stat">
                                <span className="pos-shift-stat-label">{k}</span>
                                <span className="pos-shift-stat-val">{v}</span>
                            </div>
                        ))}
                    </div>
                    <div className="pos-fg"><label className="pos-label">Kassadagi haqiqiy naqd</label>
                        <input className="pos-input" type="text" inputMode="numeric" placeholder="0"
                               value={fmtPrice(closingCash)} onChange={e => setClosingCash(e.target.value.replace(/\D/g, ''))} />
                        {diff !== null && <div className={`pos-shift-diff ${diff >= 0 ? 'pos-shift-diff--ok' : 'pos-shift-diff--err'}`}>
                            {diff === 0 ? '✓ Mos keladi' : diff > 0 ? `+${fmt(diff)} so'm ortiqcha` : `-${fmt(Math.abs(diff))} so'm kam`}
                        </div>}
                    </div>
                    <div className="pos-fg"><label className="pos-label">Izoh</label>
                        <textarea className="pos-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>
                <div className="pos-mf">
                    <button className="pos-btn-s" onClick={onClose}>Bekor</button>
                    <button className="pos-btn-p pos-btn-p--danger" onClick={handle} disabled={loading}>{loading ? 'Yopilmoqda...' : 'Smena yopish'}</button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── To'lov modali ────────────────────────────
function PaymentModal({ sale, onClose, onCompleted, onCustomerSet }) {
    const total = Number(sale?.totalAmount || 0)
    const [payments, setPayments] = useState([{ method: 'CASH', amount: String(total), dueDate: '', notes: '' }])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [limitWarning, setLimitWarning] = useState(null) // { exceeded, strict, remaining, debtLimit }
    const [limitChecking, setLimitChecking] = useState(false)
    const [debtInfo, setDebtInfo] = useState(null) // { currentDebt, debtLimit, remaining, ... }

    useEffect(() => {
        const h = (e) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [onClose])

    const totalPaid = payments.reduce((s, p) => s + parseNum(p.amount), 0)
    const change = totalPaid - total
    const upd = (i, k, v) => setPayments(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

    const debtAmount = payments
        .filter(p => p.method === 'DEBT')
        .reduce((s, p) => s + parseNum(p.amount), 0)

    // DEBT tanlanganda limit tekshiruvi
    useEffect(() => {
        if (!sale?.customerId || debtAmount <= 0) { setLimitWarning(null); setDebtInfo(null); return }
        setLimitChecking(true)
        api.get(`/api/v1/customers/${sale.customerId}/check-debt-limit`, {
            params: { amount: debtAmount }
        })
            .then(res => {
                const d = res.data
                setDebtInfo(d)
                if (d.hasLimit && d.exceeded) setLimitWarning(d)
                else setLimitWarning(null)
            })
            .catch(() => { setLimitWarning(null); setDebtInfo(null) })
            .finally(() => setLimitChecking(false))
    }, [debtAmount, sale?.customerId])

    const noCustomerDebt = debtAmount > 0 && !sale.customerId

    const [custSearch, setCustSearch] = useState('')
    const [custResults, setCustResults] = useState([])
    const [custSearching, setCustSearching] = useState(false)
    const [custLinking, setCustLinking] = useState(false)
    const [showNewCust, setShowNewCust] = useState(false)
    const [newCustName, setNewCustName] = useState('')
    const [newCustPhone, setNewCustPhone] = useState('')
    const [newCustSaving, setNewCustSaving] = useState(false)
    const custTO = useRef()

    useEffect(() => {
        clearTimeout(custTO.current)
        if (!noCustomerDebt || custSearch.length < 3) { setCustResults([]); return }
        custTO.current = setTimeout(async () => {
            setCustSearching(true)
            try {
                const r = await api.get('/api/v1/customers', { params: { search: custSearch, size: 10 } })
                setCustResults(r.data.content || r.data || [])
            } catch {}
            finally { setCustSearching(false) }
        }, 300)
    }, [custSearch, noCustomerDebt])

    const linkCustomer = async (customer) => {
        if (!sale?.id) return
        setCustLinking(true)
        try {
            const r = await api.patch(`/api/v1/sales/${sale.id}/customer`, null, { params: { customerId: customer.id } })
            onCustomerSet(r.data, customer)
            setCustSearch(''); setCustResults([])
        } catch (e) {
            setError(e.response?.data?.message || 'Mijoz biriktirishda xatolik')
        } finally { setCustLinking(false) }
    }

    const createAndLinkCustomer = async () => {
        if (!newCustName.trim()) return setError('Ism kiritish shart')
        if (!newCustPhone.trim()) return setError('Telefon kiritish shart')
        setNewCustSaving(true); setError('')
        try {
            const r = await api.post('/api/v1/customers', { name: newCustName.trim(), phone: newCustPhone.trim() })
            await linkCustomer(r.data)
            setShowNewCust(false); setNewCustName(''); setNewCustPhone('')
        } catch (e) {
            setError(e.response?.data?.message || 'Mijoz yaratishda xatolik')
        } finally { setNewCustSaving(false) }
    }

    const handle = async () => {
        if (noCustomerDebt)
            return setError('Nasiya uchun mijoz tanlanishi kerak. Modalni yoping va o\'ng paneldan mijoz tanlang.')
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
            <div className="pos-modal pos-modal--xl">
                <div className="pos-mh">To'lov <button onClick={onClose} className="pos-modal-close"><X size={18} /></button></div>
                <div className="pos-mb">
                    {error && <div className="pos-alert">{error}</div>}
                    {noCustomerDebt && (
                        <div className="pos-no-cust-block">
                            <div className="pos-no-cust-header">
                                <div className="pos-no-cust-title">⚠ Nasiya uchun mijoz tanlang</div>
                                <button
                                    className={`pos-no-cust-new-btn${showNewCust ? ' active' : ''}`}
                                    onClick={() => { setShowNewCust(v => !v); setCustSearch(''); setCustResults([]) }}
                                >
                                    <Plus size={13} /> Yangi mijoz
                                </button>
                            </div>

                            {showNewCust ? (
                                <div className="pos-no-cust-form">
                                    <input className="pos-input" placeholder="Ism familiya *" autoFocus
                                           value={newCustName} onChange={e => setNewCustName(e.target.value)}
                                           onKeyDown={e => e.key === 'Enter' && createAndLinkCustomer()} />
                                    <input className="pos-input" placeholder="Telefon *" type="tel"
                                           value={newCustPhone} onChange={e => setNewCustPhone(e.target.value)}
                                           onKeyDown={e => e.key === 'Enter' && createAndLinkCustomer()} />
                                    <div className="pos-no-cust-form-actions">
                                        <button className="pos-btn-s pos-btn-s--sm" onClick={() => setShowNewCust(false)}>Bekor</button>
                                        <button className="pos-btn-p pos-btn-p--sm" onClick={createAndLinkCustomer} disabled={newCustSaving}>
                                            {newCustSaving ? 'Saqlanmoqda...' : 'Saqlash va biriktirish'}
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="pos-no-cust-search">
                                        <User size={14} className="pos-no-cust-icon" />
                                        <input
                                            className="pos-input pos-no-cust-input"
                                            placeholder="Ism yoki telefon (min 3 harf)..."
                                            value={custSearch}
                                            onChange={e => setCustSearch(e.target.value)}
                                        />
                                        {custSearch && (
                                            <button className="pos-ss-clear" onClick={() => { setCustSearch(''); setCustResults([]) }}>
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                    {custSearching && <div className="pos-no-cust-hint">Qidirilmoqda...</div>}
                                    {!custSearching && custSearch.length >= 3 && custResults.length === 0 && (
                                        <div className="pos-no-cust-hint">Topilmadi — yuqoridagi "Yangi mijoz" tugmasini bosing</div>
                                    )}
                                    {custResults.length > 0 && (
                                        <div className="pos-no-cust-list">
                                            {custResults.map(c => (
                                                <button key={c.id} className="pos-no-cust-item"
                                                        disabled={custLinking} onClick={() => linkCustomer(c)}>
                                                    <span className="pos-no-cust-name">{c.name || c.fullName}</span>
                                                    <span className="pos-no-cust-phone">{c.phone}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                    {!noCustomerDebt && debtInfo && debtInfo.hasLimit && !limitWarning && (
                        <div className="pos-debt-info-card">
                            <span>Mavjud qarz: <b>{fmt(debtInfo.currentDebt)} so'm</b></span>
                            <span>Qolgan limit: <b>{fmt(Math.max(0, debtInfo.remaining))} so'm</b></span>
                        </div>
                    )}
                    {!noCustomerDebt && limitWarning && !limitWarning.strict && (
                        <div className="pos-limit-warn">
                            ⚠ Qarz limiti oshib ketmoqda!
                            <div className="pos-limit-warn-rows">
                                <span>Limit: <b>{fmt(limitWarning.debtLimit)} so'm</b></span>
                                <span>Mavjud qarz: <b>{fmt(limitWarning.currentDebt)} so'm</b></span>
                                <span>Berish mumkin: <b>{fmt(Math.max(0, limitWarning.remaining))} so'm</b></span>
                            </div>
                        </div>
                    )}
                    {!noCustomerDebt && limitWarning?.strict && (
                        <div className="pos-limit-block">
                            🚫 Bu mijozning qarz limiti to'ldi ({fmt(limitWarning.debtLimit)} UZS). Nasiya berib bo'lmaydi!
                        </div>
                    )}
                    <div className="pos-pay-total-banner">
                        <span className="pos-pay-total-label">To'lash kerak</span>
                        <span className="pos-pay-total-value">{fmt(total)} so'm</span>
                    </div>
                    {payments.map((p, i) => (
                        <div key={i} className="pos-pay-row">
                            <div className="pos-pay-row-top">
                                <select className="pos-select pos-pay-select" value={p.method} onChange={e => upd(i, 'method', e.target.value)}>
                                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                                <input className="pos-input" type="text" inputMode="numeric" placeholder="Summa"
                                       value={fmtPrice(p.amount)} onChange={e => upd(i, 'amount', e.target.value.replace(/\D/g, ''))} />
                                {payments.length > 1 && <button onClick={() => setPayments(prev => prev.filter((_, idx) => idx !== i))}
                                                                className="pos-pay-row-del"><X size={16} /></button>}
                            </div>
                            {p.method === 'DEBT' && (
                                <div className="pos-pay-row-debt">
                                    <input className="pos-input" type="date" value={p.dueDate} onChange={e => upd(i, 'dueDate', e.target.value)} />
                                    <input className="pos-input" placeholder="Izoh" value={p.notes} onChange={e => upd(i, 'notes', e.target.value)} />
                                </div>
                            )}
                        </div>
                    ))}
                    {payments.length < 4 && (
                        <button className="pos-note-btn pos-note-btn--mb"
                                onClick={() => { const used = payments.map(p => p.method); const next = PAYMENT_METHODS.find(m => !used.includes(m.value)); if (next) setPayments(p => [...p, { method: next.value, amount: '', dueDate: '', notes: '' }]) }}>
                            <Plus size={14} /> To'lov usuli qo'shish
                        </button>
                    )}
                    <div className="pos-pay-summary">
                        <div className="pos-pay-summary-row">
                            <span className="pos-pay-summary-label">Kiritildi</span>
                            <span className="pos-pay-summary-val">{fmt(totalPaid)} so'm</span>
                        </div>
                        {change > 0 && <div className="pos-pay-change"><span>Qaytim</span><span>{fmt(change)} so'm</span></div>}
                        {change < 0 && <div className="pos-pay-remain"><span>Qoldiq</span><span>{fmt(Math.abs(change))} so'm</span></div>}
                    </div>
                </div>
                <div className="pos-mf">
                    <button className="pos-btn-s" onClick={onClose}>Bekor</button>
                    <button onClick={handle}
                            disabled={loading || totalPaid === 0 || noCustomerDebt || (limitWarning?.strict && debtAmount > 0)}
                            className={`pos-btn-p${(noCustomerDebt || (limitWarning?.strict && debtAmount > 0)) ? ' pos-btn-p--disabled' : ''}`}>
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
            .feed-zone { margin-top: 25mm; text-align: center; font-size: 6px; letter-spacing: 2px; color: #000; }
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
            <div class="payment-row"><span>${PAYMENT_METHODS.find(m => m.value === p.paymentMethod)?.label || p.paymentMethod}</span><b>${fmt(p.amount)} so'm</b></div>
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
        <div class="feed-zone">. . . . . . . . . . . . . .</div>
        </body></html>`)
        win.document.close()
        win.focus()
        setTimeout(() => { win.print(); win.close() }, 300)
    }

    const dl = async () => {
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

        line('PrimeStroy', 13, true, 'center')
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

        if (sale.debtAmount > 0) {
            divider('=')
            const dp = (sale.payments || []).find(p => p.paymentMethod === 'DEBT')
            line('*** NASIYA ***', 10, true, 'center')
            row('Nasiya miqdori:', fmt(sale.debtAmount) + " so'm")
            if (dp?.dueDate) row('Muddat:', new Date(dp.dueDate + 'T00:00:00').toLocaleDateString('ru-RU'))
        }

        divider('='); y += 2
        line('Rahmat! Yana keling :)', 9, false, 'center')
        doc.save('chek-' + sale.referenceNo + '.pdf')
    }
    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal pos-modal--md">
                <div className="pos-mh pos-mh--success">✓ Sotuv yakunlandi
                    <button onClick={onClose} className="pos-modal-close"><X size={18} /></button>
                </div>
                <div className="pos-mb">
                    <div className="receipt receipt-print-area">
                        {/* ── Header ── */}
                        <div className="receipt-store">PrimeStroy</div>
                        <div className="receipt-subtitle">SOTUV CHEKI</div>
                        <div className="receipt-div receipt-div--double" />

                        {/* ── Meta ── */}
                        <div className="receipt-meta">
                            <div><span>Chek</span><b>{sale.referenceNo}</b></div>
                            <div><span>Sana</span><span>{new Date(sale.completedAt||sale.createdAt).toLocaleString('ru-RU')}</span></div>
                            <div><span>Kassir</span><span>{sale.cashierName||sale.sellerName||'—'}</span></div>
                            {sale.customerName && <div><span>Mijoz</span><b>{sale.customerName}</b></div>}
                        </div>
                        <div className="receipt-div" />

                        {/* ── Tovarlar ── */}
                        <div className="receipt-section-label">TOVARLAR</div>
                        {(sale.items||[]).map((item,i) => (
                            <div key={i} className="receipt-item">
                                <div className="receipt-item-name">{item.productName} <span className="receipt-item-unit">({item.unitSymbol})</span></div>
                                <div className="receipt-item-row">
                                    <span className="receipt-item-qty">{item.quantity} × {fmt(item.salePrice)}</span>
                                    <b>{fmt(item.totalPrice)} so'm</b>
                                </div>
                            </div>
                        ))}

                        {/* ── Chegirma ── */}
                        {sale.discountAmount > 0 && (
                            <>
                                <div className="receipt-div" />
                                <div className="receipt-discount"><span>Chegirma</span><span>−{fmt(sale.discountAmount)} so'm</span></div>
                            </>
                        )}

                        {/* ── JAMI ── */}
                        <div className="receipt-div receipt-div--double" />
                        <div className="receipt-total">
                            <span>JAMI</span>
                            <span>{fmt(sale.totalAmount)} so'm</span>
                        </div>
                        <div className="receipt-div receipt-div--double" />

                        {/* ── To'lov ── */}
                        <div className="receipt-section-label">TO'LOV</div>
                        {(sale.payments||[]).map((p,i) => {
                            const pm = PAYMENT_METHODS.find(m => m.value === p.paymentMethod)
                            return (
                                <div key={i} className="receipt-payment">
                                    <span>{pm?.label}</span>
                                    <b>{fmt(p.amount)} so'm</b>
                                </div>
                            )
                        })}
                        {sale.changeAmount > 0 && (
                            <div className="receipt-change"><span>Qaytim</span><span>{fmt(sale.changeAmount)} so'm</span></div>
                        )}

                        {/* ── Nasiya bloki ── */}
                        {sale.debtAmount > 0 && (() => {
                            const dp = (sale.payments || []).find(p => p.paymentMethod === 'DEBT')
                            return (
                                <>
                                    <div className="receipt-div" />
                                    <div className="receipt-debt-block">
                                        <div className="receipt-debt-title">⚠ NASIYA YOZUVI</div>
                                        {sale.customerName && (
                                            <div className="receipt-debt-row">
                                                <span>Mijoz</span><b>{sale.customerName}</b>
                                            </div>
                                        )}
                                        <div className="receipt-debt-row">
                                            <span>Summa</span><b>{fmt(sale.debtAmount)} so'm</b>
                                        </div>
                                        {dp?.dueDate && (
                                            <div className="receipt-debt-row">
                                                <span>To'lov muddati</span>
                                                <b>{new Date(dp.dueDate + 'T00:00:00').toLocaleDateString('ru-RU')}</b>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )
                        })()}

                        {/* ── Footer ── */}
                        <div className="receipt-div receipt-div--double" />
                        <div className="receipt-thanks">Xaridingiz uchun rahmat!</div>
                    </div>
                </div>
                <div className="pos-mf">
                    <button className="pos-btn-s" onClick={dl}><span className="pos-btn-icon"><Download size={14} />PDF</span></button>
                    <button className="pos-btn-s" onClick={printReceipt}><span className="pos-btn-icon"><Printer size={14} />Chop etish</span></button>
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
        <div className="pos-overlay pos-overlay--top">
            <div className="pos-modal pos-modal--md">
                <div className="pos-mh">
                    {title}
                    <button onClick={onClose} className="pos-modal-close"><X size={18} /></button>
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
                    {isCustomer && (
                        <div className="pos-debt-limit-box">
                            <div className="pos-debt-limit-title">Qarz limiti (ixtiyoriy)</div>
                            <div className="pos-fg pos-fg--mb8">
                                <label className="pos-label">Maksimal nasiya summasi (UZS)</label>
                                <input className="pos-input" placeholder="Bo'sh = limit yo'q"
                                       value={debtLimit}
                                       onChange={e => setDebtLimit(e.target.value.replace(/\D/g, ''))} />
                            </div>
                            {debtLimit && (
                                <div className="pos-debt-limit-btns">
                                    <button type="button"
                                            onClick={() => setDebtLimitStrict(false)}
                                            className={`pos-debt-limit-btn${!debtLimitStrict ? ' pos-debt-limit-btn--warn' : ''}`}>
                                        ⚠ Ogohlantirish
                                    </button>
                                    <button type="button"
                                            onClick={() => setDebtLimitStrict(true)}
                                            className={`pos-debt-limit-btn${debtLimitStrict ? ' pos-debt-limit-btn--block' : ''}`}>
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
        </div>,
        document.body
    )
}

// ─── Bir birlik uchun ombordan stock hisoblash ─────────────────────────────
// Non-base unit bo'lsa, base unit stock / conversionFactor qaytaradi
function resolveUnitStock(unit, allUnits, warehouseId) {
    const cf = Number(unit.conversionFactor ?? 1) || 1
    if (unit.isBaseUnit || cf === 1) {
        const ws = warehouseId
            ? (unit.warehouseStocks || []).find(w => w.warehouseId === warehouseId)
            : (unit.warehouseStocks || [])[0]
        return ws ? Number(ws.quantity) : null
    }
    // Non-base: base unit ni top
    const baseUnit = allUnits.find(u => u.isBaseUnit)
    if (!baseUnit) return null
    const ws = warehouseId
        ? (baseUnit.warehouseStocks || []).find(w => w.warehouseId === warehouseId)
        : (baseUnit.warehouseStocks || [])[0]
    if (!ws) return null
    return Math.floor(Number(ws.quantity) / cf * 100) / 100
}

// ─── Unit tanlash ─────────────────────────────
function UnitModal({ data, onSelect, onClose, warehouseId }) {
    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal pos-modal--sm">
                <div className="pos-mh">{data.productName}
                    <button onClick={onClose} className="pos-modal-close"><X size={18} /></button>
                </div>
                <div className="pos-mb">
                    <p className="pos-unit-hint">O'lchov birligini tanlang:</p>
                    <div className="pos-unit-list">
                        {data.units.map(u => {
                            const stock = resolveUnitStock(u, data.units, warehouseId)
                            const oos = stock !== null && stock <= 0
                            return (
                                <button key={u.id} onClick={() => onSelect(data.product, u)}
                                        className={`pos-unit-item${oos ? ' pos-unit-item--oos' : ''}`}>
                                    <div>
                                        <div className="pos-unit-symbol">{u.unitName || u.unitSymbol}</div>
                                        <div className="pos-unit-barcode">{u.unitSymbol}{u.barcode ? ` · ${u.barcode}` : ''}</div>
                                    </div>
                                    <div className="pos-unit-right">
                                        <div className="pos-unit-price">{fmt(u.salePrice)} so'm</div>
                                        {stock !== null && (
                                            <div className={`pos-stock-badge${oos ? ' pos-stock-badge--oos' : ' pos-stock-badge--ok'}`}>
                                                {oos ? 'Stokda yo\'q' : `${stock} ta`}
                                            </div>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── ApprovePendingModal olib tashlandi — pending orders to'g'ridan cart ga yuklanadi (openPending)
function ApprovePendingModal({ sale, onClose, onApproved }) {
    const total = Number(sale?.totalAmount || 0)
    const [payments, setPayments] = useState([{ method: 'CASH', amount: String(total), dueDate: '', notes: '' }])
    const [discountType, setDiscountType] = useState('PERCENT')
    const [discountValue, setDiscountValue] = useState('')
    const [customerId, setCustomerId] = useState(sale?.customerId ? String(sale.customerId) : '')
    const [customerSearch, setCustomerSearch] = useState(sale?.customerName || '')
    const [customers, setCustomers] = useState(sale?.customerId ? [{ id: sale.customerId, name: sale.customerName, phone: sale.customerPhone }] : [])
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const customerTO = useRef()

    const discountAmount = (() => {
        if (!discountValue) return 0
        const v = parseNum(discountValue)
        return discountType === 'PERCENT' ? total * v / 100 : Math.min(v, total)
    })()
    const finalTotal = total - discountAmount

    const totalPaid = payments.reduce((s, p) => s + parseNum(p.amount), 0)
    const change = totalPaid - finalTotal

    const upd = (i, k, v) => setPayments(p => p.map((item, idx) => idx === i ? { ...item, [k]: v } : item))

    const searchCustomers = (q) => {
        clearTimeout(customerTO.current)
        if (q.length < 2) { setCustomers([]); return }
        customerTO.current = setTimeout(async () => {
            const r = await api.get('/api/v1/customers', { params: { search: q, size: 10 } })
            setCustomers(r.data.content || r.data || [])
        }, 300)
    }

    const handle = async () => {
        if (totalPaid < finalTotal) return setError("To'lov yetarli emas")
        setLoading(true); setError('')
        try {
            const payload = {
                customerId: customerId ? Number(customerId) : null,
                discountType: discountValue ? discountType : null,
                discountValue: discountValue ? parseNum(discountValue) : null,
                notes: notes || null,
                payments: payments.map(p => ({
                    paymentMethod: p.method,
                    amount: parseNum(p.amount),
                    dueDate: p.dueDate || null,
                    notes: p.notes || null
                }))
            }
            const r = await salesApi.approvePending(sale.id, payload)
            onApproved(r.data)
        } catch (e) {
            setError(e.response?.data?.message || 'Xatolik')
        } finally { setLoading(false) }
    }

    return ReactDOM.createPortal(
        <div className="pos-overlay">
            <div className="pos-modal pos-modal--lg">
                <div className="pos-mh">
                    Buyurtmani tasdiqlash — {sale.referenceNo}
                    <button onClick={onClose} className="pos-modal-close"><X size={18} /></button>
                </div>
                <div className="pos-mb">
                    {error && <div className="pos-alert">{error}</div>}

                    {/* Mahsulotlar (read-only) */}
                    <div className="pos-approve-items">
                        {(sale.items || []).map(item => (
                            <div key={item.id} className="pos-approve-item">
                                <span className="pos-approve-item-name">{item.productName}</span>
                                <span className="pos-approve-item-qty">{item.quantity} {item.unitSymbol}</span>
                                <span className="pos-approve-item-price">{fmt(item.totalPrice)} so'm</span>
                            </div>
                        ))}
                        <div className="pos-approve-subtotal">
                            Jami (chegirmadan oldin): <b>{fmt(total)} so'm</b>
                        </div>
                    </div>

                    {/* Mijoz */}
                    <div className="pos-fg">
                        <label className="pos-label">Mijoz (ixtiyoriy)</label>
                        <div style={{ position: 'relative' }}>
                            <input className="pos-input"
                                placeholder="Qidirish..."
                                value={customers.find(c => String(c.id) === customerId)
                                    ? customers.find(c => String(c.id) === customerId).name
                                    : customerSearch}
                                readOnly={!!customerId}
                                onChange={e => { setCustomerSearch(e.target.value); setCustomerId(''); searchCustomers(e.target.value) }}
                            />
                            {customerId && <button onClick={() => { setCustomerId(''); setCustomerSearch('') }}
                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <X size={14} />
                            </button>}
                            {!customerId && customerSearch.length >= 2 && customers.length > 0 && (
                                <div className="pos-ss-dropdown">
                                    {customers.map(c => (
                                        <div key={c.id} className="pos-ss-item" onClick={() => { setCustomerId(String(c.id)); setCustomerSearch('') }}>
                                            <div className="pos-ss-item-name">{c.name}</div>
                                            {c.phone && <div className="pos-ss-item-sub">{c.phone}</div>}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chegirma */}
                    <div className="pos-fg">
                        <label className="pos-label">Chegirma (ixtiyoriy)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="pos-select" style={{ width: 120 }} value={discountType} onChange={e => setDiscountType(e.target.value)}>
                                <option value="PERCENT">%</option>
                                <option value="AMOUNT">so'm</option>
                            </select>
                            <input className="pos-input" type="text" inputMode="numeric" placeholder="0"
                                value={fmtPrice(discountValue)} onChange={e => setDiscountValue(e.target.value.replace(/\D/g, ''))} />
                        </div>
                        {discountAmount > 0 && <div style={{ color: '#22c55e', fontSize: 13, marginTop: 4 }}>
                            −{fmt(discountAmount)} so'm → Jami: {fmt(finalTotal)} so'm
                        </div>}
                    </div>

                    {/* To'lov */}
                    <div className="pos-fg">
                        <label className="pos-label">To'lov usuli</label>
                        {payments.map((p, i) => (
                            <div key={i} className="pos-pay-row">
                                <select className="pos-select pos-pay-method"
                                    value={p.method}
                                    onChange={e => upd(i, 'method', e.target.value)}>
                                    {PAYMENT_METHODS.map(m => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                                <input className="pos-input pos-pay-amount"
                                    type="text" inputMode="numeric"
                                    value={fmtPrice(p.amount)}
                                    onChange={e => upd(i, 'amount', e.target.value.replace(/\D/g, ''))} />
                                {p.method === 'DEBT' && (
                                    <input className="pos-input" type="date"
                                        value={p.dueDate} onChange={e => upd(i, 'dueDate', e.target.value)} />
                                )}
                                {payments.length > 1 && (
                                    <button className="pos-pay-remove" onClick={() => setPayments(p => p.filter((_, idx) => idx !== i))}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button className="pos-pay-add" onClick={() => setPayments(p => [...p, { method: 'CASH', amount: '', dueDate: '', notes: '' }])}>
                            + To'lov qo'shish
                        </button>
                    </div>

                    {/* Qaytim */}
                    {change > 0 && (
                        <div className="pos-change-row">
                            Qaytim: <b style={{ color: '#22c55e' }}>{fmt(change)} so'm</b>
                        </div>
                    )}

                    {/* Izoh */}
                    <div className="pos-fg">
                        <label className="pos-label">Izoh (ixtiyoriy)</label>
                        <textarea className="pos-input" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                </div>
                <div className="pos-mf">
                    <button className="pos-btn-s" onClick={onClose}>Bekor</button>
                    <button className="pos-btn-p" onClick={handle} disabled={loading || totalPaid < finalTotal}>
                        {loading ? 'Saqlanmoqda...' : `✓ Tasdiqlash — ${fmt(finalTotal)} so'm`}
                    </button>
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
    const [staleShift, setStaleShift] = useState(false)
    const [warehouses, setWarehouses] = useState([])
    const [customers, setCustomers] = useState([])

    // Qidiruv
    const [search, setSearch] = useState('')
    const [searchResults, setSearchResults] = useState([])
    const [searching, setSearching] = useState(false)
    const [showDrop, setShowDrop] = useState(false)
    const [dropIdx, setDropIdx] = useState(-1) // dropdown keyboard navigation
    const searchRef = useRef()
    const searchTO = useRef()
    const scannerBuffer = useRef('')      // barcode scanner bufer
    const scannerTimer = useRef(null)     // scanner timeout

    const { user } = useAuth()
    const navigate = useNavigate()
    const isAdmin = ['ADMIN', 'OWNER', 'ROLE_ADMIN', 'ROLE_OWNER'].includes(user?.role)
    const [priceInfoId, setPriceInfoId] = React.useState(null)
    const [holdSales, setHoldSales] = React.useState([])
    const [showHoldList, setShowHoldList] = React.useState(false)
    const [holdTab, setHoldTab] = React.useState('hold')  // 'hold' | 'pending'
    const [myPendingOrders, setMyPendingOrders] = React.useState([])
    const myPendingRef = React.useRef([])
    const [favorites, setFavorites] = React.useState(() => getTopFavs())
    const [showCamera, setShowCamera] = React.useState(false)
    const [showSubmitModal, setShowSubmitModal] = React.useState(false)
    const [submitNote, setSubmitNote] = React.useState('')
    const [confirmCancel, setConfirmCancel] = React.useState(null)  // { id, referenceNo }
    const [rejectModal, setRejectModal] = React.useState(null)     // { id, referenceNo }
    const [rejectReason, setRejectReason] = React.useState('')
    const [confirmCancelPending, setConfirmCancelPending] = React.useState(null)  // { id, referenceNo }
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
    const showToastFn = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }
    const showToastRef = React.useRef(showToastFn)
    React.useEffect(() => { showToastRef.current = showToastFn })
    const showToast = (...args) => showToastRef.current(...args)

    // Pending orders (ega uchun)
    const [pendingOrders, setPendingOrders] = useState([])

    // Modals
    const [unitModal, setUnitModal] = useState(null)
    const [createModal, setCreateModal] = useState(null) // 'customer' | 'partner'
    const [currentSale, setCurrentSale] = useState(null)
    const currentSaleRef = useRef(null) // stale closure dan himoya
    const [lastSale, setLastSale] = useState(null)
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
        loadMyPending()
        if (isAdmin) loadPendingOrders()
        api.get('/api/v1/warehouses?size=100&active=true').then(r => setWarehouses(r.data.content || r.data || []))
    }, [])

    // Polling: har 8 soniyada PENDING statusni tekshirish (kassir)
    useEffect(() => {
        if (isAdmin) return
        const interval = setInterval(() => loadMyPending(true), 8000)
        return () => clearInterval(interval)
    }, [isAdmin])

    // Polling: har 10 soniyada admin pending listni yangilash
    useEffect(() => {
        if (!isAdmin) return
        const interval = setInterval(() => loadPendingOrders(), 10000)
        return () => clearInterval(interval)
    }, [isAdmin])

    const loadShift = async () => {
        setShiftLoading(true)
        try {
            const r = await shiftsApi.getCurrent()
            setShift(r.data)
            // Smena bugun ochilganmi? Yo'q bo'lsa — ogohlantirish
            // sessionStorage da yopilgan shiftId saqlanadi — dismiss saqlanadi
            const openedAt = new Date(r.data.openedAt)
            const today = new Date()
            const isStale = openedAt.toDateString() !== today.toDateString()
            const dismissKey = `staleShiftDismissed_${r.data.id}_${today.toDateString()}`
            setStaleShift(isStale && !sessionStorage.getItem(dismissKey))
        }
        catch { setShift(null) }
        finally { setShiftLoading(false) }
    }

    // ── Barcode/QR qidiruv (scanner + kamera uchun umumiy) ──────
    const searchByBarcode = (code) => {
        api.get('/api/v1/products/barcode/' + encodeURIComponent(code))
            .then(r => { if (r.data) selectProduct(r.data) })
            .catch(() => {
                api.get('/api/v1/products', { params: { search: code, size: 5, active: true } })
                    .then(r => {
                        const list = r.data.content || r.data || []
                        if (list.length === 1) selectProduct(list[0])
                        else if (list.length > 1) {
                            const exact = list.find(p =>
                                p.units?.some(u => u.barcode === code) || p.defaultBarcode === code)
                            if (exact) selectProduct(exact)
                            else { setSearchResults(list); setSearch(code); setShowDrop(true) }
                        } else showToast('Barcode topilmadi: ' + code, 'error')
                    })
                    .catch(() => showToast('Xatolik yuz berdi', 'error'))
            })
    }

    // ── Barcode scanner detector ────────────────────────────────
    useEffect(() => {
        const BARCODE_LENGTHS = [8, 12, 13]
        const handleScannerKey = (e) => {
            const hasModal = showPayment || completedSale || confirmCancel || warehouseModal
            if (hasModal) return
            if (e.key === 'Enter') {
                const buf = scannerBuffer.current.trim()
                scannerBuffer.current = ''
                clearTimeout(scannerTimer.current)
                if (buf.length >= 4) {
                    e.stopPropagation() // search input Enter handlerini bloklash
                    setSearch('')       // search inputdagi matnni tozalash
                    searchByBarcode(buf)
                }
                return
            }
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                scannerBuffer.current += e.key
                clearTimeout(scannerTimer.current)
                const buf = scannerBuffer.current.trim()
                if (BARCODE_LENGTHS.includes(buf.length) && /^\d+$/.test(buf)) {
                    scannerTimer.current = setTimeout(() => {
                        const finalBuf = scannerBuffer.current.trim()
                        scannerBuffer.current = ''
                        if (finalBuf.length >= 4) {
                            setSearch('')
                            searchByBarcode(finalBuf)
                        }
                    }, 80)
                } else {
                    scannerTimer.current = setTimeout(() => { scannerBuffer.current = '' }, 400)
                }
            }
        }
        window.addEventListener('keydown', handleScannerKey, true)
        return () => window.removeEventListener('keydown', handleScannerKey, true)
    }, [showPayment, completedSale, confirmCancel, warehouseModal])

    // ── Global Ctrl+V — input aktiv bo'lmasa ham paste ishlaydi ──
    useEffect(() => {
        const h = (e) => {
            if (!e.ctrlKey || e.key !== 'v') return
            const tag = document.activeElement.tagName
            const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
            const hasModal = showPayment || completedSale || confirmCancel || warehouseModal
            if (inInput || hasModal) return  // input aktiv bo'lsa — oddiy paste ishlaydi

            e.preventDefault()
            // Clipboarddan o'qib, search inputga focus + paste
            navigator.clipboard.readText().then(text => {
                const q = text.trim()
                if (!q) return
                searchRef.current?.focus()
                setSearch(q)
                // Barcode formatida bo'lsa — avtomatik qidirish
                if (/^\d{4,}$/.test(q)) {
                    setTimeout(() => {
                        api.get('/api/v1/products/barcode/' + encodeURIComponent(q))
                            .then(r => { if (r.data) { selectProduct(r.data); setSearch('') } })
                            .catch(() => {
                                api.get('/api/v1/products', { params: { search: q, size: 5, active: true } })
                                    .then(r => {
                                        const list = r.data.content || r.data || []
                                        if (list.length === 1) { selectProduct(list[0]); setSearch('') }
                                    })
                            })
                    }, 100)
                }
            }).catch(() => {
                // Clipboard API ishlamasa — inputga focus qilib oddiy paste ishlaydi
                searchRef.current?.focus()
            })
        }
        window.addEventListener('keydown', h, true)
        return () => window.removeEventListener('keydown', h, true)
    }, [showPayment, completedSale, confirmCancel, warehouseModal])

    // ── Keyboard shortcuts ──────────────────────────────────────
    useEffect(() => {
        const h = (e) => {
            const tag = document.activeElement.tagName
            const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
            const hasModal = showPayment || completedSale || confirmCancel || warehouseModal

            if (e.key === 'Escape') {
                setShowDrop(false); setSearch(''); setDropIdx(-1); searchRef.current?.blur()
                return
            }

            // F2 — to'lov modali (modal ochiq bo'lmasa)
            if (e.key === 'F2' && !hasModal) {
                e.preventDefault()
                if (cart.length) handlePay()
                return
            }

            // F4 — kechiktirish (modal ochiq bo'lmasa)
            if (e.key === 'F4' && !hasModal) {
                e.preventDefault()
                if (cart.length) handleHold()
                return
            }

            // F1 — savatchani tozalash
            if (e.key === 'F1' && !hasModal) {
                e.preventDefault()
                if (cart.length) clearCart()
                return
            }

            if (hasModal || inInput) return

            // Delete — aktiv itemni o'chirish
            if (e.key === 'Delete' && !showDrop && cart.length > 0) {
                e.preventDefault()
                const item = cart[activeIdx]
                if (item) removeItem(item.productUnitId)
                return
            }

            // ArrowUp/Down — savat navigatsiya
            if (!showDrop) {
                if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)) }
                if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(cart.length - 1, i + 1)) }
                if (e.key === 'ArrowRight') setCart(prev => prev.map((c, i) => i === activeIdx ? { ...c, quantity: c.quantity + 1 } : c))
                if (e.key === 'ArrowLeft') setCart(prev => prev.map((c, i) => i === activeIdx ? { ...c, quantity: Math.max(0.001, c.quantity - 1) } : c).filter(c => c.quantity > 0))
            }

            // Har qanday harf/raqam — search inputga focus
            if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                searchRef.current?.focus()
            }
        }
        window.addEventListener('keydown', h)
        return () => window.removeEventListener('keydown', h)
    }, [cart, activeIdx, showDrop, showPayment, completedSale, confirmCancel, warehouseModal, currentSale])

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
        if (!search.trim()) { setSearchResults([]); setShowDrop(false); setDropIdx(-1); return }
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

    // ── Dropdown keyboard highlight → scroll into view ──
    useEffect(() => {
        if (dropIdx < 0) return
        const el = document.querySelector('.pos-search-item--active')
        el?.scrollIntoView({ block: 'nearest' })
    }, [dropIdx])

    // ── Mahsulot tanlash ────────────
    const selectProduct = async (product) => {
        setSearch(''); setShowDrop(false); setDropIdx(-1)
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
        const allUnits = product.units || []
        const stock = resolveUnitStock(unit, allUnits, shift?.warehouseId) ?? 0
        if (stock <= 0) {
            showToast(`${product.name} (${unit.unitSymbol}) — stokda yo'q`, 'error')
            return
        }
        // Favorites tracking
        saveFav(product.id, product.name, Math.round(Number(unit.salePrice || 0)), product.imageUrl || null)
        setFavorites(getTopFavs())
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

    const updateQty = (id, delta) => {
        const updated = cart.map(c => {
            if (c.productUnitId !== id) return c
            const newQty = Math.round((c.quantity + delta) * 1000) / 1000
            if (newQty <= 0) return { ...c, quantity: 0 }
            if (delta > 0 && c.availableStock != null && newQty > c.availableStock) {
                showToast(`Omborda faqat ${c.availableStock} ${c.unitSymbol} bor`, 'error')
                return c
            }
            return { ...c, quantity: newQty }
        }).filter(c => c.quantity > 0)

        if (updated.length === 0) {
            clearCart()  // oxirgi mahsulot 0 ga tushdi — DRAFTni ham bekor qilamiz
        } else {
            setCart(updated)
        }
    }
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
    const removeItem = (id) => {
        const next = cart.filter(c => c.productUnitId !== id)
        if (next.length === 0) {
            clearCart()  // oxirgi mahsulot o'chirildi — DRAFTni ham bekor qilamiz
        } else {
            setCart(next)
        }
    }

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
        // Agar DRAFT allaqachon mavjud bo'lsa — yangisini yaratmasdan to'lov modalini ochamiz
        // Ref ishlatiladi — React state async bo'lgani uchun (stale closure muammosi)
        if (currentSaleRef.current?.id) {
            setShowPayment(true)
            return
        }
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
            currentSaleRef.current = r.data
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

    // ── Pending orders ───────────────
    const loadPendingOrdersFn = async () => {
        try {
            const r = await salesApi.getPending({ size: 50 })
            setPendingOrders(r.data.content || [])
        } catch { /* ruxsat yo'q bo'lsa — jim */ }
    }
    const loadPendingOrdersRef = React.useRef(loadPendingOrdersFn)
    React.useEffect(() => { loadPendingOrdersRef.current = loadPendingOrdersFn })
    const loadPendingOrders = (...args) => loadPendingOrdersRef.current(...args)

    // ── Hold ────────────────────────
    const loadHoldSalesFn = async () => {
        try {
            const r = await api.get('/api/v1/sales/open?size=50')
            setHoldSales(r.data.content || [])
        } catch (e) {
            console.error('Hold load error:', e.response?.status, e.response?.data)
        }
    }
    const loadHoldSalesRef = React.useRef(loadHoldSalesFn)
    React.useEffect(() => { loadHoldSalesRef.current = loadHoldSalesFn })
    const loadHoldSales = (...args) => loadHoldSalesRef.current(...args)

    const loadMyPending = async (silent = false) => {
        try {
            const r = await salesApi.getMyPending({ size: 50 })
            const newOrders = r.data.content || []
            if (silent) {
                const newIds = new Set(newOrders.map(o => o.id))
                const disappeared = myPendingRef.current.filter(o => !newIds.has(o.id))
                myPendingRef.current = newOrders
                setMyPendingOrders(newOrders)
                console.log('[polling] disappeared:', disappeared.map(o => o.id), 'newOrders:', newOrders.map(o => o.id))
                for (const o of disappeared) {
                    try {
                        const detail = await salesApi.getById(o.id)
                        const s = detail.data
                        console.log('[polling] sale', o.id, 'status:', s.status, 'notes:', s.notes)
                        if (s.status === 'HOLD') {
                            const rejLine = s.notes?.split('\n').find(l => l.includes('Rad etildi'))
                            const reason = rejLine ? rejLine.replace('Rad etildi: ', '').trim() : ''
                            showToast(
                                reason
                                    ? `↩ #${o.referenceNo} qaytarildi: ${reason}`
                                    : `↩ #${o.referenceNo} admin tomonidan qaytarildi`,
                                'error'
                            )
                            await loadHoldSales()
                            setHoldTab('hold')
                            setShowHoldList(true)
                        } else if (s.status === 'COMPLETED') {
                            showToast(`✓ #${o.referenceNo} tasdiqlandi!`, 'success')
                        }
                    } catch (e) { console.error('[polling] xatolik:', e) }
                }
            } else {
                myPendingRef.current = newOrders
                setMyPendingOrders(newOrders)
            }
        } catch { /* ruxsat yo'q bo'lsa — jim */ }
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
            currentSaleRef.current = s
            setShowHoldList(false)
            await loadHoldSales()
            showToast('Savatcha qaytarildi')
        } catch (e) { showToast(e.response?.data?.message || 'Xatolik', 'error') }
    }

    const openPending = async (order) => {
        try {
            await salesApi.takePending(order.id)
            clearCart()
            const r = await api.get(`/api/v1/sales/${order.id}`)
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
            currentSaleRef.current = s
            setShowHoldList(false)
            loadPendingOrders()
            showToast(`📋 #${s.referenceNo} savatchaga olindi`)
        } catch (e) { showToast(e.response?.data?.message || 'Xatolik', 'error') }
    }

    const handleSubmitPending = async (note) => {
        if (!cart.length || !shift) return
        setSaving(true)
        setShowSubmitModal(false)
        setSubmitNote('')
        try {
            let submitted
            if (currentSaleRef.current?.id) {
                // Mavjud DRAFT bor (HOLDdan qaytarilgan) — itemlarni yangilab qayta yuboramiz
                submitted = await salesApi.resubmitWithItems(currentSaleRef.current.id, {
                    note: note?.trim() || null,
                    items: cart.map(c => ({
                        productUnitId: c.productUnitId,
                        warehouseId: shift.warehouseId,
                        quantity: c.quantity,
                        salePrice: c.salePrice
                    }))
                })
            } else {
                // Yangi savatcha — yangi draft yaratib yuboramiz
                const r = await salesApi.createDraft({
                    warehouseId: shift.warehouseId,
                    customerId: customerId ? Number(customerId) : null,
                    items: cart.map(c => ({ productUnitId: c.productUnitId, warehouseId: shift.warehouseId, quantity: c.quantity, salePrice: c.salePrice })),
                    payments: []
                })
                submitted = await salesApi.submitPending(r.data.id, note?.trim() || null)
            }
            clearCart(false)
            setCurrentSale(null)
            currentSaleRef.current = null
            myPendingRef.current = [submitted.data]
            setMyPendingOrders([submitted.data])
            showToast('Buyurtma adminga yuborildi', 'success')
        } catch (e) { showToast(e.response?.data?.message || 'Xatolik', 'error') }
        finally { setSaving(false) }
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
            if (currentSaleRef.current?.id === saleId) {
                setCurrentSale(null)
                currentSaleRef.current = null
                clearCart(false)  // resetSale=false — cancel allaqachon yuborildi
            }
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
        // Agar DRAFT savatcha mavjud bo'lsa — backend da ham bekor qilish kerak
        if (resetSale && currentSaleRef.current?.id) {
            const saleId = currentSaleRef.current.id
            currentSaleRef.current = null
            api.patch(`/api/v1/sales/${saleId}/cancel`)
                .then(() => loadHoldSales())
                .catch(e => { console.error(e); showToast('Savatcha bekor qilishda xatolik', 'error') })
        }
        setCart([]); setCustomerId(''); setCustomerSearch('')
        localStorage.removeItem('pos_cart'); localStorage.removeItem('pos_ref')
        setPartnerId(''); setPartnerSearch(''); setDiscountValue(''); setNotes('')
        if (resetSale) setCurrentSale(null)
        setActiveIdx(0)
    }

    if (shiftLoading) return (
        <div className="pos-loading-wrap">
            <RefreshCw size={24} className="spin" style={{ color: '#2563eb' }} />
            <span className="pos-loading-text">Yuklanmoqda...</span>
        </div>
    )

    return (
        <>
            <div className="pos-root">

                {/* Modals */}
                {!shift && <OpenShiftModal warehouses={warehouses} onOpen={(s) => { setShift(s); setStaleShift(false) }} />}
                {showCloseShift && <CloseShiftModal shift={shift} onClose={() => setShowCloseShift(false)} onClosed={() => { setShift(null); setShowCloseShift(false) }} />}
                {showCamera && <CameraScanner onDetected={searchByBarcode} onClose={() => setShowCamera(false)} />}
                {/* Kassirga qaytarish modal */}
                {rejectModal && (
                    <div className="pos-overlay" onClick={() => { setRejectModal(null); setRejectReason('') }}>
                        <div className="pos-modal pos-submit-modal" onClick={e => e.stopPropagation()}>
                            <div className="pos-submit-modal-header" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                                <span>↩</span>
                                <span>Kassirga qaytarish — #{rejectModal.referenceNo}</span>
                            </div>
                            <div className="pos-submit-modal-body">
                                <label className="pos-submit-label">Sabab (ixtiyoriy)</label>
                                <textarea
                                    className="pos-submit-textarea"
                                    placeholder="Masalan: narx noto'g'ri, mahsulot yo'q..."
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    rows={3}
                                    autoFocus
                                />
                            </div>
                            <div className="pos-submit-modal-footer">
                                <button className="pos-modal-btn-cancel" onClick={() => { setRejectModal(null); setRejectReason('') }}>
                                    Bekor qilish
                                </button>
                                <button style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:7, background:'#ef4444', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}
                                        onClick={async () => {
                                            await salesApi.rejectPending(rejectModal.id, rejectReason.trim() || undefined)
                                            setRejectModal(null); setRejectReason('')
                                            // Agar admin cartida shu buyurtma ochiq bo'lsa — tozalaymiz
                                            if (currentSaleRef.current?.id === rejectModal.id) {
                                                currentSaleRef.current = null
                                                setCurrentSale(null)
                                                clearCart(false)
                                            }
                                            loadPendingOrders()
                                            showToast('Kassirga qaytarildi')
                                        }}>
                                    Qaytarish
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Pending bekor qilish tasdiqi */}
                {confirmCancelPending && (
                    <div className="pos-overlay" onClick={() => setConfirmCancelPending(null)}>
                        <div className="pos-modal pos-submit-modal" onClick={e => e.stopPropagation()}>
                            <div className="pos-submit-modal-header" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                                <span>✕</span>
                                <span>Bekor qilish — #{confirmCancelPending.referenceNo}</span>
                            </div>
                            <div className="pos-submit-modal-body" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                                Bu buyurtma butunlay bekor qilinadi. Kassir qayta yuborishi kerak bo'ladi.
                            </div>
                            <div className="pos-submit-modal-footer">
                                <button className="pos-modal-btn-cancel" onClick={() => setConfirmCancelPending(null)}>
                                    Yopish
                                </button>
                                <button style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:7, background:'#ef4444', color:'#fff', border:'none', fontSize:13, fontWeight:600, cursor:'pointer' }}
                                        onClick={async () => {
                                            await salesApi.cancel(confirmCancelPending.id)
                                            setConfirmCancelPending(null)
                                            loadPendingOrders()
                                            showToast('Bekor qilindi')
                                        }}>
                                    Ha, bekor qilish
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {showSubmitModal && (
                    <div className="pos-overlay" onClick={() => { setShowSubmitModal(false); setSubmitNote('') }}>
                        <div className="pos-modal pos-submit-modal" onClick={e => e.stopPropagation()}>
                            <div className="pos-submit-modal-header">
                                <Bell size={16} />
                                <span>Adminga yuborish</span>
                            </div>
                            <div className="pos-submit-modal-body">
                                <label className="pos-submit-label">Izoh (ixtiyoriy)</label>
                                <textarea
                                    className="pos-submit-textarea"
                                    placeholder="Masalan: mijoz chegirma so'radi, eski narxda..."
                                    value={submitNote}
                                    onChange={e => setSubmitNote(e.target.value)}
                                    rows={3}
                                    autoFocus
                                />
                            </div>
                            <div className="pos-submit-modal-footer">
                                <button className="pos-modal-btn-cancel" onClick={() => { setShowSubmitModal(false); setSubmitNote('') }}>
                                    Bekor qilish
                                </button>
                                <button className="pos-modal-btn-submit" onClick={() => handleSubmitPending(submitNote)} disabled={saving}>
                                    <Bell size={14} />
                                    Yuborish
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {/* Toast */}
                {toast && (
                    <div className={`pos-toast pos-toast--${toast.type}`}>
                        {toast.msg}
                    </div>
                )}

                {createModal && <CreateModal type={createModal} onClose={() => setCreateModal(null)} onCreated={handleCreated} />}
                {unitModal && <UnitModal data={unitModal} onSelect={addUnitToCart} onClose={() => setUnitModal(null)} warehouseId={shift?.warehouseId} />}

                {/* ── Ombor tanlash modal ── */}
                {warehouseModal && (
                    <div className="pos-confirm-overlay" onClick={() => setWarehouseModal(null)}>
                        <div className="pos-confirm-modal pos-wh-modal" onClick={e => e.stopPropagation()}>
                            <div className="pos-confirm-title">Ombor tanlash</div>
                            <div className="pos-confirm-desc">
                                Quyidagi tovarlar bir nechta omborda mavjud. Har biri uchun ombor tanlang:
                            </div>
                            <div className="pos-wh-list">
                                {warehouseModal.items.map(item => {
                                    const cartItem = cart.find(c => c.productUnitId === item.productUnitId)
                                    return (
                                        <div key={item.productUnitId} className="pos-wh-select-row">
                                            <div className="pos-wh-select-name">{cartItem?.productName}</div>
                                            <div className="pos-wh-btns">
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
                                <button className="pos-confirm-btn-ok pos-confirm-btn-ok--blue" onClick={confirmWarehouseSelection}>
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
                    <button className="pos-back-btn" onClick={() => navigate('/')} title="Bosh sahifa">
                        <Home size={18} />
                    </button>
                    <div className="pos-search-wrap">
                        <Search size={16} className="pos-search-icon" />
                        <input ref={searchRef} className="pos-search"
                               placeholder="Artikul, shtrix-kod yoki nom yozing..."
                               value={search}
                               onChange={e => setSearch(e.target.value)}
                               onFocus={() => search && setShowDrop(true)}
                               onBlur={() => setTimeout(() => setShowDrop(false), 150)}
                               onKeyDown={e => {
                                   if (e.key === 'ArrowDown' && showDrop && searchResults.length > 0) {
                                       e.preventDefault()
                                       setDropIdx(i => Math.min(i + 1, searchResults.length - 1))
                                       return
                                   }
                                   if (e.key === 'ArrowUp' && showDrop && searchResults.length > 0) {
                                       e.preventDefault()
                                       setDropIdx(i => Math.max(i - 1, -1))
                                       return
                                   }
                                   if (e.key === 'Enter') {
                                       e.preventDefault()
                                       // Dropdown da highlight bo'lgan element bo'lsa — uni tanla
                                       if (showDrop && dropIdx >= 0 && searchResults[dropIdx]) {
                                           selectProduct(searchResults[dropIdx])
                                           return
                                       }
                                       if (!search.trim()) return
                                       const q = search.trim()
                                       // Agar bitta natija bo'lsa — darhol tanlash
                                       if (searchResults.length === 1) {
                                           selectProduct(searchResults[0])
                                           return
                                       }
                                       // Aniq moslik tekshirish
                                       const exact = searchResults.find(p =>
                                           p.defaultBarcode === q || p.sku === q ||
                                           p.units?.some(u => u.barcode === q)
                                       )
                                       if (exact) { selectProduct(exact); return }
                                       // Search natijasi yo'q — to'g'ridan API
                                       api.get('/api/v1/products/barcode/' + encodeURIComponent(q))
                                           .then(r => { if (r.data) selectProduct(r.data) })
                                           .catch(() => {
                                               api.get('/api/v1/products', { params: { search: q, size: 5, active: true } })
                                                   .then(r => {
                                                       const list = r.data.content || r.data || []
                                                       if (list.length === 1) selectProduct(list[0])
                                                       else if (list.length > 1) { setSearchResults(list); setShowDrop(true) }
                                                       else showToast('Mahsulot topilmadi', 'error')
                                                   })
                                           })
                                   }
                               }}
                               onPaste={e => {
                                   // Ctrl+V bilan paste — 300ms keyin search natijalari tayyor bo'ladi
                                   setTimeout(() => {
                                       const q = (e.target.value || '').trim()
                                       if (!q) return
                                       // Barcode uzunligiga mos bo'lsa — avtomatik qidirish
                                       if (/^\d{8,13}$/.test(q)) {
                                           api.get('/api/v1/products/barcode/' + encodeURIComponent(q))
                                               .then(r => { if (r.data) { selectProduct(r.data); setSearch('') } })
                                               .catch(() => {
                                                   api.get('/api/v1/products', { params: { search: q, size: 5, active: true } })
                                                       .then(r => {
                                                           const list = r.data.content || r.data || []
                                                           if (list.length === 1) { selectProduct(list[0]); setSearch('') }
                                                           // else — dropdown ko'rsatiladi (debounce orqali)
                                                       })
                                               })
                                       }
                                   }, 350)
                               }}
                        />
                        <button className="pos-camera-btn" onClick={() => setShowCamera(true)} title="Kamera bilan skanerlash">
                            <Camera size={16} />
                        </button>
                        {search && <button onClick={() => { setSearch(''); setShowDrop(false); setDropIdx(-1) }}
                                           className="pos-search-clear">
                            <X size={14} /></button>}

                        {/* Dropdown */}
                        {showDrop && (
                            <div className="pos-search-dropdown">
                                {searching
                                    ? <div className="pos-ss-hint">Qidirilmoqda...</div>
                                    : searchResults.length === 0
                                        ? <div className="pos-ss-hint">Topilmadi</div>
                                        : searchResults.map((p, idx) => {
                                            const stock = p.totalStock != null ? Number(p.totalStock) : null
                                            const oos = stock !== null && stock <= 0
                                            return (
                                                <div key={p.id}
                                                     className={`pos-search-item${dropIdx === idx ? ' pos-search-item--active' : ''}${oos ? ' pos-search-item--oos' : ''}`}
                                                     onMouseDown={() => selectProduct(p)}>
                                                    <div className="pos-search-img">
                                                        {p.imageUrl
                                                            ? <img src={p.imageUrl} alt="" className="pos-search-item-img" />
                                                            : <Package size={18} style={{ color: '#d1d5db' }} />}
                                                    </div>
                                                    <div className="pos-search-item-info">
                                                        <div className="pos-search-item-name">{p.name}</div>
                                                        <div className="pos-search-item-code">{p.defaultBarcode || p.sku}</div>
                                                    </div>
                                                    <div className="pos-search-item-right">
                                                        <div className="pos-search-item-price">{fmt(p.defaultSalePrice)} so'm</div>
                                                        {stock !== null && (
                                                            <div className={`pos-stock-badge${oos ? ' pos-stock-badge--oos' : ' pos-stock-badge--ok'}`}>
                                                                {oos ? 'Stokda yo\'q' : `${stock} ta`}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })
                                }
                            </div>
                        )}
                    </div>

                    {shift && <div className="pos-smena-badge">● Smena #{shift.id} — {shift.warehouseName}</div>}

                    {lastSale && (
                        <div className="pos-last-sale">
                            ✓ {lastSale.referenceNo} — {fmt(lastSale.totalAmount)} so'm
                        </div>
                    )}

                    {isAdmin ? (
                        <button className="pos-tbtn pos-pending-btn" onClick={() => {
                            setHoldTab('pending')
                            loadPendingOrders()
                            loadHoldSales()
                            setShowHoldList(v => !v)
                        }}>
                            <Bell size={15} />
                            {pendingOrders.length > 0 && <span className="pos-pending-badge">{pendingOrders.length}</span>}
                        </button>
                    ) : (
                        <button className="pos-tbtn pos-hold-open-btn" onClick={() => {
                            setHoldTab('hold')
                            if (!showHoldList) loadHoldSales()
                            setShowHoldList(v => !v)
                        }}>
                            <Clock size={15} />
                            {(holdSales.length + myPendingOrders.length) > 0 && (
                                <span className="pos-pending-badge">{holdSales.length + myPendingOrders.length}</span>
                            )}
                        </button>
                    )}

                    {shift && (
                        <button className="pos-tbtn pos-tbtn-danger" onClick={() => setShowCloseShift(true)}>
                            <ShiftClose size={15} />
                            <span className="pos-tbtn-text">Smena yopish</span>
                        </button>
                    )}
                </div>

                {/* ── Kechagi smena ogohlantirishi ── */}
                {staleShift && shift && (
                    <div className="pos-stale-shift-banner">
                        <span className="pos-stale-shift-icon">⚠</span>
                        <span className="pos-stale-shift-text">
                            Smena {fmtShiftDate(shift.openedAt)} da ochilgan va yopilmagan
                        </span>
                        <div className="pos-stale-shift-actions">
                            {(user?.role === 'ADMIN' || user?.role === 'OWNER' ||
                              user?.role === 'ROLE_ADMIN' || user?.role === 'ROLE_OWNER') && (
                                <button className="pos-stale-btn pos-stale-btn-close" onClick={() => setShowCloseShift(true)}>
                                    Yopish va yangi ochish
                                </button>
                            )}
                            <button className="pos-stale-btn pos-stale-btn-continue" onClick={() => {
                                const key = `staleShiftDismissed_${shift.id}_${new Date().toDateString()}`
                                sessionStorage.setItem(key, '1')
                                setStaleShift(false)
                            }}>
                                Davom etish
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Main ── */}
                <div className="pos-main">

                    {/* ── CHAP: Savatcha ── */}
                    <div className={`pos-left${activeTab === 'cart' ? ' pos-tab-visible' : ''}`}>

                        {/* ── Tezkor mahsulotlar ── */}
                        {favorites.length > 0 && (
                            <div className="pos-favs-wrap">
                                <div className="pos-favs-scroll">
                                    {favorites.map(f => (
                                        <button key={f.productId} className="pos-fav-chip"
                                                onMouseDown={() => selectProduct({ id: f.productId, name: f.name, imageUrl: f.imageUrl })}>
                                            {f.imageUrl
                                                ? <img src={f.imageUrl} alt="" className="pos-fav-img" />
                                                : <span className="pos-fav-dot" />}
                                            <span className="pos-fav-name">{f.name.length > 14 ? f.name.slice(0, 13) + '…' : f.name}</span>
                                            <span className="pos-fav-price">{fmt(f.price)}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="pos-favs-fade" />
                            </div>
                        )}

                        <div className="pos-cart-header">
                            <div className="pos-cart-header-left">
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
                                    <div className="pos-cart-empty-title">Savatcha hozircha bo'sh</div>
                                    <div className="pos-cart-empty-hint">
                                        Tovarlarni qidirish uchun yozing yoki skanerlang
                                    </div>
                                </div>
                            ) : cart.map((item, idx) => (
                                <div key={item.productUnitId}
                                     className={`pos-cart-item${activeIdx === idx ? ' pos-active' : ''}`}
                                     onClick={() => setActiveIdx(idx)}>

                                    {/* Miqdor box — screenshot uslubida */}
                                    <div className="pos-qty-box">
                                        {item.editQty ? (
                                            <div className="pos-qty-value pos-qty-value--edit">
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
                                                    className="pos-qty-edit-input"
                                                />
                                                <span>{item.unitSymbol}</span>
                                            </div>
                                        ) : (
                                            <div className="pos-qty-value pos-qty-value--click" onClick={e => { e.stopPropagation(); setCart(prev => prev.map(c => c.productUnitId === item.productUnitId ? { ...c, editQty: true } : c)) }} title="Bosib miqdorni kiriting">
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
                                    <div className="pos-cart-thumb">
                                        {item.image
                                            ? <img src={item.image} alt="" />
                                            : <Package size={20} style={{ color: '#94a3b8' }} />}
                                    </div>

                                    {/* Nom + artikul / barcode */}
                                    <div className="pos-cart-info">
                                        <div className="pos-cart-name">{item.productName}</div>
                                        <div className="pos-cart-meta">
                                            {[item.artikul, item.barcode].filter(Boolean).join(' / ')}
                                            {item.availableStock != null && (
                                                <span className={(item.availableStock - item.quantity) <= 3 ? 'pos-cart-stock-low' : 'pos-cart-stock-ok'}>
                                                    ({Math.max(0, item.availableStock - item.quantity)} ta qoldi)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Narx + info icon */}
                                    <div className="pos-cart-price-wrap">
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
                                            <div className="pos-cart-price-row">
                                                <div className="pos-cart-price-info" data-price-info>
                                                    <button
                                                        onClick={e => {
                                                            e.stopPropagation()
                                                            if (priceInfoId === item.productUnitId) { setPriceInfoId(null); return }
                                                            const rect = e.currentTarget.getBoundingClientRect()
                                                            setPricePopoverPos({ top: rect.top - 8, left: rect.right })
                                                            setPriceInfoId(item.productUnitId)
                                                        }}
                                                        className={`pos-info-btn${priceInfoId === item.productUnitId ? ' pos-info-btn--active' : ''}`}>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                                                        </svg>
                                                    </button>
                                                </div>
                                                <span className="pos-cart-price-val">
                                                    {fmt(Math.round(Number(item.salePrice) * item.quantity))} UZS
                                                </span>
                                                <button onClick={e => { e.stopPropagation(); setCart(prev => prev.map(c => c.productUnitId === item.productUnitId ? { ...c, editPrice: true } : c)) }}
                                                        className="pos-edit-price-btn">
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* O'chirish tugmasi */}
                                    <button onClick={e => { e.stopPropagation(); removeItem(item.productUnitId) }}
                                            className="pos-del-btn">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* ── Keyboard shortcut legend ── */}
                        <div className="pos-kbd-legend">
                            <span><kbd>F1</kbd> Yangi sotuv</span>
                            <span><kbd>F2</kbd> To'lash</span>
                            <span><kbd>F4</kbd> Kechiktirish</span>
                            <span><kbd>Del</kbd> Itemni o'chirish</span>
                            <span><kbd>↑↓</kbd> Navigatsiya</span>
                            <span><kbd>→←</kbd> Miqdor</span>
                            <span><kbd>Esc</kbd> Modalni yopish</span>
                        </div>
                    </div>

                    {/* ── O'NG: Panel ── */}
                    {/* ── Hold Drawer ── */}
                    <div className={`pos-hold-drawer${showHoldList ? ' open' : ''}`}>
                        <div className="pos-hold-drawer-inner">
                            <div className="pos-hold-drawer-header">
                                <span className="pos-hold-drawer-title">Savatchalar</span>
                                <button className="pos-hold-drawer-close" onClick={() => setShowHoldList(false)}>
                                    <X size={16} />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="pos-hold-tabs">
                                {isAdmin ? (<>
                                    <button className={`pos-hold-tab${holdTab === 'pending' ? ' active' : ''}`}
                                            onClick={() => { setHoldTab('pending'); loadPendingOrders() }}>
                                        Kutilmoqda
                                        {pendingOrders.length > 0 && <span className="pos-hold-tab-badge pending">{pendingOrders.length}</span>}
                                    </button>
                                    <button className={`pos-hold-tab${holdTab === 'hold' ? ' active' : ''}`}
                                            onClick={() => { setHoldTab('hold'); loadHoldSales() }}>
                                        Kechiktirilgan
                                        {holdSales.length > 0 && <span className="pos-hold-tab-badge">{holdSales.length}</span>}
                                    </button>
                                </>) : (<>
                                    <button className={`pos-hold-tab${holdTab === 'hold' ? ' active' : ''}`}
                                            onClick={() => setHoldTab('hold')}>
                                        Kechiktirilgan
                                        {holdSales.length > 0 && <span className="pos-hold-tab-badge">{holdSales.length}</span>}
                                    </button>
                                    <button className={`pos-hold-tab${holdTab === 'pending' ? ' active' : ''}`}
                                            onClick={() => { setHoldTab('pending'); loadMyPending() }}>
                                        Yuborilgan
                                        {myPendingOrders.length > 0 && <span className="pos-hold-tab-badge pending">{myPendingOrders.length}</span>}
                                    </button>
                                </>)}
                            </div>

                            <div className="pos-hold-drawer-body">
                                {holdTab === 'hold' ? (
                                    holdSales.length === 0 ? (
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
                                                {s.saleNotes?.map(n => n.message.startsWith('↩')
                                                    ? <div key={n.id} className="pos-hold-item-rejected">↩ {n.senderName}: {n.message.replace('↩ Rad etildi: ', '').replace('↩ Rad etildi', '').trim() || '—'}</div>
                                                    : <div key={n.id} className="pos-hold-item-note">📝 {n.message}</div>
                                                )}
                                                <div className="pos-hold-item-date">
                                                    {new Date(s.createdAt).toLocaleString('ru-RU')}
                                                </div>
                                            </div>
                                            <div className="pos-hold-item-actions">
                                                <span className="pos-hold-item-btn">Ochish</span>
                                                <span className="pos-hold-item-cancel" onClick={e => { e.stopPropagation(); setConfirmCancel({ id: s.id, referenceNo: s.referenceNo }) }}>✕</span>
                                            </div>
                                        </div>
                                    ))
                                ) : isAdmin ? (
                                    // Admin — kutilmoqda (pending orders)
                                    pendingOrders.length === 0 ? (
                                        <div className="pos-hold-drawer-empty">Kutilayotgan buyurtma yo'q</div>
                                    ) : pendingOrders.map(order => (
                                        <div key={order.id} className="pos-hold-item">
                                            <div className="pos-hold-item-info">
                                                <div className="pos-hold-item-ref-row">
                                                    <span className="pos-hold-item-ref">#{order.referenceNo}</span>
                                                    <span className="pos-hold-status-badge pending">{order.sellerName}</span>
                                                </div>
                                                <div className="pos-hold-item-meta">
                                                    {order.items?.length || 0} ta • {fmt(order.totalAmount)} so'm
                                                </div>
                                                {order.saleNotes?.filter(n => !n.message.startsWith('↩')).map(n => (
                                                    <div key={n.id} className="pos-hold-item-note">📝 {n.message}</div>
                                                ))}
                                                <div className="pos-hold-item-date">
                                                    {new Date(order.createdAt).toLocaleString('ru-RU')}
                                                </div>
                                            </div>
                                            <div className="pos-hold-item-actions">
                                                <span className="pos-hold-item-btn" onClick={() => openPending(order)}>Ochish</span>
                                                <span className="pos-hold-item-btn pos-hold-item-btn-return"
                                                      title="Kassirga qaytarish"
                                                      onClick={e => {
                                                          e.stopPropagation()
                                                          setRejectModal({ id: order.id, referenceNo: order.referenceNo })
                                                          setRejectReason('')
                                                      }}>↩</span>
                                                <span className="pos-hold-item-cancel"
                                                      title="Bekor qilish"
                                                      onClick={e => {
                                                          e.stopPropagation()
                                                          setConfirmCancelPending({ id: order.id, referenceNo: order.referenceNo })
                                                      }}>✕</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    // Kassir — yuborilgan (my pending)
                                    myPendingOrders.length === 0 ? (
                                        <div className="pos-hold-drawer-empty">Yuborilgan buyurtma yo'q</div>
                                    ) : myPendingOrders.map(s => (
                                        <div key={s.id} className="pos-hold-item pos-hold-item-pending">
                                            <div className="pos-hold-item-info">
                                                <div className="pos-hold-item-ref-row">
                                                    <span className="pos-hold-item-ref">#{s.referenceNo}</span>
                                                    <span className="pos-hold-status-badge pending">Admin kutmoqda</span>
                                                </div>
                                                <div className="pos-hold-item-meta">
                                                    {s.items?.length || 0} ta • {fmt(s.totalAmount)} so'm
                                                </div>
                                                {s.saleNotes?.filter(n => n.message.startsWith('↩')).slice(-1).map(n => (
                                                    <div key={n.id} className="pos-hold-item-rejected">
                                                        ↩ {n.message.replace('↩ Rad etildi: ', '').replace('↩ Rad etildi', '').trim() || 'Admin qaytardi'}
                                                    </div>
                                                ))}
                                                <div className="pos-hold-item-date">
                                                    {new Date(s.createdAt).toLocaleString('ru-RU')}
                                                </div>
                                            </div>
                                            <div className="pos-hold-item-actions">
                                                <span className="pos-hold-item-cancel" onClick={e => { e.stopPropagation(); setConfirmCancel({ id: s.id, referenceNo: s.referenceNo }) }}>✕</span>
                                            </div>
                                        </div>
                                    ))
                                )}
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
                                    <button className="pos-sec-create-btn" onClick={() => setCreateModal('customer')}>
                                        <Plus size={11} /> Yangi
                                    </button>
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
                                    <button className="pos-sec-create-btn" onClick={() => setCreateModal('partner')}>
                                        <Plus size={11} /> Yangi
                                    </button>
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
                                           value={fmtPrice(discountValue)}
                                           onChange={e => setDiscountValue(e.target.value.replace(/\D/g, ''))} />
                                    <div className="pos-disc-type">
                                        <button className={discountType === 'PERCENT' ? 'on' : ''} onClick={() => setDiscountType('PERCENT')}>%</button>
                                        <button className={discountType === 'AMOUNT' ? 'on' : ''} onClick={() => setDiscountType('AMOUNT')}>UZS</button>
                                    </div>
                                </div>
                                <div className="pos-quick">
                                    {QUICK_DISCOUNTS.map(d => (
                                        <button key={d} onClick={() => { setDiscountType('PERCENT'); setDiscountValue(String(d)) }}>{d}%</button>
                                    ))}
                                </div>
                            </div>

                            {/* Savatcha izohlari tarixi */}
                            {currentSale?.saleNotes?.length > 0 && (
                                <div className="pos-sale-notes">
                                    {currentSale.saleNotes.map(n => {
                                        const isReject = n.message.startsWith('↩')
                                        return (
                                            <div key={n.id} className={`pos-sale-note-item${isReject ? ' pos-sale-note-reject' : ''}`}>
                                                <div className="pos-sale-note-header">
                                                    <span>{isReject ? '↩' : '📝'}</span>
                                                    <span className="pos-sale-note-sender">{n.senderName}</span>
                                                    <span className="pos-sale-note-time">
                                                        {n.createdAt && new Date(n.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="pos-sale-note-text">
                                                    {n.message.replace('↩ Rad etildi: ', '').replace('↩ Rad etildi', '').trim() || n.message}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

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
                                <span className="pos-tot-val">{fmt(subtotal)} UZS</span>
                            </div>
                            <div className="pos-tot-row">
                                <span>Chegirma</span>
                                <span className="pos-tot-val">{discountAmount > 0 ? `-${fmt(discountAmount)}` : '0'} UZS</span>
                            </div>
                            <button className="pos-pay-btn" onClick={handlePay} disabled={!cart.length || saving}>
                                <div className="pos-pay-btn-inner">
                                    <span className="pos-pay-btn-label">TO'LASH</span>
                                    <span className="pos-kbd-badge">F2</span>
                                </div>
                                <span className="pos-pay-btn-sum">{fmt(totalAmount)} UZS</span>
                            </button>
                            <div className="pos-secondary-row">
                                <button className="pos-sec-btn" onClick={handleHold} disabled={!cart.length || saving}>
                                    <PauseCircle size={15} />
                                    Kechiktirish
                                    <span className="pos-kbd-badge pos-kbd-badge--sec">F4</span>
                                </button>
                                {!isAdmin && (
                                    <button className="pos-sec-btn pos-sec-btn-amber" onClick={() => setShowSubmitModal(true)} disabled={!cart.length || saving}>
                                        <Bell size={15} />
                                        Adminga yuborish
                                    </button>
                                )}
                                {isAdmin && currentSale?.id && (
                                    <button className="pos-sec-btn pos-sec-btn-red" onClick={() => { setRejectModal({ id: currentSale.id, referenceNo: currentSale.referenceNo }); setRejectReason('') }} disabled={saving}>
                                        ↩ Kassirga qaytarish
                                    </button>
                                )}
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
                             className="pos-popover"
                             style={{ top: pricePopoverPos.top, left: pricePopoverPos.left }}>
                            <div className="pos-popover-title">Narx ma'lumoti</div>
                            {isAdmin && (
                                <div className="pos-popover-row">
                                    <span className="pos-popover-label">Tannarx</span>
                                    <b className="pos-popover-cost">{fmt(item.costPrice)} so'm</b>
                                </div>
                            )}
                            <div className="pos-popover-row">
                                <span className="pos-popover-label">Min narx</span>
                                <b className="pos-popover-min">{fmt(item.minPrice)} so'm</b>
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

            {/* ── Approve modal ── */}

            {showPayment && currentSaleRef.current?.id && <PaymentModal
                sale={{ ...currentSale, customerId: customerId ? Number(customerId) : null, customerName: customers.find(c => c.id === Number(customerId))?.name || currentSale.customerName }}
                onClose={() => {
                    setShowPayment(false)
                    if (currentSaleRef.current?.id) {
                        salesApi.cancel(currentSaleRef.current.id).catch(() => {})
                        setCurrentSale(null)
                        currentSaleRef.current = null
                    }
                }}
                onCompleted={(s) => { setShowPayment(false); setCompletedSale(s); setLastSale(s); setCurrentSale(null); currentSaleRef.current = null; clearCart(false) }}
                onCustomerSet={(updatedSale, customer) => {
                    setCurrentSale(updatedSale)
                    currentSaleRef.current = updatedSale
                    setCustomers(prev => prev.find(c => c.id === customer.id) ? prev : [customer, ...prev])
                    setCustomerId(String(customer.id))
                }}
            />}
            {completedSale && <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />}
        </>
    )
}