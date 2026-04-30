import { NavLink, Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import DashboardPage from '../pages/DashboardPage'
import ProductsPage from '../pages/ProductsPage'
import CategoriesPage from '../pages/CategoriesPage'
import UnitsPage from '../pages/UnitsPage.jsx'
import WarehousesPage from '../pages/WarehousesPage'
import CustomersPage from '../pages/CustomersPage.jsx'
import SuppliersPage from '../pages/SuppliersPage'
import PartnersPage from '../pages/PartnersPage'
import EmployeesPage from '../pages/EmployeesPage'
import PurchasesPage from '../pages/PurchasesPage'
import PurchaseNewPage from '../pages/PurchaseNewPage'
import PurchaseDetailPage from '../pages/PurchaseDetailPage'
import StockMovementsPage from '../pages/StockMovementsPage'
import ProductFormPage from '../pages/ProductFormPage'
import SalesPage from "../pages/SalesPage.jsx";
import SaleDetailPage from '../pages/SaleDetailPage'
import ShiftReportPage from '../pages/ShiftReportPage'
import DebtsPage from '../pages/DebtsPage'
import InventoryPage from '../pages/InventoryPage'
import ReportsPage from '../pages/ReportsPage'
import ExpensesPage from '../pages/ExpensesPage'
import SettingsPage from '../pages/SettingsPage'
import AuditLogPage from '../pages/AuditLogPage'

import { useState, useEffect, useRef } from 'react'
import {
    LayoutDashboard, ShoppingCart, Package, Users, Truck, BarChart2,
    Factory, Warehouse, FolderTree, UserCog, Handshake, Ruler,
    ChevronLeft, ChevronRight, Globe, DollarSign, Pencil, CreditCard,
    LogOut, User, Lock, Building2, X, Menu, Sun, Moon, ShieldOff, ArrowLeftRight, ShoppingBag, ClipboardList, TrendingUp, Settings, ShieldCheck, BookOpen, Cog, Receipt
} from 'lucide-react'
import { Navigate } from 'react-router-dom'
import '../styles/layout.css'
import '../styles/ProductsPage.css'
import '../i18n.js'



// permission: null => barcha foydalanuvchilar ko'radi (OWNER/ADMIN ham)
// Guruhsiz (yuqorida alohida)
const topNavItems = [
    { path: '/',        key: 'dashboard', icon: LayoutDashboard, permission: 'DASHBOARD_VIEW' },
    { path: '/cashier', key: 'cashier',   icon: ShoppingCart,    permission: 'SALES_CREATE' },
]

// Guruhlangan nav itemlar
const navGroups = [
    {
        labelKey: 'nav.group.sales',
        icon: ShoppingBag,
        items: [
            { path: '/sales',     key: 'sales',     icon: ShoppingBag, permission: 'SALES_VIEW' },
            { path: '/debts',     key: 'debts',     icon: CreditCard,  permission: 'CUSTOMERS_DEBT_VIEW' },
            { path: '/customers', key: 'customers', icon: Users,       permission: 'CUSTOMERS_VIEW' },
            { path: '/shifts',    key: 'shifts',    icon: BarChart2,   permission: 'SHIFTS_VIEW' },
            { path: '/expenses',  key: 'expenses',  icon: Receipt,     permission: 'REPORTS_VIEW' },
            { path: '/reports',   key: 'reports',   icon: TrendingUp,  permission: 'REPORTS_VIEW' },
        ]
    },
    {
        labelKey: 'nav.group.warehouse',
        icon: Package,
        items: [
            { path: '/products',        key: 'products',        icon: Package,       permission: 'PRODUCTS_VIEW' },
            { path: '/purchases',       key: 'purchases',       icon: Truck,         permission: 'PURCHASES_VIEW' },
            { path: '/inventory',       key: 'inventory',       icon: ClipboardList, permission: 'INVENTORY_VIEW' },
            { path: '/stock-movements', key: 'stock-movements', icon: ArrowLeftRight, permission: 'STOCK_VIEW' },
            { path: '/warehouses',      key: 'warehouses',      icon: Warehouse,     permission: 'WAREHOUSES_VIEW' },
        ]
    },
    {
        labelKey: 'nav.group.reference',
        icon: BookOpen,
        items: [
            { path: '/categories', key: 'categories', icon: FolderTree, permission: 'CATEGORIES_VIEW' },
            { path: '/units',      key: 'units',      icon: Ruler,      permission: 'UNITS_VIEW' },
            { path: '/suppliers',  key: 'suppliers',  icon: Factory,    permission: 'SUPPLIERS_VIEW' },
            { path: '/partners',   key: 'partners',   icon: Handshake,  permission: 'PARTNERS_VIEW' },
        ]
    },
    {
        labelKey: 'nav.group.system',
        icon: Cog,
        items: [
            { path: '/employees', key: 'employees', icon: UserCog,    permission: 'EMPLOYEES_VIEW' },
            { path: '/audit-log', key: 'audit-log', icon: ShieldCheck, permission: 'ADMIN' },
            { path: '/settings',  key: 'settings',  icon: Settings,    permission: 'ADMIN' },
        ]
    },
]

// Barcha itemlar (ruxsat filtri uchun)
const navItems = [
    ...topNavItems,
    ...navGroups.flatMap(g => g.items),
]

// Ruxsat yo'q sahifa
function AccessDenied() {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', height: '60vh', gap: 12,
            color: 'var(--text-muted)'
        }}>
            <ShieldOff size={52} strokeWidth={1} />
            <h3 style={{ fontWeight: 700, fontSize: 20, margin: 0 }}>Ruxsat yo'q</h3>
            <p style={{ fontSize: 14, margin: 0 }}>Bu sahifaga kirishga ruxsatingiz yo'q</p>
        </div>
    )
}

