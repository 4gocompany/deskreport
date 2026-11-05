import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface DropdownOption {
  id: string;
  name: string;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  label?: string;
}

export function Dropdown({ options, value, onChange, className = '', label }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.id === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="group inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-bold text-neutral-900 dark:text-neutral-100 bg-neutral-100/50 hover:bg-neutral-100 dark:bg-neutral-800 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
        >
          {selectedOption?.name || label}
          <ChevronDown
            size={14}
            className={`text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-56 origin-top-left rounded-xl bg-white dark:bg-zinc-900 border border-neutral-200 dark:border-neutral-800/10 focus:outline-none overflow-hidden animate-in fade-in zoom-in duration-100">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between px-4 py-2.5 text-sm transition-colors ${option.id === value
                  ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 font-bold'
                  : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
              >
                {option.name}
                {option.id === value && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
