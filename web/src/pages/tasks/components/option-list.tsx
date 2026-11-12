import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import type { WaitingQuestion } from '../tasks-data';

type OptionListProps = {
  questions: WaitingQuestion[];
  recommended?: boolean;
  disabled?: boolean;
  onConfirm: (answers: string[]) => void;
};

const OTHER = 'Outro';

export function OptionList({ questions, recommended, disabled, onConfirm }: OptionListProps) {
  const [selected, setSelected] = useState<string[][]>(questions.map(() => []));
  const [other, setOther] = useState<string[]>(questions.map(() => ''));

  function toggle(index: number, label: string, multiSelect?: boolean) {
    const current = selected[index];
    const next = current.includes(label) ? current.filter((item) => item !== label) : multiSelect ? [...current, label] : [label];
    setSelected(selected.map((item, i) => (i === index ? next : item)));
  }

  function answer(index: number) {
    const labels = selected[index].filter((label) => label !== OTHER);
    const text = selected[index].includes(OTHER) || !questions[index].options.length ? other[index].trim() : '';
    return [...labels, text].filter(Boolean).join(', ');
  }

  const answers = questions.map((_, index) => answer(index));

  return (
    <div className='space-y-3'>
      {questions.map((item, index) => (
        <div key={index} className='space-y-1.5'>
          <p className='text-sm text-zinc-800 dark:text-zinc-200'>
            {item.header && (
              <span className='mr-2 rounded-full bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400'>
                {item.header}
              </span>
            )}
            {item.question}
          </p>
          {item.options.map((option, optionIndex) => {
            const checked = selected[index].includes(option.label);
            return (
              <button
                key={option.label}
                type='button'
                onClick={() => toggle(index, option.label, item.multiSelect)}
                className={`w-full flex items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  checked
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-zinc-900 dark:text-zinc-100'
                    : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                }`}
              >
                <span
                  className={`mt-0.5 h-4 w-4 shrink-0 flex items-center justify-center border ${item.multiSelect ? 'rounded' : 'rounded-full'} ${
                    checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
                  }`}
                >
                  {checked && <Check size={12} strokeWidth={3} />}
                </span>
                <span className='min-w-0'>
                  <span className='font-medium'>{option.label}</span>
                  {recommended && optionIndex === 0 && item.options.length > 1 && (
                    <span className='ml-2 rounded-full bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 text-xs font-medium text-blue-600 dark:text-blue-400'>
                      Recomendada
                    </span>
                  )}
                  {option.description && <span className='block text-xs text-zinc-500'>{option.description}</span>}
                </span>
              </button>
            );
          })}
          {item.options.length > 0 && (
            <button
              type='button'
              onClick={() => toggle(index, OTHER, item.multiSelect)}
              className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                selected[index].includes(OTHER)
                  ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-zinc-900 dark:text-zinc-100'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
              }`}
            >
              <span
                className={`h-4 w-4 shrink-0 flex items-center justify-center border ${item.multiSelect ? 'rounded' : 'rounded-full'} ${
                  selected[index].includes(OTHER) ? 'bg-blue-600 border-blue-600 text-white' : 'border-zinc-300 dark:border-zinc-700'
                }`}
              >
                {selected[index].includes(OTHER) && <Check size={12} strokeWidth={3} />}
              </span>
              {OTHER}
            </button>
          )}
          {(!item.options.length || selected[index].includes(OTHER)) && (
            <input
              value={other[index]}
              maxLength={2000}
              placeholder='Escreva a resposta'
              onChange={(event) => setOther(other.map((value, i) => (i === index ? event.target.value : value)))}
              className='w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-400'
            />
          )}
        </div>
      ))}
      <Button size='sm' onClick={() => onConfirm(answers)} disabled={disabled || !answers.every(Boolean)}>
        {questions.length > 1 ? 'Confirmar respostas' : 'Responder'}
      </Button>
    </div>
  );
}
