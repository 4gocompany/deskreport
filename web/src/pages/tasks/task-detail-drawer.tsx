import {
  X,
  History,
  Users2,
  ChevronRight,
  MessageSquare,
  Plus,
  User,
  Target,
  Layers,
  Hash,
  Activity,
  Pencil,
  Bot,
  Tag,
  Square,
  Terminal,
} from 'lucide-react';
import { TaskCardProps, TaskStatus, PRIORITY_CONFIG, STATUS_CONFIG } from './tasks-data';
import { useState, useEffect } from 'react';
import { RichEditor } from '../../components/ui/rich-editor';
import { Button, Dialog } from '../../components/ui';
import { useTenantStore } from '../../store';
import { useTaskStore } from './use-task-store';
import { AGENT_LABELS, agentProfile, useAgentsStore } from './use-agents';
import { useParams } from 'react-router-dom';
import { useSession } from '../../lib/auth-client';
import { TaskTerminalDialog } from './components/task-terminal-dialog';
import { TokenMeter } from './components/token-meter';
import { TaskAttachments } from './components/task-attachments';

interface TaskDetailDrawerProps {
  task: TaskCardProps | null;
  isOpen: boolean;
  onClose: () => void;
  defaultProject?: string;
  defaultStatus?: TaskStatus;
}

