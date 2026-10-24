import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';
import { normalizeUbigeoText } from '../../data/peruUbigeo';

interface SearchableSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  disabledMessage?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Buscar o seleccionar...',
  disabled = false,
  disabledMessage = 'Selecciona el nivel anterior primero',
  required = false,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal search input with external value when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery(value || '');
      setActiveIndex(-1);
    }
  }, [value, isOpen]);

  // Click outside listener
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  // Filtered options based on search query
  const filteredOptions = useMemo(() => {
    const q = normalizeUbigeoText(searchQuery);
    if (!q) return options;
    return options.filter(opt => normalizeUbigeoText(opt).includes(q));
  }, [options, searchQuery]);

  const handleSelect = (option: string) => {
    onChange(option);
    setSearchQuery(option);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % (filteredOptions.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + filteredOptions.length) % (filteredOptions.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        handleSelect(filteredOptions[activeIndex]);
      } else if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0]);
      } else if (searchQuery.trim()) {
        // Allow using what was typed
        onChange(searchQuery.trim());
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const cleanText = text;
    const normalizedText = normalizeUbigeoText(text);
    const normalizedQuery = normalizeUbigeoText(query);
    const index = normalizedText.indexOf(normalizedQuery);
    if (index === -1) return text;

    const start = cleanText.slice(0, index);
    const match = cleanText.slice(index, index + query.length);
    const end = cleanText.slice(index + query.length);

    return (
      <span>
        {start}
        <mark className="bg-amber-100 text-amber-950 font-semibold px-0.5 rounded">{match}</mark>
        {end}
      </span>
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      <label className="block text-[11px] font-medium text-slate-700 mb-1 flex items-center justify-between">
        <span>
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
        {value && !disabled && (
          <span className="text-[10px] text-emerald-600 font-semibold truncate max-w-[140px]">
            {value}
          </span>
        )}
      </label>

      <div className="relative">
        {icon && (
          <div className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none">
            {icon}
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          disabled={disabled}
          placeholder={disabled ? disabledMessage : placeholder}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => {
            if (!disabled) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full py-2 text-xs rounded-lg border transition-all focus:outline-none ${
            icon ? 'pl-8' : 'pl-3'
          } pr-14 ${
            disabled 
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
              : 'bg-white hover:bg-slate-50/50 focus:bg-white text-slate-900 border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
          }`}
          required={required && !value}
          autoComplete="off"
        />

        <div className="absolute right-2 top-2 flex items-center gap-1">
          {searchQuery && !disabled && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onChange('');
                setIsOpen(true);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              title="Borrar selección"
            >
              <X className="w-3 h-3" />
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setIsOpen(prev => !prev);
                inputRef.current?.focus();
              }
            }}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Dropdown List */}
      {isOpen && !disabled && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-56 flex flex-col">
          {/* Header indicator */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-1">
              <Search className="w-2.5 h-2.5 text-slate-400" />
              <span>{filteredOptions.length} opciones disponibles</span>
            </span>
            <span className="text-slate-400 font-mono">Escribe para filtrar</span>
          </div>

          <div className="overflow-y-auto divide-y divide-slate-50">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-[11px] text-slate-400">
                No se encontraron coincidencias para "{searchQuery}"
                <button
                  type="button"
                  onClick={() => handleSelect(searchQuery.trim())}
                  className="block mx-auto mt-1 text-[10px] text-emerald-600 hover:underline font-medium cursor-pointer"
                >
                  Usar "{searchQuery.trim()}" como personalizado
                </button>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = opt.toLowerCase() === value.toLowerCase();
                const isItemActive = idx === activeIndex;

                return (
                  <button
                    key={`${opt}-${idx}`}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-900 font-semibold'
                        : isItemActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="truncate mr-2">
                      {highlightMatch(opt, searchQuery)}
                    </span>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
