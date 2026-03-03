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

    const toggleLang = () => {
        const newLang = i18n.language === 'uz' ? 'ru' : 'uz'
        i18n.changeLanguage(newLang)
        localStorage.setItem('buildpos_lang', newLang)
    }

    return (
        <div className="login-wrapper">
            <div className="login-card">

                <div className="login-header">
                    <div>
                        <h4>PrimeStroy</h4>
                        <small>{t('login.name')}</small>
                    </div>

                    <button className="lang-btn" onClick={toggleLang}>
                        {i18n.language === 'uz' ? 'RU' : 'UZ'}
                    </button>
                </div>

                <h5 className="mb-3">{t('login.title')}</h5>

                {error && <div className="alert alert-danger py-2">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label className="form-label">{t('login.username')}</label>
                        <input
                            type="text"
                            className="form-control"
                            value={form.username}
                            onChange={(e) =>
                                setForm({ ...form, username: e.target.value })
                            }
                            required
                            autoFocus
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label">{t('login.password')}</label>
                        <input
                            type="password"
                            className="form-control"
                            value={form.password}
                            onChange={(e) =>
                                setForm({ ...form, password: e.target.value })
                            }
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-100"
                        disabled={loading}
                    >
                        {loading ? t('common.loading') : t('login.submit')}
                    </button>
                </form>
            </div>
        </div>
    )
}

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
//         if (result.success) {
//             navigate('/')
//         } else {
//             setError(t('login.error'))
//         }
//     }
//
//     const toggleLang = () => {
//         const newLang = i18n.language === 'uz' ? 'ru' : 'uz'
//         i18n.changeLanguage(newLang)
//         localStorage.setItem('buildpos_lang', newLang)
//     }
//
//     return (
//         <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
//             <div className="card shadow-sm" style={{ width: '100%', maxWidth: 400 }}>
//                 <div className="card-body p-4">
//
//                     {/* Logo va til */}
//                     <div className="d-flex justify-content-between align-items-center mb-4">
//                         <div>
//                             <h4 className="mb-0 fw-bold text-primary">Prime Stroy</h4>
//                             <small className="text-muted">Qurilish mollari do'koni</small>
//                         </div>
//                         <button
//                             className="btn btn-sm btn-outline-secondary"
//                             onClick={toggleLang}
//                         >
//                             {i18n.language === 'uz' ? 'RU' : 'UZ'}
//                         </button>
//                     </div>
//
//                     <h5 className="mb-3">{t('login.title')}</h5>
//
//                     {error && (
//                         <div className="alert alert-danger py-2">{error}</div>
//                     )}
//
//                     <form onSubmit={handleSubmit}>
//                         <div className="mb-3">
//                             <label className="form-label">{t('login.username')}</label>
//                             <input
//                                 type="text"
//                                 className="form-control"
//                                 value={form.username}
//                                 onChange={(e) => setForm({ ...form, username: e.target.value })}
//                                 required
//                                 autoFocus
//                             />
//                         </div>
//                         <div className="mb-4">
//                             <label className="form-label">{t('login.password')}</label>
//                             <input
//                                 type="password"
//                                 className="form-control"
//                                 value={form.password}
//                                 onChange={(e) => setForm({ ...form, password: e.target.value })}
//                                 required
//                             />
//                         </div>
//                         <button
//                             type="submit"
//                             className="btn btn-primary w-100"
//                             disabled={loading}
//                         >
//                             {loading ? t('common.loading') : t('login.submit')}
//                         </button>
//                     </form>
//                 </div>
//             </div>
//         </div>
//     )
// }