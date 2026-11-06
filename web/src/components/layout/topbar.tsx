import { Toolbar } from './toolbar';
import { useSubmenuNavigation, useUIStore, useTenantStore } from '../../store';
import { SubNavLink } from './navbar';
import { ChevronRight, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dropdown } from '../ui/dropdown';
import { useTenant } from '../../hooks/useTenant';
import { useEffect } from 'react';

type TopbarProps = {
  title?: string;
  toolbarOptions?: React.ReactNode;
  children?: React.ReactNode;
  inputSearch?: 'on' | 'off';
  smartHeader?: boolean;
};

export function Topbar({ title, children, toolbarOptions, inputSearch, smartHeader }: TopbarProps) {
  const [navigation] = useSubmenuNavigation((state) => [state.navigation]);
  const { chatSidebarMode, toggleChatSidebarMode } = useUIStore();
  const { company_id, project_id } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();
  const { organizations, projects, fetchOrganizations, fetchProjects } = useTenantStore();

  const currentCompany = company_id;

  useEffect(() => {
    fetchOrganizations();
    if (currentCompany && currentCompany !== '...') {
      fetchProjects(currentCompany);
    }
  }, [fetchOrganizations, fetchProjects, currentCompany]);
  const isTasksRoute = location.pathname.includes('/tasks');
  const isOrganizationsRoute = location.pathname === '/organizations';

  const handleCompanyChange = (id: string) => {
    // Mantém o usuário no mesmo path relativo, apenas trocando o ID da empresa
    const pathSegments = location.pathname.split('/');
    // O primeiro segmento é vazio, o segundo é o company_id
    if (pathSegments.length > 1) {
      pathSegments[1] = id;
      navigate(pathSegments.join('/'));
    } else {
      navigate(`/${id}/resume`);
    }
  };

  const handleProjectChange = (id: string) => {
    navigate(`/${company_id}/${id}/tasks/boards`);
  };

  if (smartHeader === undefined) {
    smartHeader = true;
  }

  const showToolbar = !!children || !!toolbarOptions;

  return (
    <>
      {smartHeader ? (
        <div className='bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 dark:border-zinc-800 transition-colors'>
          <div className='h-14 w-full flex items-center justify-between px-4'>
            <div className='flex items-center gap-1 w-full'>
              <div>
                <span>Desk</span>
                <span className="text-lg font-bold">Report</span>
              </div>

              {!isOrganizationsRoute && (
                <>
                  <ChevronRight size={16} strokeWidth={2} className='text-zinc-400 mx-1' />
                  <Dropdown
                    options={organizations}
                    value={currentCompany || ''}
                    onChange={handleCompanyChange}
                  />
                  <ChevronRight size={16} strokeWidth={2} className='text-zinc-400 mx-1' />
                  <h1 className='items-center whitespace-nowrap font-semibold'>
                    {title || ''}
                  </h1>
                  {isTasksRoute && (
                    <>
                      <ChevronRight size={16} strokeWidth={2} className='text-zinc-400 mx-1' />
                      <Dropdown
                        options={projects}
                        value={project_id || 'deskreport'}
                        onChange={handleProjectChange}
                      />
                    </>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleChatSidebarMode}
                className={`p-1 rounded-lg transition-all ${chatSidebarMode === 'expanded'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-blue-500'
                  : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900'
                  }`}
                title={chatSidebarMode === 'expanded' ? "Colapsar Chat" : "Expandir Chat"}
              >
                {chatSidebarMode === 'expanded' ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {navigation.length > 0 && (
        <div className='bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 transition-colors'>
          <div className='flex items-center gap-1 w-full overflow-x-auto'>
            {navigation.map((subitem) => (
              <SubNavLink key={subitem.to} name={subitem.name} to={subitem.to} />
            ))}
          </div>
        </div>
      )}
      {showToolbar && (
        <Toolbar inputSearch={inputSearch} toolbarOptions={toolbarOptions}>
          {children}
        </Toolbar>
      )}
    </>
  );
}
