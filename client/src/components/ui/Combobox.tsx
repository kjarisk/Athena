import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComboboxProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  allowCustom?: boolean;
  className?: string;
}

export default function Combobox({
  label,
  value,
  onChange,
  suggestions,
  placeholder = 'Type or select...',
  required = false,
  allowCustom = true,
  className
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [filteredSuggestions, setFilteredSuggestions] = useState(suggestions);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const filtered = suggestions.filter(s =>
      s.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredSuggestions(filtered);
  }, [inputValue, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // If custom values are allowed, keep the typed value
        if (allowCustom && inputValue) {
          onChange(inputValue);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [inputValue, allowCustom, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    if (allowCustom) {
      onChange(newValue);
    }
  };

  const handleSelect = (suggestion: string) => {
    setInputValue(suggestion);
    onChange(suggestion);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'Enter' && filteredSuggestions.length > 0) {
      e.preventDefault();
      handleSelect(filteredSuggestions[0]);
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="block text-sm font-medium text-text-secondary mb-1.5">
          {label}
        </label>
      )}
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          required={required}
          className={cn(
            'w-full px-3 py-2.5 pr-16',
            'bg-surface rounded-xl',
            'border border-border',
            'text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
            'transition-all duration-200'
          )}
        />
        
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {inputValue && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-lg hover:bg-surface transition-colors"
            >
              <X className="w-4 h-4 text-text-muted" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 rounded-lg hover:bg-surface transition-colors"
          >
            <ChevronDown className={cn(
              'w-4 h-4 text-text-muted transition-transform',
              isOpen && 'rotate-180'
            )} />
          </button>
        </div>
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 py-1 bg-surface rounded-xl border border-border shadow-lg max-h-60 overflow-auto">
          {filteredSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-left text-sm',
                'hover:bg-surface transition-colors',
                suggestion === value && 'bg-primary/10 text-primary font-medium'
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {isOpen && filteredSuggestions.length === 0 && inputValue && allowCustom && (
        <div className="absolute z-50 w-full mt-1 py-2 px-3 bg-surface rounded-xl border border-border shadow-lg">
          <p className="text-sm text-text-muted">
            Press Enter to use "{inputValue}"
          </p>
        </div>
      )}
    </div>
  );
}
