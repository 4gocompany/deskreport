import { useEffect, useState } from 'react';
import { Plus, Briefcase, ArchiveRestore, Archive, Power, Settings2, MoreVertical, LayoutGrid, ListTodo, Users2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { authClient } from '../../lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { EditProjectModal } from './edit-project-modal';
import { useTenant } from '../../hooks/useTenant';
import { apiBase } from '../../api/fetcher';

export function ProjectsHub() {
  const [projects, setProjects] = useState<any[]>([]);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { company_id } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (company_id) {
      loadProjects();
    }
  }, [company_id]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const headers: any = {};
      if (company_id) headers['x-organization-id'] = company_id;

      const { data } = await authClient.$fetch<any[]>(`${apiBase}/projects`, {
        headers,
      });
      if (data) setProjects(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveToggle = async (project: any, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const newStatus = project.status === 'archived' ? 'active' : 'archived';

      const headers: any = {};
      if (company_id) headers['x-organization-id'] = company_id;

      await authClient.$fetch(`${apiBase}/projects/${project.id}`, {
        method: 'PUT',
        body: { status: newStatus },
        headers,
      });
      loadProjects();
    } catch (error) {
      console.error('Failed to update project status:', error);
    }
  };

  return (
    <div className='animate-slide-up pb-10'>
      {/* HEADER */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>Projetos</h2>
          <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>
            Gerencie todos os projetos dessa organização. Projetos englobam tarefas, kanbans e dashboards.
          </p>
        </div>
        <Button onClick={() => setIsCreating(true)} className='gap-2 shrink-0'>
          <Plus size={18} />
          Novo Projeto
        </Button>
      </div>

      <div className='space-y-3'>
        {loading ? (
          <div className='w-full flex justify-center py-20'>
            <div className='w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
          </div>
        ) : projects.length === 0 ? (
          <div className='text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl'>
            Nenhum projeto cadastrado nesta organização. Crie o primeiro!
          </div>
        ) : (
          <div className='space-y-3'>
            {projects.map((project) => (
              <div
                key={project.id}
                className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group'
              >
                <div className='flex items-center gap-4'>
                  {/* Icon Container */}
                  <div className='w-12 h-12 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'>
                    <Briefcase size={24} />
                  </div>

                  {/* Content */}
                  <div>
                    <h3 className='font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                      {project.name}
                      {project.status === 'archived' && (
                        <span className='text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400'>Arquivado</span>
                      )}
                    </h3>

                    <div className='flex items-center gap-4 mt-1'>
                      <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                        <LayoutGrid size={14} />
                        Status: <span className='capitalize'>{project.status === 'archived' ? 'Arquivado' : 'Ativo'}</span>
                      </div>
                      <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                        <Users2 size={14} />
                        Equipes: {project.teams?.length || 0}
                      </div>
                      <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                        <ListTodo size={14} />
                        Progresso: {project.completion_percentage || 0}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className='flex items-center gap-1.5'>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={() => navigate(`/${company_id}/${project.id}/tasks`)}
                    className='text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    title='Gerenciar Tarefas'
                  >
                    <Power size={18} />
                  </Button>
                  <Button size='icon' variant='ghost' onClick={() => setEditingProject(project)} title='Editar Projeto'>
                    <Settings2 size={18} />
                  </Button>
                  <Button
                    size='icon'
                    variant='ghost'
                    onClick={(e) => handleArchiveToggle(project, e)}
                    className={project.status === 'archived' ? 'text-emerald-600' : 'text-zinc-400'}
                    title={project.status === 'archived' ? 'Restaurar' : 'Arquivar'}
                  >
                    {project.status === 'archived' ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                  </Button>
                  <Button size='icon' variant='ghost'>
                    <MoreVertical size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(isCreating || editingProject) && (
        <EditProjectModal
          project={editingProject}
          onClose={() => {
            setIsCreating(false);
            setEditingProject(null);
          }}
          onSuccess={() => {
            setIsCreating(false);
            setEditingProject(null);
            loadProjects();
          }}
        />
      )}
    </div>
  );
}
