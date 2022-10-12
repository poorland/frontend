import i18n from "i18next";
import XHR from 'i18next-xhr-backend'
import {
    initReactI18next
} from 'react-i18next';

i18n.use(XHR)
    // .use(LanguageDetector)
    .use(initReactI18next) //init i18next
    .init({
        backend: {
            loadPath:'./locales/{{lng}}.json'
        },
        react: {
            useSuspense: true
        },
        fallbackLng: 'en',
        preload: [
            'en', 'cn'
        ],
        keySeparator: false,
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;