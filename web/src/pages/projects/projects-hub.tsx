import { useEffect, useState } from 'react';
import { Plus, Pencil, ArchiveRestore, Archive, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { authClient } from '../../lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { EditProjectModal } from './edit-project-modal';
import { useTenant } from '../../hooks/useTenant';
import { apiBase } from '../../api/fetcher';
import { List, ListAction, ListActions, ListRow } from '../../components/ui/list';
import { alertDialog, confirmDialog } from '../../components/ui/confirm-dialog';

const projectColumns = '1fr 96px 160px 96px';

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

  const handleArchiveToggle = async (project: any) => {
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

  async function handleDelete(project: any) {
    const ok = await confirmDialog(`Excluir o projeto ${project.name} e todas as tarefas dele? Esta ação não pode ser desfeita.`, {
      confirmLabel: 'Excluir',
      danger: true,
    });
    if (!ok) return;
    const { error } = await authClient.$fetch(`${apiBase}/projects/${project.id}`, {
      method: 'DELETE',
      headers: { 'x-organization-id': company_id || '' },
    });
    if (error) alertDialog('Não foi possível excluir o projeto.');
    loadProjects();
  }

  return (
    <div className='animate-slide-up pb-10'>
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

      <div>
        {loading ? (
          <div className='w-full flex justify-center py-20'>
            <div className='w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
          </div>
        ) : projects.length === 0 ? (
          <div className='text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl'>
            Nenhum projeto cadastrado nesta organização. Crie o primeiro!
          </div>
        ) : (
          <List columns={projectColumns} headers={['Nome', 'Equipes', 'Progresso', '']}>
            {projects.map((project) => (
              <ListRow key={project.id} columns={projectColumns} onClick={() => navigate(`/${company_id}/${project.id}/tasks`)}>
                <div className='flex items-center gap-2.5 min-w-0'>
                  <span className={`w-2 h-2 rounded-full shrink-0 ${project.status === 'archived' ? 'bg-zinc-400' : 'bg-blue-500'}`} />
                  <span className='text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate'>{project.name}</span>
                  {project.status === 'archived' && <span className='text-xs text-zinc-400'>Arquivado</span>}
                </div>
                <span className='text-sm text-zinc-500'>{project.teams?.length || 0}</span>
                <div className='flex items-center gap-2'>
                  <div className='w-20 h-1 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden'>
                    <div className='h-full bg-blue-500' style={{ width: `${project.completion_percentage || 0}%` }} />
                  </div>
                  <span className='text-xs text-zinc-500'>{project.completion_percentage || 0}%</span>
                </div>
                <ListActions>
                  <ListAction title='Editar projeto' onClick={() => setEditingProject(project)}>
                    <Pencil size={14} />
                  </ListAction>
                  <ListAction title={project.status === 'archived' ? 'Restaurar' : 'Arquivar'} onClick={() => handleArchiveToggle(project)}>
                    {project.status === 'archived' ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  </ListAction>
                  <ListAction title='Excluir' danger onClick={() => handleDelete(project)}>
                    <Trash2 size={14} />
                  </ListAction>
                </ListActions>
              </ListRow>
            ))}
          </List>
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