function formatTimestamp(iso?: string) {
  if (!iso) return 'Agora';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function hasHtmlTags(text?: string) {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
}

export function TaskDetailDrawer({
  task,
  isOpen,
  onClose,
  defaultProject,
  defaultStatus,
}: TaskDetailDrawerProps) {
  const [displayTask, setDisplayTask] = useState<TaskCardProps | null>(null);
  const [comment, setComment] = useState('');
  const [commentAgent, setCommentAgent] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  const { updateTask, addTask, addComment, dispatchTask, stopTask } = useTaskStore();
  const { projects, teams, fetchTeams, members, fetchMembers } = useTenantStore();
  const { data: session } = useSession();
  const user = session?.user;

  const [isAddingAssignee, setIsAddingAssignee] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { company_id } = useParams();

  const enabledAgents = useAgentsStore((state) => state.agents);
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [isStopping, setIsStopping] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const taskAgent = useAgentsStore((state) =>
    state.agents.find((a) => a.state === 'working' && a.taskId === task?.id),
  );

  useEffect(() => {
    if (isOpen && company_id) {
      if (teams.length === 0) fetchTeams(company_id);
      if (members.length === 0) fetchMembers(company_id);
    }
  }, [isOpen, teams.length, members.length, company_id, fetchTeams, fetchMembers]);

  useEffect(() => {
    if (task) {
      const taskWithIds = {
        ...task,
        assigneeIds: task.assigneeIds || task.assignees?.map((a: any) => a.id) || [],
      };
      setDisplayTask(taskWithIds);
      setEditedTitle(task.title);
      setEditedDescription(task.description || '');
      setIsEditingTitle(false);
      setIsEditingDescription(false);
      setIsAddingTag(false);
      setNewTagLabel('');
    } else if (isOpen) {
      const sanitizedProject =
        defaultProject && defaultProject !== 'undefined' ? defaultProject : 'deskreport';
      const newTaskTemplate: TaskCardProps = {
        id: 'temp-' + Date.now(),
        title: '',
        project: sanitizedProject,
        status: defaultStatus || 'todo',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        assigneeIds: [],
        assignees: [],
        tags: [],
      };
      setDisplayTask(newTaskTemplate);
      setEditedTitle('');
      setEditedDescription('');
      setIsEditingTitle(true);
      setIsEditingDescription(false);
      setIsAddingTag(false);
      setNewTagLabel('');
    }
  }, [task, isOpen, defaultProject, defaultStatus]);

  const priority = displayTask ? PRIORITY_CONFIG[displayTask.priority] : null;
  const status = displayTask ? STATUS_CONFIG[displayTask.status] : null;
  const projectName =
    projects.find((p) => p.id === displayTask?.project)?.name || displayTask?.project;

  // O agente vem dos responsáveis e a pasta vem do projeto da tarefa
  const assignedAgents = (displayTask?.assigneeIds || [])
    .filter((id) => id.startsWith('agent-user-'))
    .map((id) => id.replace('agent-user-', ''));

  useEffect(() => {
    setDispatchError('');
    setIsTerminalOpen(false);
  }, [task?.id]);

  // Some quando a máquina avisa que o agente parou
  useEffect(() => {
    if (!taskAgent) setIsStopping(false);
  }, [taskAgent]);

  // Gasto salvo das execuções anteriores mais o da execução atual
  const tokensUsed = (displayTask?.tokensUsed || 0) + (taskAgent?.tokens || 0);

  async function handleDispatch(agent: string) {
    if (!task) return;
    setIsDispatching(true);
    setDispatchError('');
    const error = await dispatchTask(task.id, agent);
    if (error) {
      setDispatchError(error);
    } else if (displayTask && agent !== 'antigravity') {
      setDisplayTask({ ...displayTask, status: 'in-progress' });
    }
    setIsDispatching(false);
  }

  async function handleStop() {
    if (!task) return;
    setIsStopping(true);
    setDispatchError('');
    const error = await stopTask(task.id);
    if (error) {
      setDispatchError(error);
      setIsStopping(false);
    }
  }

  async function handleTitleSubmit() {
    if (displayTask && editedTitle.trim() && editedTitle !== displayTask.title) {
      if (task) {
        await updateTask(displayTask.id, { title: editedTitle.trim() });
      }
      setDisplayTask({ ...displayTask, title: editedTitle.trim() });
    }
    setIsEditingTitle(false);
  }

  async function handleDescriptionSubmit() {
    if (displayTask && editedDescription !== displayTask.description) {
      if (task) {
        await updateTask(displayTask.id, { description: editedDescription });
      }
      setDisplayTask({ ...displayTask, description: editedDescription });
    }
    setIsEditingDescription(false);
  }

  async function handlePropertyUpdate(key: keyof TaskCardProps, value: any) {
    if (!displayTask) return;

    const updatedTask = { ...displayTask, [key]: value };

    if (key === 'assigneeIds') {
      const newAssigneeIds = value as string[];
      updatedTask.assignees = members
        .filter((m) => newAssigneeIds.includes(m.user.id))
        .map((m) => ({ id: m.user.id, name: m.user.name, avatar: m.user.image || '' }));
    }

    setDisplayTask(updatedTask);

    if (task) {
      await updateTask(task.id, { [key]: value });
    }
  }

  function handleAddAssignee(userId: string) {
    if (!displayTask) return;
    const currentIds = displayTask.assigneeIds || [];
    if (currentIds.includes(userId)) {
      setIsAddingAssignee(false);
      return;
    }
    handlePropertyUpdate('assigneeIds', [...currentIds, userId]);
    setIsAddingAssignee(false);
  }

  function handleRemoveAssignee(userId: string) {
    if (!displayTask) return;
    const currentIds = displayTask.assigneeIds || [];
    handlePropertyUpdate(
      'assigneeIds',
      currentIds.filter((id) => id !== userId),
    );
  }

  function handleAddTag() {
    if (!displayTask) return;
    const label = newTagLabel.trim();
    if (!label) {
      setIsAddingTag(false);
      return;
    }
    const currentTags = displayTask.tags || [];
    if (!currentTags.some((t) => t.label.toLowerCase() === label.toLowerCase())) {
      const newTag = { label, color: 'bg-blue-500 text-blue-500' };
      handlePropertyUpdate('tags', [...currentTags, newTag]);
    }
    setNewTagLabel('');
    setIsAddingTag(false);
  }

  function handleRemoveTag(label: string) {
    if (!displayTask) return;
    const currentTags = displayTask.tags || [];
    handlePropertyUpdate(
      'tags',
      currentTags.filter((t) => t.label !== label),
    );
  }

  async function handleCreateTask() {
    if (!displayTask || !editedTitle.trim()) return;

    const payload = {
      title: editedTitle.trim(),
      description: editedDescription,
      project:
        displayTask.project && displayTask.project !== 'undefined'
          ? displayTask.project
          : 'deskreport',
      status: displayTask.status,
      priority: displayTask.priority,
      assigneeIds: displayTask.assigneeIds || [],
      teamId: displayTask.teamId,
      tags: displayTask.tags || [],
    };

    await addTask(payload);
    onClose();
  }

  async function handleAddComment() {
    if (!displayTask || !comment.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await addComment(displayTask.id, comment.trim(), commentAgent || undefined);
      setComment('');
      setCommentAgent('');
    } finally {
      setIsSubmittingComment(false);
    }
  }

  const selectClass =
    'h-8 w-44 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 outline-none focus:border-blue-500 transition-colors cursor-pointer';

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      maxWidth='5xl'
      hideHeader
      padded={false}
      scrollableBody={false}
    >
      {displayTask && status && priority && (
        <div className='flex flex-col h-[82vh] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans antialiased overflow-hidden'>
          {/* HEADER */}
          <div className='h-12 px-6 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 shrink-0'>
            <div className='flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
              <Layers size={14} className='text-zinc-400' />
              <span className='text-zinc-700 dark:text-zinc-300'>{projectName}</span>
              <ChevronRight size={13} className='text-zinc-400' />
              <Hash size={13} className='text-zinc-400' />
              <span className='font-semibold text-zinc-900 dark:text-zinc-100'>
                {task ? String(displayTask.shortId || 0).padStart(3, '0') : 'Nova tarefa'}
              </span>
            </div>

            <div className='flex items-center gap-2'>
              {!task && (
                <Button
                  size='sm'
                  onClick={handleCreateTask}
                  disabled={!editedTitle.trim()}
                >
                  Criar Tarefa
                </Button>
              )}
              <Button
                variant='ghost'
                size='icon'
                onClick={onClose}
                className='h-8 w-8 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          <div className='flex-1 flex overflow-hidden'>
            {/* COLUNA PRINCIPAL (ESQUERDA) */}
            <div className='flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6'>
              {/* TÍTULO */}
              <div>
                {isEditingTitle ? (
                  <input
                    autoFocus
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={handleTitleSubmit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTitleSubmit();
                      if (e.key === 'Escape') {
                        setEditedTitle(displayTask.title || '');
                        setIsEditingTitle(false);
                      }
                    }}
                    placeholder='Título da tarefa...'
                    className='w-full text-xl font-semibold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/60 border border-blue-500 rounded-lg px-3 py-1.5 outline-none'
                  />
                ) : (
                  <h1
                    onClick={() => setIsEditingTitle(true)}
                    className='text-xl font-semibold text-zinc-900 dark:text-zinc-100 cursor-text hover:bg-zinc-50 dark:hover:bg-zinc-800/40 rounded-lg px-2.5 py-1.5 -mx-2.5 transition-colors'
                  >
                    {displayTask.title || (
                      <span className='text-zinc-400 italic font-normal'>
                        Clique para dar um título...
                      </span>
                    )}
                  </h1>
                )}
              </div>

              {/* DESCRIÇÃO */}
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>
                    Descrição
                  </span>
                  {!isEditingDescription && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 gap-1.5'
                      onClick={() => setIsEditingDescription(true)}
                    >
                      <Pencil size={12} />
                      Editar
                    </Button>
                  )}
                </div>

                {isEditingDescription ? (
                  <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-3 space-y-3'>
                    <RichEditor
                      content={editedDescription}
                      onChange={setEditedDescription}
                      placeholder='Descreva o que deve ser feito...'
                      minHeight='180px'
                    />
                    <div className='flex justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => {
                          setEditedDescription(displayTask.description || '');
                          setIsEditingDescription(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button size='sm' onClick={handleDescriptionSubmit}>
                        Salvar descrição
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDescription(true)}
                    className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/30 p-4 min-h-[80px] cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors'
                  >
                    {displayTask.description ? (
                      hasHtmlTags(displayTask.description) ? (
                        <div
                          dangerouslySetInnerHTML={{ __html: displayTask.description }}
                          className='prose prose-sm dark:prose-invert max-w-none text-zinc-700 dark:text-zinc-300 leading-relaxed'
                        />
                      ) : (
                        <div className='text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed'>
                          {displayTask.description}
                        </div>
                      )
                    ) : (
                      <p className='text-sm text-zinc-400 italic'>
                        Nenhuma descrição informada. Clique para adicionar.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* ANEXOS */}
              {task && company_id && <TaskAttachments taskId={task.id} orgId={company_id} />}

              {/* COMENTÁRIOS */}
              <div className='space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-800'>
                <div className='flex items-center gap-2'>
                  <h3 className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>
                    Comentários
                  </h3>
                  {displayTask.comments && displayTask.comments.length > 0 && (
                    <span className='px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium'>
                      {displayTask.comments.length}
                    </span>
                  )}
                </div>

                {/* Caixa de Novo Comentário */}
                {task && (
                  <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 p-3 space-y-2.5'>
                    <textarea
                      rows={3}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                          e.preventDefault();
                          handleAddComment();
                        }
                      }}
                      placeholder='Escreva um comentário... (você também pode mencionar @claude, @antigravity, @opencode)'
                      className='w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-blue-500 resize-none'
                    />
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='flex items-center gap-2'>
                        <Bot size={14} className='text-zinc-400' />
                        <select
                          value={commentAgent}
                          onChange={(e) => setCommentAgent(e.target.value)}
                          className='h-8 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 outline-none focus:border-blue-500 cursor-pointer'
                        >
                          <option value=''>Apenas comentar (sem acionar agente)</option>
                          {enabledAgents.map(({ agent }) => {
                            const profile = agentProfile(agent);
                            return (
                              <option key={agent} value={agent}>
                                Comentar e acionar {profile.name} ({profile.role})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <Button
                        size='sm'
                        onClick={handleAddComment}
                        disabled={!comment.trim() || isSubmittingComment}
                      >
                        {isSubmittingComment ? 'Enviando...' : 'Comentar'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Lista de Comentários */}
                <div className='space-y-3'>
                  {displayTask.comments?.map((c) => (
                    <div
                      key={c.id}
                      className='flex gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60'
                    >
                      <div className='w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0'>
                        {c.user?.image ? (
                          <img src={c.user.image} alt={c.user.name} className='w-full h-full object-cover' />
                        ) : (
                          <User size={13} className='text-zinc-500' />
                        )}
                      </div>
                      <div className='flex-1 min-w-0 space-y-1'>
                        <div className='flex items-center justify-between gap-2'>
                          <span className='text-xs font-semibold text-zinc-900 dark:text-zinc-100'>
                            {c.user?.name || user?.name || 'Usuário'}
                          </span>
                          <span className='text-xs text-zinc-400'>
                            {formatTimestamp(c.createdAt)}
                          </span>
                        </div>
                        {hasHtmlTags(c.content) ? (
                          <div
                            className='text-sm text-zinc-700 dark:text-zinc-300 prose prose-sm dark:prose-invert max-w-none'
                            dangerouslySetInnerHTML={{ __html: c.content }}
                          />
                        ) : (
                          <div className='text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed'>
                            {c.content}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {(!displayTask.comments || displayTask.comments.length === 0) && (
                    <div className='text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl'>
                      <MessageSquare className='w-6 h-6 text-zinc-400 mx-auto mb-1.5 opacity-50' />
                      <p className='text-xs text-zinc-500'>Nenhum comentário nesta tarefa.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* COLUNA LATERAL DE PROPRIEDADES (DIREITA) */}
            <div className='w-80 shrink-0 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 p-5 overflow-y-auto custom-scrollbar space-y-5'>
              {/* Grade de Propriedades */}
              <div className='space-y-3'>
                <div className='flex items-center justify-between gap-2'>
                  <span className='flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
                    <History size={13} />
                    Status
                  </span>
                  <select
                    value={displayTask.status}
                    onChange={(e) => handlePropertyUpdate('status', e.target.value)}
                    className={selectClass}
                  >
                    {Object.entries(STATUS_CONFIG).map(([id, config]) => (
                      <option key={id} value={id}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='flex items-center justify-between gap-2'>
                  <span className='flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
                    <Activity size={13} />
                    Prioridade
                  </span>
                  <select
                    value={displayTask.priority}
                    onChange={(e) => handlePropertyUpdate('priority', e.target.value)}
                    className={selectClass}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([id, config]) => (
                      <option key={id} value={id}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className='flex items-center justify-between gap-2'>
                  <span className='flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
                    <Target size={13} />
                    Projeto
                  </span>
                  <select
                    value={displayTask.project}
                    onChange={(e) => handlePropertyUpdate('project', e.target.value)}
                    className={selectClass}
                  >
                    {projects
                      .filter((p) => p.id !== 'all')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className='flex items-center justify-between gap-2'>
                  <span className='flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
                    <Users2 size={13} />
                    Equipe
                  </span>
                  <select
                    value={displayTask.teamId || ''}
                    onChange={(e) => handlePropertyUpdate('teamId', e.target.value || null)}
                    className={selectClass}
                  >
                    <option value=''>Sem equipe</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className='h-px bg-zinc-200 dark:bg-zinc-800' />

              {/* Responsáveis */}
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>
                    Responsáveis
                  </span>
                  <div className='relative'>
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 gap-1'
                      onClick={() => setIsAddingAssignee(!isAddingAssignee)}
                    >
                      <Plus size={12} />
                      Adicionar
                    </Button>

                    {isAddingAssignee && (
                      <div className='absolute right-0 top-7 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden'>
                        <div className='p-1 max-h-48 overflow-y-auto custom-scrollbar'>
                          {members
                            .filter((m) => !(displayTask.assigneeIds || []).includes(m.user.id))
                            .map((m) => (
                              <div
                                key={m.user.id}
                                className='flex items-center gap-2 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer rounded-lg transition-colors'
                                onClick={() => handleAddAssignee(m.user.id)}
                              >
                                <img src={m.user.image} className='w-5 h-5 rounded-full' />
                                <span className='text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate'>
                                  {m.user.name}
                                </span>
                              </div>
                            ))}
                          {members.length === 0 && (
                            <div className='p-2 text-xs text-zinc-500 text-center'>
                              Nenhum membro disponível
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className='space-y-1.5'>
                  {(displayTask.assigneeIds || []).map((userId, i) => {
                    const member = members.find((m) => m.user.id === userId);
                    const name =
                      member?.user?.name || displayTask.assignees?.[i]?.name || 'Usuário';
                    const avatar =
                      member?.user?.image || displayTask.assignees?.[i]?.avatar || '';

                    return (
                      <div
                        key={userId}
                        className='flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                      >
                        <div className='flex items-center gap-2 min-w-0'>
                          {avatar ? (
                            <img src={avatar} className='w-5 h-5 rounded-full shrink-0' />
                          ) : (
                            <User size={13} className='text-zinc-400 shrink-0' />
                          )}
                          <span className='text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate'>
                            {name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRemoveAssignee(userId)}
                          className='text-zinc-400 hover:text-red-500 transition-colors p-0.5'
                          title='Remover responsável'
                        >
                          <X size={13} />
                        </button>
                      </div>
                    );
                  })}
                  {(!displayTask.assigneeIds || displayTask.assigneeIds.length === 0) && (
                    <div className='text-xs text-zinc-400'>Nenhum responsável atribuído</div>
                  )}
                </div>
              </div>

              <div className='h-px bg-zinc-200 dark:bg-zinc-800' />

              {/* Etiquetas */}
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <span className='flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400'>
                    <Tag size={12} />
                    Etiquetas
                  </span>
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-6 px-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 gap-1'
                    onClick={() => setIsAddingTag(!isAddingTag)}
                  >
                    <Plus size={12} />
                    Adicionar
                  </Button>
                </div>

                {isAddingTag && (
                  <div className='flex items-center gap-1.5'>
                    <input
                      autoFocus
                      value={newTagLabel}
                      onChange={(e) => setNewTagLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddTag();
                        if (e.key === 'Escape') {
                          setIsAddingTag(false);
                          setNewTagLabel('');
                        }
                      }}
                      placeholder='Nome da etiqueta...'
                      className='flex-1 h-7 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs outline-none focus:border-blue-500'
                    />
                    <Button size='sm' className='h-7 px-2.5 text-xs' onClick={handleAddTag}>
                      OK
                    </Button>
                  </div>
                )}

                <div className='flex flex-wrap gap-1.5'>
                  {displayTask.tags?.map((tag) => (
                    <span
                      key={tag.label}
                      className='inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    >
                      {tag.label}
                      <button
                        onClick={() => handleRemoveTag(tag.label)}
                        className='text-zinc-400 hover:text-red-500 transition-colors'
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                  {(!displayTask.tags || displayTask.tags.length === 0) && !isAddingTag && (
                    <span className='text-xs text-zinc-400'>Nenhuma etiqueta</span>
                  )}
                </div>
              </div>

              {/* Rodar tarefa com o agente responsável */}
              {task && (
                <>
                  <div className='h-px bg-zinc-200 dark:bg-zinc-800' />

                  <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 space-y-3'>
                    <div className='flex items-center gap-2'>
                      <Bot size={14} className='text-blue-500' />
                      <span className='text-xs font-semibold text-zinc-900 dark:text-zinc-100'>
                        Rodar tarefa
                      </span>
                    </div>

                    {assignedAgents.length === 0 && (
                      <div className='space-y-2'>
                        <p className='text-xs text-zinc-500'>
                          Atribua um agente nos responsáveis para rodar a tarefa na pasta do projeto.
                        </p>
                        <Button
                          size='sm'
                          variant='outline'
                          className='w-full'
                          onClick={() => setIsAddingAssignee(true)}
                        >
                          Escolher responsável
                        </Button>
                      </div>
                    )}

                    {taskAgent && (
                      <Button
                        size='sm'
                        variant='danger'
                        className='w-full'
                        onClick={handleStop}
                        disabled={isStopping}
                      >
                        <Square size={12} className='mr-1.5' />
                        {isStopping ? 'Parando...' : 'Parar Execução'}
                      </Button>
                    )}

                    {!taskAgent && assignedAgents.map((agent) => (
                      <Button
                        key={agent}
                        size='sm'
                        className='w-full'
                        onClick={() => handleDispatch(agent)}
                        disabled={isDispatching || !enabledAgents.some((a) => a.agent === agent)}
                      >
                        {isDispatching ? 'Enviando...' : `Rodar com ${agentProfile(agent).name}`}
                      </Button>
                    ))}

                    {taskAgent && (
                      <div className='flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-xs text-blue-700 dark:text-blue-300'>
                        <span className='w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0' />
                        <span className='font-semibold shrink-0'>
                          {AGENT_LABELS[taskAgent.agent] || taskAgent.agent}
                        </span>
                        <span className='truncate'>{taskAgent.action}</span>
                      </div>
                    )}

                    <Button
                      size='sm'
                      variant='outline'
                      className='w-full'
                      onClick={() => setIsTerminalOpen(true)}
                    >
                      <Terminal size={12} className='mr-1.5' />
                      Ver Terminal ao Vivo
                    </Button>

                    <TokenMeter used={tokensUsed} budget={displayTask.tokenBudget || 50000} />

                    {dispatchError && (
                      <div className='text-xs text-red-500'>{dispatchError}</div>
                    )}
                  </div>
                </>
              )}

              {/* Datas */}
              <div className='pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-1.5 text-xs text-zinc-500'>
                <div className='flex justify-between'>
                  <span>Criado em</span>
                  <span className='font-medium text-zinc-700 dark:text-zinc-300'>
                    {formatTimestamp(displayTask.createdAt)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span>Atualizado em</span>
                  <span className='font-medium text-zinc-700 dark:text-zinc-300'>
                    {formatTimestamp(displayTask.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {task && (
        <TaskTerminalDialog taskId={task.id} isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
      )}
    </Dialog>
  );
}
