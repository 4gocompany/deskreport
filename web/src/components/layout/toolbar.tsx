import { Search } from 'lucide-react';

type ToolbarProps = {
  children?: React.ReactNode;
  toolbarOptions?: React.ReactNode;
  inputSearch?: 'on' | 'off';
};

export function Toolbar({ children, toolbarOptions, inputSearch }: ToolbarProps) {
  return (
    <div className='px-10 py-3 border-b border-neutral-800/50 flex items-center justify-between gap-3'>
      <div className='flex items-center gap-3'>
        {inputSearch !== 'off' ? (
          <>
            <div className='relative flex items-center'>
              <Search className='absolute ml-3' size={16} />
              <input
                className='w-[230px] bg-neutral-900 focus:bg-neutral-800 pl-10 py-2 rounded-lg text-sm outline-none ring-1 ring-transparent focus:ring-indigo-400'
                type='text'
                placeholder='Pesquisa...'
              />
            </div>
            <span className='h-2 w-px bg-neutral-100/40 mx-3 ' />
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