// Route ni permission bilan o'rash
function ProtectedRoute({ permission, children }) {
    const { hasPermission } = useAuth()
    if (permission && !hasPermission(permission)) return <AccessDenied />
    return children
}

export default function Layout() {
    const { t, i18n } = useTranslation()
    const { user, logout, hasPermission } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    useEffect(() => {
        window.scrollTo(0, 0)
    }, [location.pathname])

    const [loggingOut, setLoggingOut] = useState(false)

    const handleLogout = async () => {
        if (loggingOut) return
        setLoggingOut(true)
        await logout()
        navigate('/login')
    }

    const [langOpen, setLangOpen] = useState(false)
    const langRef = useRef(null)

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (langRef.current && !langRef.current.contains(e.target)) {
                setLangOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [userOpen, setUserOpen] = useState(false)
    const userRef = useRef(null)

    // Dark mode
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('primestroy_theme')
        return saved === 'dark'
    })

    useEffect(() => {
        if (darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark')
            localStorage.setItem('primestroy_theme', 'dark')
        } else {
            document.documentElement.removeAttribute('data-theme')
            localStorage.setItem('primestroy_theme', 'light')
        }
    }, [darkMode])

    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [mobileMenuOpen])

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024) setMobileMenuOpen(false)
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    useEffect(() => {
        function handleClickOutside(event) {
            if (userRef.current && !userRef.current.contains(event.target)) {
                setUserOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Guruh ochiq/yopiq holati — localStorage da saqlanadi
    const [collapsedGroups, setCollapsedGroups] = useState(() => {
        try { return JSON.parse(localStorage.getItem('sidebar_collapsed') || '{}') }
        catch { return {} }
    })

    const toggleGroup = (key) => {
        setCollapsedGroups(prev => {
            const next = { ...prev, [key]: !prev[key] }
            localStorage.setItem('sidebar_collapsed', JSON.stringify(next))
            return next
        })
    }

    // Dollar kursi
    const [exchangeRate, setExchangeRate] = useState(null)
    const [showRateModal, setShowRateModal] = useState(false)
    const [newRate, setNewRate] = useState('')
    const [rateSaving, setRateSaving] = useState(false)

    useEffect(() => {
        import('../api/api').then(m => {
            m.default.get('/api/v1/exchange-rate/current')
                .then(res => setExchangeRate(res.data.rate))
                .catch(() => {})
        })
        const onRateChanged = (e) => setExchangeRate(e.detail)
        window.addEventListener('exchange-rate-changed', onRateChanged)
        return () => window.removeEventListener('exchange-rate-changed', onRateChanged)
    }, [])

    const handleSaveRate = async () => {
        if (!newRate || isNaN(newRate)) return
        setRateSaving(true)
        try {
            const m = await import('../api/api')
            await m.default.post('/api/v1/exchange-rate', { rate: Number(newRate) })
            setExchangeRate(Number(newRate))
            window.dispatchEvent(new CustomEvent('exchange-rate-changed', { detail: Number(newRate) }))
            setShowRateModal(false)
            setNewRate('')
        } catch (e) {
            console.error(e)
        } finally {
            setRateSaving(false)
        }
    }

    const changeLang = (lng) => {
        i18n.changeLanguage(lng)
        localStorage.setItem('buildpos_lang', lng)
        setLangOpen(false)
    }

    return (
        <div className="layout-wrapper">
            {mobileMenuOpen && (
                <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
            )}

            {/* Sidebar */}
            <nav className={`sidebar ${sidebarOpen ? '' : 'collapsed'} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
                <div className="sidebar-header">
                    <div className="brand-icon">
                        <Building2 size={22} />
                    </div>
                    {sidebarOpen && <span className="brand-text">PrimeStroy</span>}
                    <button
                        className="collapse-btn"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label="Toggle sidebar"
                    >
                        {sidebarOpen ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
                    </button>
                </div>

                <div className="sidebar-nav">
                    {/* Guruhsiz yuqori itemlar */}
                    {topNavItems
                        .filter(item => hasPermission(item.permission))
                        .map(item => {
                            const Icon = item.icon
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.path === '/'}
                                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <span className="sidebar-icon"><Icon size={20} strokeWidth={1.8} /></span>
                                    {sidebarOpen && <span className="sidebar-text">{t(`nav.${item.key}`)}</span>}
                                </NavLink>
                            )
                        })}

                    {/* Tepadan ajratuvchi chiziq */}
                    <div className="sidebar-top-divider" />

                    {/* Guruhlangan itemlar */}
                    {navGroups.map(group => {
                        const visibleItems = group.items.filter(item => hasPermission(item.permission))
                        if (visibleItems.length === 0) return null
                        const isCollapsed = !!collapsedGroups[group.labelKey]
                        const GroupIcon = group.icon
                        return (
                            <div key={group.labelKey} className="sidebar-group">
                                {sidebarOpen ? (
                                    <button
                                        className="sidebar-group-label"
                                        onClick={() => toggleGroup(group.labelKey)}
                                    >
                                        <span className="sidebar-group-label-inner">
                                            <span className="sidebar-icon"><GroupIcon size={20} strokeWidth={1.8} /></span>
                                            <span>{t(group.labelKey)}</span>
                                        </span>
                                        <ChevronRight
                                            size={12}
                                            className={`sg-chevron ${isCollapsed ? '' : 'sg-chevron--open'}`}
                                        />
                                    </button>
                                ) : (
                                    <div className="sidebar-group-divider" />
                                )}
                                {!isCollapsed && visibleItems.map(item => (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        end={item.path === '/'}
                                        className={({ isActive }) => `sidebar-link sidebar-link--child ${isActive ? 'active' : ''}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                    >
                                        <span className="sidebar-dot" />
                                        {sidebarOpen && <span className="sidebar-text">{t(`nav.${item.key}`)}</span>}
                                    </NavLink>
                                ))}
                            </div>
                        )
                    })}
                </div>
            </nav>

            {/* Main */}
            <div className={`main-content ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
                {/* Topbar */}
                <div className="topbar">
                    <div className="topbar-left">
                        <button
                            className="mobile-menu-btn"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            <Menu size={22} />
                        </button>
                        <span className="topbar-title">PrimeStroy</span>
                    </div>

                    <div className="topbar-right">
                        <button
                            className="theme-toggle-btn"
                            onClick={() => setDarkMode(!darkMode)}
                            aria-label="Toggle dark mode"
                            title={darkMode ? 'Yorug\'lik rejimi' : 'Qorong\'u rejim'}
                        >
                            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {/* Dollar kursi */}
                        <button
                            className="exchange-rate-widget"
                            onClick={() => {
                                if (user?.role === 'OWNER' || user?.role === 'ADMIN') {
                                    setNewRate(exchangeRate || '')
                                    setShowRateModal(true)
                                }
                            }}
                            style={{ cursor: user?.role === 'OWNER' || user?.role === 'ADMIN' ? 'pointer' : 'default' }}
                        >
                            <DollarSign size={15} className="rate-icon" />
                            <span className="rate-value">
                                {exchangeRate ? new Intl.NumberFormat('uz-UZ').format(exchangeRate) : '...'} UZS
                            </span>
                            <Pencil size={12} className="rate-edit-icon" />
                        </button>

                        {/* Language Dropdown */}
                        <div className="language-switch" ref={langRef}>
                            <button
                                className="lang-selected"
                                onClick={() => setLangOpen(!langOpen)}
                            >
                                <Globe size={15} />
                                <span>{i18n.language.toUpperCase()}</span>
                            </button>
                            {langOpen && (
                                <div className="lang-dropdown">
                                    {[
                                        { code: 'UZB', label: 'UZB' },
                                        { code: 'ЎЗБ', label: 'ЎЗБ' },
                                        { code: 'РУС', label: 'РУС' },
                                        { code: 'ENG', label: 'ENG' }
                                    ]
                                        .filter(lang => lang.code !== i18n.language)
                                        .map(lang => (
                                            <button
                                                key={lang.code}
                                                className="lang-option"
                                                onClick={() => changeLang(lang.code)}
                                            >
                                                {lang.label}
                                            </button>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* User Box */}
                        <div className="user-wrapper" ref={userRef}>
                            <button
                                className="user-avatar-btn user-avatar-btn--initials"
                                onClick={() => setUserOpen(!userOpen)}
                                aria-label="User menu"
                            >
                                {user?.fullName
                                    ? user.fullName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
                                    : <User size={18} strokeWidth={2} />}
                            </button>
                            {userOpen && (() => {
                                const initials = user?.fullName
                                    ? user.fullName.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()
                                    : '?'
                                const roleClass = user?.role === 'OWNER' ? 'role--owner'
                                    : user?.role === 'ADMIN' ? 'role--admin'
                                    : 'role--cashier'
                                return (
                                <div className="user-dropdown">
                                    <div className="dropdown-user-info">
                                        <div className={`dropdown-avatar ${roleClass}`}>
                                            <span className="dropdown-avatar-initials">{initials}</span>
                                        </div>
                                        <div className="dropdown-user-text">
                                            <div className="dropdown-name">{user?.fullName || user?.username}</div>
                                            <span className={`dropdown-role-badge ${roleClass}`}>{user?.role}</span>
                                        </div>
                                    </div>

                                    <div className="dropdown-items-group">
                                        <button className="dropdown-item" disabled>
                                            <User size={15} />
                                            <span>Profil</span>
                                        </button>
                                        <button className="dropdown-item" disabled>
                                            <Lock size={15} />
                                            <span>Parol o'zgartirish</span>
                                        </button>
                                    </div>

                                    <div className="dropdown-divider" />

                                    <button
                                        className="dropdown-item logout"
                                        onClick={handleLogout}
                                        disabled={loggingOut}
                                    >
                                        <LogOut size={15} />
                                        <span>{loggingOut ? 'Chiqilmoqda...' : 'Chiqish'}</span>
                                    </button>
                                </div>
                                )
                            })()}
                        </div>
                    </div>
                </div>

                {/* Pages */}
                <div className="page-content">
                    <Routes>
                        <Route path="/" element={
                            hasPermission('DASHBOARD_VIEW')
                                ? <DashboardPage />
                                : <Navigate to="/sales" replace />
                        } />
                        <Route path="/products" element={
                            <ProtectedRoute permission="PRODUCTS_VIEW"><ProductsPage /></ProtectedRoute>
                        } />
                        <Route path="/products/new" element={
                            <ProtectedRoute permission="PRODUCTS_CREATE"><ProductFormPage /></ProtectedRoute>
                        } />
                        <Route path="/products/:id/edit" element={
                            <ProtectedRoute permission="PRODUCTS_EDIT"><ProductFormPage /></ProtectedRoute>
                        } />
                        <Route path="/categories" element={
                            <ProtectedRoute permission="CATEGORIES_VIEW"><CategoriesPage /></ProtectedRoute>
                        } />
                        <Route path="/units" element={
                            <ProtectedRoute permission="UNITS_VIEW"><UnitsPage /></ProtectedRoute>
                        } />
                        <Route path="/warehouses" element={
                            <ProtectedRoute permission="WAREHOUSES_VIEW"><WarehousesPage /></ProtectedRoute>
                        } />
                        <Route path="/customers" element={
                            <ProtectedRoute permission="CUSTOMERS_VIEW"><CustomersPage /></ProtectedRoute>
                        } />
                        <Route path="/suppliers" element={
                            <ProtectedRoute permission="SUPPLIERS_VIEW"><SuppliersPage /></ProtectedRoute>
                        } />
                        <Route path="/partners" element={
                            <ProtectedRoute permission="PARTNERS_VIEW"><PartnersPage /></ProtectedRoute>
                        } />
                        <Route path="/employees" element={
                            <ProtectedRoute permission="EMPLOYEES_VIEW"><EmployeesPage /></ProtectedRoute>
                        } />
                        <Route path="/purchases" element={
                            <ProtectedRoute permission="PURCHASES_VIEW"><PurchasesPage /></ProtectedRoute>
                        } />
                        <Route path="/purchases/new" element={
                            <ProtectedRoute permission="PURCHASES_CREATE"><PurchaseNewPage /></ProtectedRoute>
                        } />
                        <Route path="/purchases/:id/edit" element={
                            <ProtectedRoute permission="PURCHASES_CREATE"><PurchaseNewPage /></ProtectedRoute>
                        } />
                        <Route path="/purchases/:id" element={
                            <ProtectedRoute permission="PURCHASES_VIEW"><PurchaseDetailPage /></ProtectedRoute>
                        } />
                        <Route path="/stock-movements" element={
                            <ProtectedRoute permission="STOCK_VIEW"><StockMovementsPage/></ProtectedRoute>
                        }/>
                        <Route path="/sales" element={
                            <ProtectedRoute permission="SALES_VIEW"> <SalesPage /></ProtectedRoute>
                        }/>
                        <Route path="/sales/:id" element={
                            <ProtectedRoute permission="SALES_VIEW"><SaleDetailPage /></ProtectedRoute>
                        } />
                        <Route path="/debts" element={
                            <ProtectedRoute permission='CUSTOMERS_DEBT_VIEW'> <DebtsPage/></ProtectedRoute>
                        }/>
                        <Route path="/shifts" element={
                            <ProtectedRoute permission="SHIFTS_VIEW"><ShiftReportPage /></ProtectedRoute>
                        } />
                        <Route path="/expenses" element={
                            <ProtectedRoute permission="REPORTS_VIEW"><ExpensesPage /></ProtectedRoute>
                        } />
                        <Route path="/reports" element={
                            <ProtectedRoute permission="REPORTS_VIEW"><ReportsPage /></ProtectedRoute>
                        } />
                        <Route path="/audit-log" element={
                            <ProtectedRoute permission="ADMIN"><AuditLogPage /></ProtectedRoute>
                        } />
                        <Route path="/settings" element={
                            <ProtectedRoute permission="ADMIN"><SettingsPage /></ProtectedRoute>
                        } />
                        <Route path="/inventory" element={
                            <ProtectedRoute permission="INVENTORY_VIEW"><InventoryPage /></ProtectedRoute>
                        } />
                        <Route path="/inventory/:id" element={
                            <ProtectedRoute permission="INVENTORY_VIEW"><InventoryPage /></ProtectedRoute>
                        } />
                    </Routes>
                </div>
            </div>

            {/* Kurs o'zgartirish modal */}
            {showRateModal && (
                <div className="modal-overlay" onClick={() => setShowRateModal(false)}>
                    <div className="modal-box products-modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-header-left">
                                <DollarSign size={20} />
                                <div>
                                    <h6 className="modal-title">Dollar kursini o'zgartirish</h6>
                                    <p className="modal-subtitle">Yangi valyuta kursini kiriting</p>
                                </div>
                            </div>
                            <button className="modal-close-btn" onClick={() => setShowRateModal(false)}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <label className="modal-label">1 USD = ? UZS</label>
                            <div className="modal-input-wrapper">
                                <DollarSign size={18} className="modal-input-icon" />
                                <input
                                    type="number"
                                    className="modal-input"
                                    value={newRate}
                                    onChange={e => setNewRate(e.target.value)}
                                    placeholder="Masalan: 12700"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && handleSaveRate()}
                                />
                            </div>
                            {exchangeRate && (
                                <div className="modal-hint">
                                    <span className="modal-hint-dot" />
                                    Hozirgi kurs: {new Intl.NumberFormat('uz-UZ').format(exchangeRate)} UZS
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={() => setShowRateModal(false)}>Bekor</button>
                            <button className="btn-save" onClick={handleSaveRate} disabled={rateSaving}>
                                {rateSaving ? 'Saqlanmoqda...' : 'Saqlash'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}