import { Bell } from 'lucide-react';
import { Toolbar } from './toolbar';
import { Notification } from './notification';
import { useSubmenuNavigation } from '../../store';
import { SubNavLink } from './navbar';

type TopbarProps = {
  title?: string;
  toolbarOptions?: React.ReactNode;
  children?: React.ReactNode;
  inputSearch?: 'on' | 'off';
};

export function Topbar({ title, children, toolbarOptions, inputSearch }: TopbarProps) {
  const [navigation] = useSubmenuNavigation((state) => [state.navigation])

  return (
    <div className='toolbar'>
      <div className='py-3 border-b border-neutral-800/50 w-full flex items-center justify-between px-10'>
        <div className='flex items-center gap-3'>
          <h1 className='text-xl items-center whitespace-nowrap'>
            {title}
          </h1>
          <div className='ml-10 flex space-x-2 w-full text-sm'>
            {
              navigation.map((subitem) => (
                <SubNavLink key={subitem.to} name={subitem.name} to={subitem.to} />
              ))
            }
          </div>
        </div>
        <div className='flex gap-4 items-center'>
          <button className='group relative p-2 hover:bg-neutral-700 focus:bg-neutral-900 rounded-lg'>
            <Bell size={16} strokeWidth={2} />
            <Notification />
          </button>
          <button className='relative group hover:bg-neutral-700 rounded-full'>
            <img className='rounded-full bg-indigo-400' width={32} height={32} src='https://robohash.org/rodriggopda.png?set=set5&size=126x126' />
          </button>
        </div>
      </div>
      {children ? (
        <Toolbar inputSearch={inputSearch} toolbarOptions={toolbarOptions}>
          {children}
        </Toolbar>
      ) : null}
    </div>
  );
}
