import { NavLink, Routes, Route, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import DashboardPage from '../pages/DashboardPage'
import ProductsPage from '../pages/ProductsPage'
import CategoriesPage from '../pages/CategoriesPage'
import UnitsPage from '../pages/UnitsPage.jsx'
import WarehousesPage from '../pages/WarehousesPage'
import CustomersPage from '../pages/CustomersPage.jsx'
import SuppliersPage from '../pages/SuppliersPage'
import { useState, useEffect, useRef } from 'react'
import {
    LayoutDashboard, ShoppingCart, Package, Users, Truck,
    Factory, Warehouse, FolderTree, UserCog, Handshake, Ruler,
    ChevronLeft, ChevronRight, Globe, DollarSign, Pencil,
    LogOut, User, Building2, X, Menu, Sun, Moon
} from 'lucide-react'
import '../styles/layout.css'
import '../styles/ProductsPage.css'
import '../i18n.js'

const navItems = [
    { path: '/',           key: 'dashboard',  icon: LayoutDashboard },
    { path: '/sales',      key: 'sales',      icon: ShoppingCart },
    { path: '/products',   key: 'products',   icon: Package },
    { path: '/customers',  key: 'customers',  icon: Users },
    { path: '/purchases',  key: 'purchases',  icon: Truck },
    { path: '/suppliers',  key: 'suppliers',  icon: Factory },
    { path: '/warehouses', key: 'warehouses', icon: Warehouse },
    { path: '/categories', key: 'categories', icon: FolderTree },
    { path: '/employees',  key: 'employees',  icon: UserCog },
    { path: '/partners',   key: 'partners',   icon: Handshake },
    { path: '/units',      key: 'units',      icon: Ruler },
]

export default function Layout() {
    const { t, i18n } = useTranslation()
    const { user, logout } = useAuth()
    const navigate = useNavigate()

    const handleLogout = async () => {
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

    // Mobilda sidebar ochilganda body scrollni to'xtatish
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = ''
        }
        return () => { document.body.style.overflow = '' }
    }, [mobileMenuOpen])

    // Ekran kengligini kuzatish
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 1024) {
                setMobileMenuOpen(false)
            }
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
    }, [])

    const handleSaveRate = async () => {
        if (!newRate || isNaN(newRate)) return
        setRateSaving(true)
        try {
            const m = await import('../api/api')
            await m.default.post('/api/v1/exchange-rate', { rate: Number(newRate) })
            setExchangeRate(Number(newRate))
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
            {/* Mobile sidebar overlay */}
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
                    {navItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) =>
                                    `sidebar-link ${isActive ? 'active' : ''}`
                                }
                                onClick={() => setMobileMenuOpen(false)}
                            >
                                <span className="sidebar-icon">
                                    <Icon size={20} strokeWidth={1.8} />
                                </span>
                                {sidebarOpen && (
                                    <span className="sidebar-text">
                                        {t(`nav.${item.key}`)}
                                    </span>
                                )}
                            </NavLink>
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
                        {/* Dark mode toggle */}
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
                            onClick={() => { setNewRate(exchangeRate || ''); setShowRateModal(true) }}
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
                                className="user-avatar-btn"
                                onClick={() => setUserOpen(!userOpen)}
                                aria-label="User menu"
                            >
                                <User size={20} strokeWidth={2} />
                            </button>

                            {userOpen && (
                                <div className="user-dropdown">
                                    <div className="dropdown-user-info">
                                        <div className="dropdown-avatar">
                                            <User size={18} />
                                        </div>
                                        <div>
                                            <div className="dropdown-name">
                                                {user?.fullName || user?.username}
                                            </div>
                                            <div className="dropdown-role">Administrator</div>
                                        </div>
                                    </div>
                                    <div className="dropdown-divider" />
                                    <button
                                        className="dropdown-item logout"
                                        onClick={handleLogout}
                                    >
                                        <LogOut size={16} />
                                        <span>Chiqish</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pages */}
                <div className="page-content">
                    <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/products" element={<ProductsPage />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/units" element={<UnitsPage />} />
                        <Route path="/warehouses" element={<WarehousesPage />} />
                        <Route path="/customers" element={<CustomersPage />} />
                        <Route path="/suppliers" element={<SuppliersPage />} />
                        {/* Keyingi sahifalar shu yerga qo'shiladi */}
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
                            <button className="btn-cancel" onClick={() => setShowRateModal(false)}>
                                Bekor
                            </button>
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





// import { NavLink, Routes, Route, useNavigate } from 'react-router-dom'
// import { useTranslation } from 'react-i18next'
// import { useAuth } from '../hooks/useAuth'
// import DashboardPage from '../pages/DashboardPage'
// import ProductsPage from '../pages/ProductsPage'
// import CategoriesPage from '../pages/CategoriesPage'
// import UnitsPage from '../pages/UnitsPage.jsx'
// import WarehousesPage from '../pages/WarehousesPage'
// import CustomersPage from '../pages/CustomersPage.jsx'
// import { useState, useEffect, useRef  } from 'react'
// import '../styles/layout.css'
// import '../i18n.js'

// const navItems = [
//     { path: '/',           key: 'dashboard',  icon: '📊' },
//     { path: '/sales',      key: 'sales',      icon: '🛒' },
//     { path: '/products',   key: 'products',   icon: '📦' },
//     { path: '/customers',  key: 'customers',  icon: '👥' },
//     { path: '/purchases',  key: 'purchases',  icon: '🚚' },
//     { path: '/suppliers',  key: 'suppliers',  icon: '🏭' },
//     { path: '/warehouses', key: 'warehouses', icon: '🏬' },
//     { path: '/categories', key: 'categories', icon: '🗂️' },
//     { path: '/employees',  key: 'employees',  icon: '👤' },
//     { path: '/partners',   key: 'partners',   icon: '🤝' },
//     { path: '/units', key: 'units', icon: '📏' },
// ]

// export default function Layout() {
//     const { t, i18n } = useTranslation()
//     const { user, logout } = useAuth()
//     const navigate = useNavigate()
//
//     const handleLogout = async () => {
//         await logout()
//         navigate('/login')
//     }
//
//     const [langOpen, setLangOpen] = useState(false)
//
//     const langRef = useRef(null)
//
//     useEffect(() => {
//         const handleClickOutside = (e) => {
//             if (langRef.current && !langRef.current.contains(e.target)) {
//                 setLangOpen(false)
//             }
//         }
//
//         document.addEventListener('mousedown', handleClickOutside)
//         return () => document.removeEventListener('mousedown', handleClickOutside)
//     }, [])
//
//     const [sidebarOpen, setSidebarOpen] = useState(true)
//
//     const [userOpen, setUserOpen] = useState(false)
//
//     const userRef = useRef(null)
//
//     useEffect(() => {
//         function handleClickOutside(event) {
//             if (userRef.current && !userRef.current.contains(event.target)) {
//                 setUserOpen(false)
//             }
//         }
//
//         document.addEventListener('mousedown', handleClickOutside)
//
//         return () => {
//             document.removeEventListener('mousedown', handleClickOutside)
//         }
//     }, [])
//
//     // Dollar kursi
//     const [exchangeRate, setExchangeRate] = useState(null)
//     const [showRateModal, setShowRateModal] = useState(false)
//     const [newRate, setNewRate] = useState('')
//     const [rateSaving, setRateSaving] = useState(false)
//
//     useEffect(() => {
//         import('../api/api').then(m => {
//             m.default.get('/api/v1/exchange-rate/current')
//                 .then(res => setExchangeRate(res.data.rate))
//                 .catch(() => {})
//         })
//     }, [])
//
//     const handleSaveRate = async () => {
//         if (!newRate || isNaN(newRate)) return
//         setRateSaving(true)
//         try {
//             const m = await import('../api/api')
//             await m.default.post('/api/v1/exchange-rate', { rate: Number(newRate) })
//             setExchangeRate(Number(newRate))
//             setShowRateModal(false)
//             setNewRate('')
//         } catch (e) {
//             console.error(e)
//         } finally {
//             setRateSaving(false)
//         }
//     }
//
//     const changeLang = (lng) => {
//         i18n.changeLanguage(lng)
//         localStorage.setItem('buildpos_lang', lng)
//         setLangOpen(false)
//     }
//
//     return (
//         <div>
//             {/* Sidebar */}
//             <nav className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
//                 <div className="sidebar-header">
//                     <div className="brand-icon">🏗️</div>
//                     {sidebarOpen && <span className="brand-text">PrimeStroy</span>}
//
//                     <button
//                         className="collapse-btn"
//                         onClick={() => setSidebarOpen(!sidebarOpen)}
//                     >
//                         {sidebarOpen ? '«' : '»'}
//                     </button>
//                 </div>
//
//                 <div className="sidebar-nav">
//                     {navItems.map((item) => (
//                         <NavLink
//                             key={item.path}
//                             to={item.path}
//                             end={item.path === '/'}
//                             className={({ isActive }) =>
//                                 `sidebar-link ${isActive ? 'active' : ''}`
//                             }
//                         >
//                             <span className="icon">{item.icon}</span>
//                             {sidebarOpen && (
//                                 <span className="sidebar-text">
//                                     {t(`nav.${item.key}`)}
//                                 </span>
//                             )}
//                         </NavLink>
//                     ))}
//                 </div>
//
//             </nav>
//
//             {/* Main */}
//             <div className="main-content">
//                 {/* Topbar */}
//                 <div className="topbar">
//
//                     <div className="topbar-left">
//                         <span className="topbar-title">PrimeStroy</span>
//                     </div>
//
//                     <div className="topbar-right">
//                         {/* Dollar kursi */}
//                         <div className="exchange-rate-widget" onClick={() => { setNewRate(exchangeRate || ''); setShowRateModal(true) }}>
//                             <span className="rate-label">💵</span>
//                             <span className="rate-value">
//                                 {exchangeRate ? new Intl.NumberFormat('uz-UZ').format(exchangeRate) : '...'} UZS
//                             </span>
//                             <span className="rate-edit">✏️</span>
//                         </div>
//
//                         {/* Language Dropdown */}
//                         <div className="language-switch ref={langRef}" ref={langRef}>
//                             <div
//                                 className="lang-selected"
//                                 onClick={() => setLangOpen(!langOpen)}
//                             >
//                                 {i18n.language.toUpperCase()}
//                             </div>
//
//                             {langOpen && (
//                                 <div className="lang-dropdown">
//                                     {[
//                                         { code: 'UZB', label: "UZB" },
//                                         { code: 'ЎЗБ', label: "ЎЗБ" },
//                                         { code: 'РУС', label: "РУС" },
//                                         { code: 'ENG', label: "ENG" }
//                                     ]
//                                         .filter(lang => lang.code !== i18n.language) // ❗ tanlanganni olib tashlaymiz
//                                         .map(lang => (
//                                             <div
//                                                 key={lang.code}
//                                                 onClick={() => changeLang(lang.code)}
//                                             >
//                                                 {lang.label}
//                                             </div>
//                                         ))}
//                                 </div>
//                             )}
//                         </div>
//
//
//
//                         {/* User Box */}
//                         <div className="user-wrapper" ref={userRef}>
//
//                             <div
//                                 className="user-avatar-btn"
//                                 onClick={() => setUserOpen(!userOpen)}
//                             >
//                                 <svg
//                                     xmlns="http://www.w3.org/2000/svg"
//                                     width="20"
//                                     height="20"
//                                     viewBox="0 0 24 24"
//                                     fill="none"
//                                     stroke="white"
//                                     strokeWidth="2"
//                                     strokeLinecap="round"
//                                     strokeLinejoin="round"
//                                 >
//                                     <path d="M20 21a8 8 0 1 0-16 0"/>
//                                     <circle cx="12" cy="7" r="4"/>
//                                 </svg>
//                             </div>
//
//                             {userOpen && (
//                                 <div className="user-dropdown">
//                                     <div className="dropdown-item">
//                                         👤 {user?.fullName || user?.username}
//                                     </div>
//                                     <div className="dropdown-divider" />
//
//                                     <div
//                                         className="dropdown-item logout"
//                                         onClick={handleLogout}
//                                     >
//                                         🚪 Chiqish
//                                     </div>
//                                 </div>
//                             )}
//
//                         </div>
//
//                     </div>
//
//                 </div>
//
//                 {/* Pages */}
//                 <div className="page-content">
//                     <Routes>
//                         <Route path="/" element={<DashboardPage />} />
//                         <Route path="/products" element={<ProductsPage />} />
//                         <Route path="/categories" element={<CategoriesPage />} />
//                         <Route path="/units" element={<UnitsPage />} />
//                         <Route path="/warehouses" element={<WarehousesPage />} />
//                         <Route path="/customers" element={<CustomersPage />} />
//                         {/* Keyingi sahifalar shu yerga qo'shiladi */}
//                     </Routes>
//                 </div>
//             </div>
//             {/* Kurs o'zgartirish modal */}
//             {showRateModal && (
//                 <div className="modal fade show d-block" style={{background:'rgba(0,0,0,0.5)'}}>
//                     <div className="modal-dialog modal-sm modal-dialog-centered">
//                         <div className="modal-content">
//                             <div className="modal-header">
//                                 <h6 className="modal-title">💵 Dollar kursini o'zgartirish</h6>
//                                 <button className="btn-close" onClick={() => setShowRateModal(false)} />
//                             </div>
//                             <div className="modal-body">
//                                 <label className="form-label small">1 USD = ? UZS</label>
//                                 <input
//                                     type="number"
//                                     className="form-control"
//                                     value={newRate}
//                                     onChange={e => setNewRate(e.target.value)}
//                                     placeholder="Masalan: 12700"
//                                     autoFocus
//                                     onKeyDown={e => e.key === 'Enter' && handleSaveRate()}
//                                 />
//                                 {exchangeRate && (
//                                     <small className="text-muted">Hozirgi kurs: {new Intl.NumberFormat('uz-UZ').format(exchangeRate)} UZS</small>
//                                 )}
//                             </div>
//                             <div className="modal-footer">
//                                 <button className="btn btn-secondary btn-sm" onClick={() => setShowRateModal(false)}>Bekor</button>
//                                 <button className="btn btn-primary btn-sm" onClick={handleSaveRate} disabled={rateSaving}>
//                                     {rateSaving ? 'Saqlanmoqda...' : 'Saqlash'}
//                                 </button>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             )}
//         </div>
//     )
// }