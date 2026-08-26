import { useTranslation } from 'react-i18next';
import Icon from "./Icon";

export default function LangToggle() {
  const { i18n } = useTranslation();
  const isHi = i18n.language === 'hi';
  return (
    <button
      onClick={() => {
        const next = isHi ? 'en' : 'hi';
        i18n.changeLanguage(next);
        localStorage.setItem('sg_lang', next);
      }}
      className="hidden items-center gap-xs rounded-full border border-outline-variant px-3 py-1.5 font-label-sm text-label-sm text-on-surface transition-colors hover:bg-surface-variant/50 sm:flex"
      aria-label="Toggle language"
    >
      <Icon name="language" className=" text-[18px]" />
      <span>EN / HI</span>
    </button>
  );
}
