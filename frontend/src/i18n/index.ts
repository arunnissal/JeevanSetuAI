import { useAuthStore } from '../store/useAuthStore';
import en from './translations/en';
import hi from './translations/hi';
import ta from './translations/ta';

const translations: Record<string, typeof en> = {
  en,
  hi,
  ta,
};

export const useTranslation = () => {
  const language = useAuthStore((state) => state.language);
  const t = translations[language] || en;
  return { t, language };
};
export type TranslationType = typeof en;
