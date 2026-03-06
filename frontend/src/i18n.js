import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import UZB from './locales/uz.json'
import РУС from './locales/ru.json'
import ЎЗБ from './locales/uz-cyrl.json'
import ENG from './locales/en.json'

const savedLang = localStorage.getItem('buildpos_lang') || 'UZB'

i18n
    .use(initReactI18next)
    .init({
        resources: {
            UZB: { translation: UZB },
            РУС: { translation: РУС },
            ЎЗБ: { translation: ЎЗБ },
            ENG: { translation: ENG },
        },
        lng: savedLang,
        fallbackLng: 'UZB',
        interpolation: { escapeValue: false },
    })

export default i18n