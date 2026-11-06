import React, { useState, useRef, useEffect } from 'react';
import { Inbox, LayoutDashboard, MessageCircle, FolderDot, CheckCircle, Bell, Settings, LogOut, User, Circle, Building, Users2 } from 'lucide-react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { SubmenuItem } from '../../store';
import { useOrganization, useSession, authClient } from '../../lib/auth-client';

export function Navbar() {
  const { company_id, project_id } = useParams();
  const navigate = useNavigate();
  const { data: organization, isPending } = useOrganization();
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cId = company_id;
  const pId = project_id ?? 'all';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await authClient.signOut();
    navigate('/login');
  };

  // Helper para checar se o módulo está ativo
  const isModuleEnabled = (moduleId: string) => {
    if (isPending) return true;
    if (!organization || !(organization as any).metadata) return true;

    try {
      const metadata = (organization as any).metadata;
      const parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      if (!parsedMetadata || !parsedMetadata.modules) return true;
      return (parsedMetadata.modules as string[]).includes(moduleId);
    } catch (e) {
      return true;
    }
  };

  return (
    <div className='h-screen max-h-screen'>
      <nav className='h-full flex flex-col w-[74px] bg-zinc-900 z-50 transition-colors'>
        <div className='flex justify-center items-center py-6 relative'>
          <div className='absolute top-0 left-0 w-full h-24 bg-[#2BCC56]/10 blur-3xl rounded-full'></div>
          <img className='h-8 relative z-10' src='/deskreport-simbol.svg' alt='DeskReport logo' />
        </div>
        <div className='flex-1 flex'>
          <div className='flex flex-col py-2 w-full'>
            {cId && (
              <ul className='space-y-3 w-full animate-in fade-in duration-500'>
                <MenuNavLink to={`/${cId}/resume`} icon={<Inbox size={22} strokeWidth={2} />} label='Início' />
                <MenuNavLink to={`/${cId}/dashboard`} icon={<LayoutDashboard size={22} strokeWidth={2} />} label='Painel' />

                {isModuleEnabled('chat') && <MenuNavLink to={`/${cId}/chat`} icon={<MessageCircle size={22} strokeWidth={2} />} label='Conversas' />}

                {/* {isModuleEnabled('automation') && <MenuNavLink to={`/${cId}/automation`} icon={<Zap size={22} strokeWidth={2} />} label='Automação' />} */}

                <MenuNavLink to={`/${cId}/teams`} icon={<Users2 size={22} strokeWidth={2} />} label='Equipes' />

                {isModuleEnabled('projects') && <MenuNavLink to={`/${cId}/projects`} icon={<FolderDot size={22} strokeWidth={2} />} label='Projetos' />}

                {isModuleEnabled('tasks') && <MenuNavLink to={`/${cId}/${pId}/tasks`} icon={<CheckCircle size={22} strokeWidth={2} />} label='Tarefas' />}

                <MenuNavLink to={`/${cId}/notifications`} icon={<Bell size={22} strokeWidth={2} />} label='Avisos' />
                <MenuNavLink to={`/${cId}/settings`} icon={<Settings size={22} strokeWidth={2} />} label='Configs' />
              </ul>
            )}
          </div>
        </div>
        <div className='mt-auto p-2 pb-6 flex flex-col items-center gap-6 relative' ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={`w-10 h-10 rounded-lg overflow-hidden border transition-colors ${isDropdownOpen ? 'border-white' : 'border-white/20 hover:border-white'}`}
          >
            <img
              src={session?.user?.image || 'https://robohash.org/rodriggopda.png?set=set5&size=126x126'}
              alt='Avatar'
              className='w-full h-full object-cover bg-white/10'
            />
          </button>

          {isDropdownOpen && (
            <div className='absolute bottom-12 left-14 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden animate-in fade-in zoom-in duration-200 z-[100]'>
              <div className='p-4 border-b border-zinc-200 dark:border-zinc-800'>
                <div className='font-bold text-sm text-zinc-900 dark:text-zinc-100'>{session?.user?.name || 'Usuário'}</div>
                <div className='font-bold text-[10px] text-zinc-500'>{session?.user?.email || 'usuario@email.com'}</div>
              </div>

              <div className='p-2 border-b border-zinc-200 dark:border-zinc-800'>
                <div className='px-2 py-1 text-[10px] font-bold text-zinc-400  tracking-widest mb-1'>Visibilidade</div>
                <button className='w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors'>
                  <Circle size={10} className='fill-emerald-500 text-emerald-500' /> Online
                </button>
                <button className='w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors'>
                  <Circle size={10} className='fill-red-500 text-red-500' /> Não incomode
                </button>
                <button className='w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors'>
                  <Circle size={10} className='fill-amber-500 text-amber-500' /> Ocupado
                </button>
                <button className='w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors'>
                  <Circle size={10} className='fill-zinc-500 text-zinc-500' /> Offline
                </button>
              </div>

              <div className='p-2 border-b border-zinc-200 dark:border-zinc-800'>
                <button
                  onClick={() => {
                    navigate(`/organizations`);
                    setIsDropdownOpen(false);
                  }}
                  className='w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors'
                >
                  <Building size={14} /> Minhas organizações
                </button>
                <button
                  onClick={() => {
                    navigate(`/${cId}/settings/profile`);
                    setIsDropdownOpen(false);
                  }}
                  className='w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors'
                >
                  <User size={14} /> Meu perfil
                </button>
                <button
                  onClick={() => {
                    navigate(`/${cId}/settings`);
                    setIsDropdownOpen(false);
                  }}
                  className='w-full flex items-center gap-2 px-2 py-1.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors'
                >
                  <Settings size={14} /> Configurações gerais
                </button>
              </div>

              <div className='p-2'>
                <button
                  onClick={handleLogout}
                  className='w-full flex items-center gap-2 px-2 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors'
                >
                  <LogOut size={14} /> Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}

export function MenuNavLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <li className='relative group'>
      <NavLink
        to={to}
        className={({ isActive }) =>
          [
            isActive ? 'text-white font-semibold' : 'text-zinc-400 font-medium hover:text-zinc-200',
            'flex flex-col items-center justify-center gap-1.5 transition-all duration-200 py-1',
          ].join(' ')
        }
      >
        {({ isActive }) => (
          <div className='flex flex-col items-center justify-center gap-1 transition-all duration-200 py-1'>
            <div
              className={`p-1 rounded-lg transition-all duration-200 flex items-center justify-center ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white'}`}
            >
              {React.cloneElement(icon as React.ReactElement, {
                fill: isActive ? '#737373' : 'none',
                stroke: isActive ? 'currentColor' : 'currentColor',
                strokeWidth: isActive ? 2 : 2,
              })}
            </div>
            <span className='text-[10px] font-medium'>{label}</span>
          </div>
        )}
      </NavLink>
    </li>
  );
}

export function SubNavLink({ name, to }: SubmenuItem) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          isActive
            ? 'text-zinc-900 dark:text-zinc-100 border-zinc-900 dark:border-zinc-100'
            : 'text-zinc-500 dark:text-zinc-400 border-transparent hover:text-zinc-900 dark:hover:text-zinc-200',
          'border-b-2 -mb-px flex items-center gap-2 py-2.5 px-3 text-sm font-medium whitespace-nowrap transition-colors',
        ].join(' ')
      }
    >
      <span>{name}</span>
    </NavLink>
  );
}
