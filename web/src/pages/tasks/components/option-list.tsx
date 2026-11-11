import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../../components/ui/button';

type OptionListProps = {
  options: string[];
  multiSelect?: boolean;
  disabled?: boolean;
  onConfirm: (selected: string[]) => void;
};

export function OptionList({ options, multiSelect, disabled, onConfirm }: OptionListProps) {
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(option: string) {
    if (selected.includes(option)) return setSelected(selected.filter((item) => item !== option));
    setSelected(multiSelect ? [...selected, option] : [option]);
  }

  return (
    <div className='space-y-2'>
      <div className='space-y-1.5'>
        {options.map((option) => {
          const checked = selected.includes(option);
          return (
            <button
              key={option}
              type='button'
              onClick={() => toggle(option)}
              className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                checked
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-zinc-900 dark:text-zinc-100'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <span
                className={`h-4 w-4 shrink-0 flex items-center justify-center border ${multiSelect ? 'rounded' : 'rounded-full'} ${
                  checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {checked && <Check size={12} strokeWidth={3} />}
              </span>
              {option}
            </button>
          );
        })}
      </div>
      <Button size='sm' onClick={() => onConfirm(selected)} disabled={disabled || !selected.length}>
        Confirmar seleção
      </Button>
    </div>
  );
}
