import { MouseEvent, ReactNode } from 'react';

// Padrão das telas de lista: linha densa, colunas alinhadas, clique na linha abre o item e as ações aparecem no hover.
// columns é o grid-template-columns, igual no cabeçalho e nas linhas
interface ListProps {
  columns: string;
  headers: string[];
  children: ReactNode;
}

export function List({ columns, headers, children }: ListProps) {
  return (
    <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden'>
      <div
        className='grid items-center px-4 h-9 border-b border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-500'
        style={{ gridTemplateColumns: columns }}
      >
        {headers.map((header, index) => (
          <span key={index}>{header}</span>
        ))}
      </div>
      {children}
    </div>
  );
}

interface ListRowProps {
  columns: string;
  onClick?: () => void;
  children: ReactNode;
}

export function ListRow({ columns, onClick, children }: ListRowProps) {
  return (
    <div
      onClick={onClick}
      className='group grid items-center px-4 h-11 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors'
      style={{ gridTemplateColumns: columns }}
    >
      {children}
    </div>
  );
}

// Ações da linha ficam escondidas até o hover. O clique não abre a linha
export function ListActions({ children }: { children: ReactNode }) {
  return <div className='flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity'>{children}</div>;
}

interface ListActionProps {
  title: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}

export function ListAction({ title, onClick, danger, children }: ListActionProps) {
  function handleClick(event: MouseEvent) {
    event.stopPropagation();
    onClick();
  }

  return (
    <button
      onClick={handleClick}
      title={title}
      className={`p-1.5 rounded-md text-zinc-400 ${danger ? 'hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:text-zinc-700 hover:bg-zinc-200/60 dark:hover:text-zinc-200 dark:hover:bg-zinc-700/60'}`}
    >
      {children}
    </button>
  );
}
