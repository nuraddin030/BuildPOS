// import { useState } from 'react'
// import { useTranslation } from 'react-i18next'
// import { useNavigate } from 'react-router-dom'
// import { useAuth } from '../hooks/useAuth'
// import '../styles/login.css'

// export default function LoginPage() {
//     const { t, i18n } = useTranslation()
//     const { login, loading } = useAuth()
//     const navigate = useNavigate()
//
//     const [form, setForm] = useState({ username: '', password: '' })
//     const [error, setError] = useState('')
//
//     const handleSubmit = async (e) => {
//         e.preventDefault()
//         setError('')
//         const result = await login(form.username, form.password)
//
//         if (result.success) {
//             navigate('/')
//         } else {
//             setError(t('login.error'))
//         }
//     }
//
//     const langs = ['UZB', 'ЎЗБ', 'РУС', 'ENG']
//
//     const toggleLang = () => {
//         const currentIndex = langs.indexOf(i18n.language)
//         const nextLang = langs[(currentIndex + 1) % langs.length]
//         i18n.changeLanguage(nextLang)
//         localStorage.setItem('buildpos_lang', nextLang)
//     }
//
//     return (
//         <div className="login-wrapper">
//             <div className="login-card">
//
//                 <div className="login-header">
//                     <div>
//                         <h4>PrimeStroy</h4>
//                         <small>{t('login.name')}</small>
//                     </div>
//
//                     <button className="lang-btn" onClick={toggleLang}>
//                         {i18n.language}
//                     </button>
//                 </div>
//
//                 <h5 className="mb-3">{t('login.title')}</h5>
//
//                 {error && <div className="alert alert-danger py-2">{error}</div>}
//
//                 <form onSubmit={handleSubmit}>
//                     <div className="mb-3">
//                         <label className="form-label">{t('login.username')}</label>
//                         <input
//                             type="text"
//                             className="form-control"
//                             value={form.username}
//                             onChange={(e) =>
//                                 setForm({ ...form, username: e.target.value })
//                             }
//                             required
//                             autoFocus
//                         />
//                     </div>
//
//                     <div className="mb-4">
//                         <label className="form-label">{t('login.password')}</label>
//                         <input
//                             type="password"
//                             className="form-control"
//                             value={form.password}
//                             onChange={(e) =>
//                                 setForm({ ...form, password: e.target.value })
//                             }
//                             required
//                         />
//                     </div>
//
//                     <button
//                         type="submit"
//                         className="btn btn-primary w-100"
//                         disabled={loading}
//                     >
//                         {loading ? t('common.loading') : t('login.submit')}
//                     </button>
//                 </form>
//             </div>
//         </div>
//     )
// }

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import '../styles/login.css'

export default function LoginPage() {
    const { t, i18n } = useTranslation()
    const { login, loading } = useAuth()
    const navigate = useNavigate()

    const [form, setForm] = useState({ username: '', password: '' })
    const [error, setError] = useState('')
    const [showPassword, setShowPassword] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        const result = await login(form.username, form.password)

        if (result.success) {
            navigate('/')
        } else {
            setError(t('login.error'))
        }
    }

    const langs = ['UZB', '\u040E\u0417\u0411', '\u0420\u0423\u0421', 'ENG']

    const toggleLang = () => {
        const currentIndex = langs.indexOf(i18n.language)
        const nextLang = langs[(currentIndex + 1) % langs.length]
        i18n.changeLanguage(nextLang)
        localStorage.setItem('buildpos_lang', nextLang)
    }

    return (
        <div className="login-wrapper">
            {/* Background decorative elements */}
            <div className="login-bg-shape login-bg-shape--1"></div>
            <div className="login-bg-shape login-bg-shape--2"></div>

            <div className="login-card">
                {/* Header */}
                <div className="login-header">
                    <div className="login-brand">
                        <div className="login-brand-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 21h18" />
                                <path d="M5 21V7l8-4v18" />
                                <path d="M19 21V11l-6-4" />
                                <path d="M9 9v.01" />
                                <path d="M9 12v.01" />
                                <path d="M9 15v.01" />
                                <path d="M9 18v.01" />
                            </svg>
                        </div>
                        <div>
                            <h4 className="login-brand-name">PrimeStroy</h4>
                            <small className="login-brand-desc">{t('login.name')}</small>
                        </div>
                    </div>

                    <button className="lang-btn" onClick={toggleLang}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M2 12h20" />
                            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                        {i18n.language}
                    </button>
                </div>

                <div className="login-divider"></div>

                {/* Form section */}
                <div className="login-body">
                    <h5 className="login-title">{t('login.title')}</h5>
                    <p className="login-subtitle">{t('login.subtitle') || t('login.name')}</p>

                    {error && (
                        <div className="login-alert">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        <div className="login-field">
                            <label className="login-label">{t('login.username')}</label>
                            <div className="login-input-wrapper">
                                <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                                <input
                                    type="text"
                                    className="form-control login-input"
                                    value={form.username}
                                    onChange={(e) =>
                                        setForm({ ...form, username: e.target.value })
                                    }
                                    placeholder={t('login.username_placeholder') || ''}
                                    required
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="login-field">
                            <label className="login-label">{t('login.password')}</label>
                            <div className="login-input-wrapper">
                                <svg className="login-input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="form-control login-input login-input--password"
                                    value={form.password}
                                    onChange={(e) =>
                                        setForm({ ...form, password: e.target.value })
                                    }
                                    placeholder={t('login.password_placeholder') || ''}
                                    required
                                />
                                <button
                                    type="button"
                                    className="login-eye-btn"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary login-submit-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="login-spinner"></span>
                                    {t('common.loading')}
                                </>
                            ) : (
                                t('login.submit')
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <p className="login-footer">PrimeStroy v1.0 &middot; {t('login.name')}</p>
        </div>
    )
}

