import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from './Icon';
import { LANGUAGES } from '../i18n';

export default function LangToggle({ fullWidth = false, align = 'right' }) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredLanguages = LANGUAGES.filter((lang) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      lang.name.toLowerCase().includes(q) ||
      lang.native.toLowerCase().includes(q) ||
      lang.code.toLowerCase().includes(q)
    );
  });

  const changeLanguage = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('sg_lang', code);
    document.documentElement.lang = code;
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`relative inline-block text-left z-50 ${fullWidth ? 'w-full' : ''}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 rounded-xl border border-outline-variant/70 bg-surface-container-low px-3 py-1.5 font-label-sm text-label-sm text-on-surface shadow-xs transition-all duration-200 hover:bg-surface-variant/80 hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer ${
          fullWidth ? 'w-full' : ''
        }`}
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="language" className="text-[17px] text-primary shrink-0" />
          <span className="font-bold text-xs truncate">{currentLang.flag} {currentLang.native}</span>
        </div>
        <Icon name="expand_more" className={`text-[16px] text-on-surface-variant shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute ${align === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'} mt-2 w-64 rounded-2xl border border-outline-variant bg-surface p-2.5 shadow-2xl z-[99999] animate-in fade-in zoom-in-95 duration-150`}>
          {/* Search Bar */}
          <div className="p-1 mb-1.5">
            <div className="relative flex items-center">
              <Icon name="search" className="absolute left-2.5 text-outline text-[15px]" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search language / भाषा खोजें..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface-variant/40 border border-outline-variant/60 rounded-xl text-on-surface placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium"
              />
            </div>
          </div>

          {/* Language List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((lang) => {
                const isSelected = i18n.language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => changeLanguage(lang.code)}
                    className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-primary/10 font-bold text-primary'
                        : 'text-on-surface hover:bg-surface-variant/60'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{lang.flag}</span>
                      <span className="font-semibold">{lang.native}</span>
                      <span className="text-[11px] text-outline font-medium">({lang.name})</span>
                    </div>
                    {isSelected && <Icon name="check" className="text-sm text-primary" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-outline">
                No language found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
