import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { Language, LanguageInfo } from '../../i18n/translations';

export const LanguageSelector: React.FC = () => {
  const { language, currentLanguageInfo, setLanguage, availableLanguages, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleDocumentClick);
      document.addEventListener('keydown', handleKeyDown);
      // Auto-focus search input
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Filter languages by English name, native name, or code
  const filteredLanguages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableLanguages;

    return availableLanguages.filter((lang) => {
      const matchName = lang.name.toLowerCase().includes(query);
      const matchNative = lang.nativeName.toLowerCase().includes(query);
      const matchCode = lang.code.toLowerCase().includes(query);
      return matchName || matchNative || matchCode;
    });
  }, [searchQuery, availableLanguages]);

  const handleSelect = (code: Language) => {
    setLanguage(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        id="language-selector-button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current language: ${currentLanguageInfo.name}. Click to change language.`}
        className="flex items-center justify-between gap-1.5 h-10 px-2.5 sm:px-3 bg-[var(--m-surface-2)] hover:bg-[var(--m-surface-1)] border border-[var(--m-border)] hover:border-[var(--m-accent)]/60 rounded-xl text-white text-xs font-semibold tracking-wide transition-colors focus:outline-none focus:ring-1 focus:ring-[var(--m-focus)] shrink-0 whitespace-nowrap cursor-pointer"
      >
        <span className="material-symbols-outlined text-[16px] text-[var(--m-accent)]">
          translate
        </span>
        
        {/* Desktop Label: Native name or English */}
        <span className="hidden sm:inline whitespace-nowrap">
          {currentLanguageInfo.nativeName !== currentLanguageInfo.name
            ? `${currentLanguageInfo.nativeName}`
            : currentLanguageInfo.name}
        </span>

        {/* Mobile Label: 2-3 char code */}
        <span className="sm:hidden uppercase font-mono text-[11px]">
          {currentLanguageInfo.code}
        </span>

        <span
          className={`material-symbols-outlined text-[16px] text-[var(--m-text-secondary)] transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        >
          arrow_drop_down
        </span>
      </button>

      {/* Searchable Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          aria-label="Select platform language"
          className="absolute right-0 mt-1.5 w-64 sm:w-72 max-w-[calc(100vw-24px)] bg-[var(--m-surface-2)] border border-[var(--m-border)] rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col"
          style={{ maxHeight: '380px' }}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-[var(--m-border-strong)] bg-[var(--m-surface-1)] sticky top-0 z-10">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[var(--m-text-secondary)] text-[16px]">
                search
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchLanguage', 'Search language...')}
                className="w-full h-8 bg-[var(--m-surface-2)] border border-[var(--m-border-strong)] rounded text-[var(--m-text-primary)] text-xs pl-7 pr-7 focus:outline-none focus:border-[var(--m-accent)]"
                aria-label={t('searchLanguage', 'Search language...')}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--m-text-secondary)] hover:text-[var(--m-text-primary)] text-xs"
                  aria-label="Clear search"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
            <div className="flex justify-between items-center px-1 mt-1 text-[10px] text-[var(--m-text-secondary)]">
              <span>22 Scheduled Languages + English</span>
              <span>{filteredLanguages.length} available</span>
            </div>
          </div>

          {/* Languages Scrollable List */}
          <div className="overflow-y-auto py-1 max-h-[280px] scrollbar-thin">
            {filteredLanguages.length > 0 ? (
              filteredLanguages.map((item: LanguageInfo) => {
                const isSelected = language === item.code;
                return (
                  <button
                    key={item.code}
                    id={`lang-option-${item.code}`}
                    role="option"
                    aria-selected={isSelected}
                    type="button"
                    onClick={() => handleSelect(item.code)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors border-b border-[var(--m-border-strong)] last:border-0 ${
                      isSelected
                        ? 'bg-[var(--m-accent)] text-[var(--m-on-accent)] font-bold'
                        : 'text-[var(--m-text-primary)] hover:bg-[var(--m-surface-3)] hover:text-[var(--m-text-primary)]'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="text-[13px] leading-tight font-medium">
                        {item.nativeName}
                      </span>
                      {item.nativeName !== item.name && (
                        <span
                          className={`text-[11px] leading-tight ${
                            isSelected ? 'text-white/80' : 'text-[var(--m-text-secondary)]'
                          }`}
                        >
                          {item.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono px-1 py-0.2 rounded border ${
                          isSelected
                            ? 'bg-white/20 border-white/40 text-white'
                            : 'bg-[var(--m-surface-1)] border-[var(--m-border-strong)] text-[var(--m-text-secondary)]'
                        }`}
                      >
                        {item.code.toUpperCase()}
                      </span>
                      {isSelected && (
                        <span className="material-symbols-outlined text-[16px] text-white">
                          check
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-center text-xs text-[var(--m-text-secondary)]">
                No language found matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
