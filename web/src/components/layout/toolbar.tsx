import { Search } from 'lucide-react';

type ToolbarProps = {
  children?: React.ReactNode;
  toolbarOptions?: React.ReactNode;
  inputSearch?: 'on' | 'off';
};

export function Toolbar({ children, toolbarOptions, inputSearch }: ToolbarProps) {
  return (
    <div className='bg-zinc-50 dark:bg-zinc-950 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3'>
      <div className='flex items-center gap-3'>
        {inputSearch !== 'off' ? (
          <>
            <div className='relative flex items-center'>
              <Search className='absolute ml-3' size={16} />
              <input
                className='w-[230px] bg-zinc-100 dark:bg-zinc-900 focus:bg-white dark:focus:bg-zinc-800 pl-10 py-2 rounded-lg text-sm outline-none ring-1 ring-transparent focus:ring-zinc-400 dark:focus:ring-zinc-500 border border-transparent focus:border-zinc-300 dark:focus:border-transparent transition-all'
                type='text'
                placeholder='Pesquisa...'
              />
            </div>
            <span className='h-2 w-px bg-zinc-300 dark:bg-zinc-100/40 mx-3 ' />
          </>
        ) : null}
        {children}
      </div>
      <div className='flex items-center gap-1'>
        {toolbarOptions}
      </div>
    </div>
  );
}
