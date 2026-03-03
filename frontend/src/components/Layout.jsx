import { NavLink, Routes, Route, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../hooks/useAuth'
import DashboardPage from '../pages/DashboardPage'
import ProductsPage from '../pages/ProductsPage'
import { useState, useEffect, useRef  } from 'react'
import '../styles/layout.css'

const navItems = [
    { path: '/',           key: 'dashboard',  icon: '📊' },
    { path: '/sales',      key: 'sales',      icon: '🛒' },
    { path: '/products',   key: 'products',   icon: '📦' },
    { path: '/customers',  key: 'customers',  icon: '👥' },
    { path: '/purchases',  key: 'purchases',  icon: '🚚' },
    { path: '/suppliers',  key: 'suppliers',  icon: '🏭' },
    { path: '/warehouses', key: 'warehouses', icon: '🏬' },
    { path: '/categories', key: 'categories', icon: '🗂️' },
    { path: '/employees',  key: 'employees',  icon: '👤' },
    { path: '/partners',   key: 'partners',   icon: '🤝' },
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

    const [userOpen, setUserOpen] = useState(false)

    const userRef = useRef(null)

    useEffect(() => {
        function handleClickOutside(event) {
            if (userRef.current && !userRef.current.contains(event.target)) {
                setUserOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const changeLang = (lng) => {
        i18n.changeLanguage(lng)
        localStorage.setItem('buildpos_lang', lng)
        setLangOpen(false)
    }

    return (
        <div>
            {/* Sidebar */}
            <nav className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
                <div className="sidebar-header">
                    <div className="brand-icon">🏗️</div>
                    {sidebarOpen && <span className="brand-text">PrimeStroy</span>}

                    <button
                        className="collapse-btn"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? '«' : '»'}
                    </button>
                </div>

                <div className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <span className="icon">{item.icon}</span>
                            {sidebarOpen && (
                                <span className="sidebar-text">
                                    {t(`nav.${item.key}`)}
                                </span>
                            )}
                        </NavLink>
                    ))}
                </div>

            </nav>

            {/* Main */}
            <div className="main-content">
                {/* Topbar */}
                <div className="topbar">

                    <div className="topbar-left">
                        <span className="topbar-title">PrimeStroy</span>
                    </div>

                    <div className="topbar-right">

                        {/* Language Dropdown */}
                        <div className="language-switch ref={langRef}" ref={langRef}>
                            <div
                                className="lang-selected"
                                onClick={() => setLangOpen(!langOpen)}
                            >
                                {i18n.language.toUpperCase()}
                            </div>

                            {langOpen && (
                                <div className="lang-dropdown">
                                    {[
                                        { code: 'UZB', label: "UZB" },
                                        { code: 'ЎЗБ', label: "ЎЗБ" },
                                        { code: 'РУС', label: "РУС" },
                                        { code: 'ENG', label: "ENG" }
                                    ]
                                        .filter(lang => lang.code !== i18n.language) // ❗ tanlanganni olib tashlaymiz
                                        .map(lang => (
                                            <div
                                                key={lang.code}
                                                onClick={() => changeLang(lang.code)}
                                            >
                                                {lang.label}
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>

                        {/* User Box */}
                        <div className="user-wrapper" ref={userRef}>

                            <div
                                className="user-avatar-btn"
                                onClick={() => setUserOpen(!userOpen)}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M20 21a8 8 0 1 0-16 0"/>
                                    <circle cx="12" cy="7" r="4"/>
                                </svg>
                            </div>

                            {userOpen && (
                                <div className="user-dropdown">
                                    <div className="dropdown-item">
                                        👤 {user?.fullName || user?.username}
                                    </div>
                                    <div className="dropdown-divider" />

                                    <div
                                        className="dropdown-item logout"
                                        onClick={handleLogout}
                                    >
                                        🚪 Chiqish
                                    </div>
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
                        {/* Keyingi sahifalar shu yerga qo'shiladi */}
                    </Routes>
                </div>
            </div>
        </div>
    )
}