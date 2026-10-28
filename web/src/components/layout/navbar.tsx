import React from 'react';
import { CheckCircle, MessageCircle, PieChart, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SubmenuItem } from '../../store';

export function Navbar() {

  return (
    <nav className={`max-h-screen flex flex-col sticky top-0 bottom-0 w-0 overflow-hidden lg:w-max border-r border-neutral-800/50`}>
      <div className='flex justify-between items-center px-5 py-[.725rem] bg-neutral-900'>
        <img className='mx-auto' src="/sentinela.svg" alt="Sentinela logo" />
      </div>
      <div className='flex-1 border-t border-neutral-800/50 flex'>
        <div className='flex justify-between flex-col py-4 px-4 items-center'>
          <ul className='space-y-2'>
            <MenuNavLink to='/'>
              <div className='pl-4 pr-8 py-2.5 flex items-center'>
                <PieChart size={16} strokeWidth={2} />
                <span className='ml-3'>Resumo</span>
              </div>
            </MenuNavLink>
            <MenuNavLink to='/chat'>
              <div className='pl-4 pr-8 py-2.5 flex items-center'>
                <MessageCircle size={16} strokeWidth={2} />
                <span className='ml-3'>Conversas</span>
              </div>
            </MenuNavLink>
            <MenuNavLink to='/reports'>
              <div className='pl-4 pr-8 py-2.5 flex items-center'>
                <CheckCircle size={16} strokeWidth={2} />
                <span className='ml-3'>Serviços</span>
              </div>
            </MenuNavLink>
            <MenuNavLink to='/settings'>
              <div className='pl-4 pr-8 py-2.5 flex items-center'>
                <Settings size={16} strokeWidth={2} />
                <span className='ml-3'>Configurações</span>
              </div>
            </MenuNavLink>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export function MenuNavLink({ to, children }: { to: string, children: React.ReactNode }) {
  return <NavLink to={to} className={({ isActive }) => [isActive ? 'text-indigo-400 bg-neutral-900' : 'text-neutral-500 border-transparent', ' flex flex-col hover:bg-neutral-900 rounded-lg'].join('')}>
    {children}
  </NavLink>
}

export function SubNavLink({ name, to }: SubmenuItem) {
  return <NavLink to={to} className={({ isActive }) => [isActive ? 'text-indigo-400/100 bg-neutral-900' : 'text-neutral-500', ' flex items-center gap-3 pt-1 pb-1.5 px-3  hover:bg-neutral-800 rounded-lg'].join('')}>
    <span>{name}</span>
  </NavLink>
}