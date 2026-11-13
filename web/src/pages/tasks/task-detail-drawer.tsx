import {
  X,
  History,
  Users2,
  ChevronRight,
  ChevronDown,
  Check,
  FolderDot,
  MessageSquare,
  Plus,
  User,
  Layers,
  Hash,
  Activity,
  Pencil,
  Bot,
  Tag,
  Square,
  Terminal,
  MessageCircleQuestion,
  CalendarDays,
} from 'lucide-react';
import { checklistProgress, TaskCardProps, TaskComment, TaskStatus, TaskType, PRIORITY_CONFIG, STATUS_CONFIG, TASK_TYPE_CONFIG, waitingQuestions } from './tasks-data';
import { useState, useEffect, useMemo, useRef } from 'react';
import { RichEditor } from '../../components/ui/rich-editor';
import { RichText, toEditorHtml } from '../../components/ui/rich-text';
import { Button, Dialog } from '../../components/ui';
import { useTenantStore } from '../../store';
import { useMachines } from '../../hooks/useMachines';
import { useTaskStore } from './use-task-store';
import { agentProfile, useAgentsStore, withAgentProfile } from './use-agents';
import { useParams } from 'react-router-dom';
import { useSession } from '../../lib/auth-client';
import { activeStep, taskSteps } from './task-pipeline';
import { TaskTerminalDialog } from './components/task-terminal-dialog';
import { OptionList } from './components/option-list';
import { dateDay } from '../resume/use-inbox';
import { TokenMeter } from './components/token-meter';
import { UserAvatar } from './components/user-avatar';
import { TaskAttachments } from './components/task-attachments';
import { ChangelogTab, ChecklistTab } from './components/task-checklist';

interface TaskDetailDrawerProps {
  task: TaskCardProps | null;
  isOpen: boolean;
  onClose: () => void;
  defaultProject?: string;
  defaultStatus?: TaskStatus;
}

function newestFirst(comments: TaskComment[]) {
  return comments.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function formatTimestamp(iso?: string | Date) {
  if (!iso) return 'Agora';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function modelTagClass(model?: string) {
  const value = (model || '').toLowerCase();
  if (/claude|anthropic|sonnet|opus|haiku/.test(value)) return 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300';
  if (/gpt|openai|o1|o3|o4/.test(value)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  if (/gemini|google/.test(value)) return 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';
  return 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300';
}

function commentTrace(comment: TaskComment) {
  const agent = comment.metadata?.agent || (comment.user?.id?.startsWith('agent-user-') ? comment.user.id.replace('agent-user-', '') : '');
  if (!agent) return null;
  const profile = agentProfile(agent);
  const harness = profile.label || profile.name;
  const name = profile.nickname ? `${profile.nickname} - ${harness}` : harness;
  return { name, model: comment.metadata?.model || '' };
}

interface ParsedProject {
  id: string;
  name: string;
  folder?: string;
  workspace: string;
  scope: string;
  isRoot: boolean;
  displayLabel: string;
  breadcrumbLabel: string;
  scopeLabel: string;
}

function parseProjectHierarchy(p: { id: string; name: string; folder?: string }): ParsedProject {
  if (p.name.includes(' / ')) {
    const parts = p.name.split(' / ');
    const ws = parts[0].trim();
    const ch = parts.slice(1).join(' / ').trim();
    const isRoot = ch.toLowerCase() === 'raiz' || ch.toLowerCase() === 'root';
    return {
      id: p.id,
      name: p.name,
      folder: p.folder,
      workspace: ws,
      scope: ch,
      isRoot,
      displayLabel: isRoot ? `${ws} (raiz)` : `${ws} / ${ch}`,
      breadcrumbLabel: isRoot ? ws : `${ws} / ${ch}`,
      scopeLabel: isRoot ? `${ws} (todo o repo)` : ch,
    };
  }
  if (p.name.includes('/')) {
    const parts = p.name.split('/');
    const ws = parts[0].trim();
    const ch = parts.slice(1).join('/').trim();
    const isRoot = ch.toLowerCase() === 'raiz' || ch.toLowerCase() === 'root';
    return {
      id: p.id,
      name: p.name,
      folder: p.folder,
      workspace: ws,
      scope: ch,
      isRoot,
      displayLabel: isRoot ? `${ws} (raiz)` : `${ws} / ${ch}`,
      breadcrumbLabel: isRoot ? ws : `${ws} / ${ch}`,
      scopeLabel: isRoot ? `${ws} (todo o repo)` : ch,
    };
  }
  return {
    id: p.id,
    name: p.name,
    folder: p.folder,
    workspace: '4go-company',
    scope: p.name,
    isRoot: false,
    displayLabel: p.name,
    breadcrumbLabel: p.name,
    scopeLabel: p.name,
  };
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
  const [drawerTab, setDrawerTab] = useState<'comments' | 'checklist' | 'changelog'>('comments');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState('');

  const [isSignalOpen, setIsSignalOpen] = useState(false);
  const [signalHeader, setSignalHeader] = useState('');
  const [signalQuestion, setSignalQuestion] = useState('');
  const [signalOptions, setSignalOptions] = useState('');
  const [signalMulti, setSignalMulti] = useState(false);

  const { updateTask, addTask, addComment, askPo, dispatchTask, stopTask } = useTaskStore();
  const { projects, teams, fetchTeams, members, fetchMembers } = useTenantStore();
  const { data: session } = useSession();
  const user = session?.user;

  const parsedProjects = useMemo(() => {
    return projects
      .filter((p) => p.id !== 'all')
      .map((p) => parseProjectHierarchy(p));
  }, [projects]);

  const groupedProjects = useMemo(() => {
    const map: Record<string, ParsedProject[]> = {};
    for (const p of parsedProjects) {
      if (!map[p.workspace]) map[p.workspace] = [];
      map[p.workspace].push(p);
    }
    return Object.entries(map).map(([workspace, items]) => ({
      workspace,
      items,
    }));
  }, [parsedProjects]);

  const currentProject = parsedProjects.find(
    (p) => p.id === displayTask?.project || p.name === displayTask?.project
  );

  const [isProjectPickerOpen, setIsProjectPickerOpen] = useState(false);
  const projectPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (projectPickerRef.current && !projectPickerRef.current.contains(e.target as Node)) {
        setIsProjectPickerOpen(false);
      }
    }
    if (isProjectPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProjectPickerOpen]);

  const [isAddingAssignee, setIsAddingAssignee] = useState(false);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { company_id } = useParams();

  const enabledAgents = useAgentsStore((state) => state.agents);
  // Apelidos e avatares chegam pelo socket e redesenham comentários e responsáveis
  useAgentsStore((state) => state.profiles);
  const [machineId, setMachineId] = useState('');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState('');
  const [isStopping, setIsStopping] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const taskAgent = useAgentsStore((state) =>
    state.agents.find((a) => a.state === 'working' && a.taskId === task?.id),
  );
  const steps = taskSteps();
  const currentStep = activeStep(displayTask || task || { status: 'todo' }, taskAgent);

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
      setEditedDescription(toEditorHtml(task.description || ''));
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
        type: 'feature',
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
  const projectName = currentProject
    ? currentProject.breadcrumbLabel
    : (projects.find((p) => p.id === displayTask?.project)?.name || displayTask?.project || 'Geral');

  // O agente vem dos responsáveis e a pasta vem do projeto da tarefa
  const assignedAgents = (displayTask?.assigneeIds || [])
    .filter((id) => id.startsWith('agent-user-'))
    .map((id) => id.replace('agent-user-', ''));

  useEffect(() => {
    setDispatchError('');
    setIsTerminalOpen(false);
    setMachineId('');
  }, [task?.id]);

  // Máquinas onde o projeto existe. Sem escolha, a tarefa roda na máquina padrão do projeto
  const machines = useMachines(company_id);
  const rawProject = projects.find((p) => p.id === displayTask?.project || p.name === displayTask?.project);
  const projectMachines = machines.filter((machine) => rawProject?.locations?.some((item) => item.machineId === machine.id));
  const targetMachine = machines.find((machine) => machine.id === (machineId || rawProject?.defaultMachineId || projectMachines[0]?.id));

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
    const error = await dispatchTask(task.id, agent, machineId);
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
        .map((m) => ({ id: m.user.id, name: m.user.name, image: m.user.image }));
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
      type: displayTask.type || 'feature',
      assigneeIds: displayTask.assigneeIds || [],
      teamId: displayTask.teamId,
      tags: displayTask.tags || [],
    };

    await addTask(payload);
    onClose();
  }

  // A resposta vira comentário e chama de volta o agente que perguntou
  async function handleAnswer(answers: string[]) {
    if (!displayTask?.waitingFor || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await addComment(displayTask.id, answers.join('\n'), displayTask.waitingFor.agent, answers);
    } finally {
      setIsSubmittingComment(false);
    }
  }

  async function handleSignalPo() {
    if (!displayTask || !signalQuestion.trim()) return;

    // Cada linha é "Rótulo: consequência" ou só "Rótulo". De 2 a 4 linhas vão com consequência, as demais só com o rótulo
    const lines = signalOptions.split('\n').map((line) => line.trim()).filter(Boolean);
    const options = lines.map((line) => {
      const [label, ...rest] = line.split(':');
      const description = rest.join(':').trim();
      return lines.length >= 2 && lines.length <= 4 ? { label: label.trim(), description: description || undefined } : label.trim();
    });
    await askPo(displayTask.id, { header: signalHeader.trim() || undefined, question: signalQuestion.trim(), options, multiSelect: signalMulti });
    setSignalHeader('');
    setSignalQuestion('');
    setSignalOptions('');
    setSignalMulti(false);
    setIsSignalOpen(false);
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

  const progress = checklistProgress(displayTask?.checklist);
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
        <div className='flex flex-col h-[82vh] max-h-[calc(100vh-200px)] bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-sans antialiased overflow-hidden'>
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
                <div className='flex flex-wrap gap-1.5 mt-3'>
                  {(Object.entries(TASK_TYPE_CONFIG) as [TaskType, (typeof TASK_TYPE_CONFIG)[TaskType]][]).map(([id, config]) => {
                    const Icon = config.icon;
                    const active = (displayTask.type || 'feature') === id;
                    return (
                      <button
                        key={id}
                        type='button'
                        onClick={() => handlePropertyUpdate('type', id)}
                        className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg border text-xs font-medium transition-colors ${
                          active
                            ? 'border-zinc-300 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100'
                            : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        <Icon size={13} className={config.color} />
                        {config.label}
                      </button>
                    );
                  })}
                </div>
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
                          setEditedDescription(toEditorHtml(displayTask.description || ''));
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
                    {displayTask.specEditedBy && displayTask.specEditedAt && (
                      <p className='text-xs text-zinc-400 mb-2'>
                        Spec editada por {agentProfile(displayTask.specEditedBy).name} em{' '}
                        {formatTimestamp(displayTask.specEditedAt)}
                      </p>
                    )}
                    {displayTask.description ? (
                      <RichText content={displayTask.description} />
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
                <div className='flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800'>
                  {([['comments', 'Comentário', displayTask.comments?.length || 0], ['checklist', 'Checklist', `${progress.done}/${progress.total}`], ['changelog', 'Changelog', 0]] as const).map(([id, label, count]) => (
                    <button
                      key={id}
                      type='button'
                      onClick={() => setDrawerTab(id)}
                      className={`-mb-px flex items-center gap-2 border-b-2 pb-2 text-xs font-semibold ${drawerTab === id ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-zinc-500 dark:text-zinc-400'}`}
                    >
                      {label}
                      {!!count && count !== '0/0' && (
                        <span className='px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium'>{count}</span>
                      )}
                    </button>
                  ))}
                </div>

                {drawerTab === 'checklist' && <ChecklistTab task={displayTask} />}
                {drawerTab === 'changelog' && <ChangelogTab comments={newestFirst(displayTask.comments || [])} />}
                {drawerTab === 'comments' && (
                  <>
                {displayTask.checklist?.haltedReason && (
                  <div className='rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300'>
                    A esteira parou: {displayTask.checklist.haltedReason} Revise o checklist e acione o agente de novo.
                  </div>
                )}

                {/* Pergunta aberta pelo agente ou pela equipe */}
                {task && displayTask.waitingFor && (
                  <div className='rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3.5 space-y-2.5'>
                    <div className='flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300'>
                      <MessageCircleQuestion size={14} />
                      {displayTask.waitingFor.authorId && displayTask.waitingFor.authorId === user?.id
                        ? 'Você sinalizou o PO e aguarda a resposta'
                        : `${displayTask.waitingFor.agent ? agentProfile(displayTask.waitingFor.agent).name : displayTask.waitingFor.authorName || 'A equipe'} está aguardando você`}
                    </div>
                    <OptionList
                      key={displayTask.waitingFor.createdAt}
                      questions={waitingQuestions(displayTask.waitingFor)}
                      recommended={!!displayTask.waitingFor.agent}
                      disabled={isSubmittingComment}
                      onConfirm={handleAnswer}
                    />
                    <p className='text-xs text-zinc-500'>
                      Ou responda com texto abaixo{displayTask.waitingFor.agent ? ` acionando ${agentProfile(displayTask.waitingFor.agent).name}` : ''}.
                    </p>
                  </div>
                )}

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
                      <div className='flex items-center gap-2'>
                        <Button size='sm' variant='ghost' onClick={() => setIsSignalOpen(!isSignalOpen)}>
                          Sinalizar PO
                        </Button>
                        <Button
                          size='sm'
                          onClick={handleAddComment}
                          disabled={!comment.trim() || isSubmittingComment}
                        >
                          {isSubmittingComment ? 'Enviando...' : 'Comentar'}
                        </Button>
                      </div>
                    </div>
                    {isSignalOpen && (
                      <div className='space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-2.5'>
                        <input
                          value={signalHeader}
                          maxLength={40}
                          onChange={(e) => setSignalHeader(e.target.value)}
                          placeholder='Título curto (opcional)'
                          className='w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-blue-500'
                        />
                        <input
                          value={signalQuestion}
                          onChange={(e) => setSignalQuestion(e.target.value)}
                          placeholder='Dúvida ou decisão para o Product Owner'
                          className='w-full h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-blue-500'
                        />
                        <textarea
                          rows={2}
                          value={signalOptions}
                          onChange={(e) => setSignalOptions(e.target.value)}
                          placeholder='Opções, uma por linha: Rótulo: consequência (opcional)'
                          className='w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-sm text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400 outline-none focus:border-blue-500 resize-none'
                        />
                        <div className='flex items-center justify-between gap-2'>
                          <label className='flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer'>
                            <input type='checkbox' checked={signalMulti} onChange={(e) => setSignalMulti(e.target.checked)} />
                            Permitir múltipla seleção
                          </label>
                          <Button size='sm' onClick={handleSignalPo} disabled={!signalQuestion.trim()}>
                            Sinalizar
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Lista de Comentários */}
                <div className='space-y-3'>
                  {newestFirst(displayTask.comments || []).map((c) => {
                    const renderedUser = c.user && withAgentProfile(c.user);
                    const trace = commentTrace(c);
                    return { ...c, user: renderedUser, trace };
                  }).map((c) => (
                    <div
                      key={c.id}
                      className='flex gap-3 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60'
                    >
                      <div className='w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center border border-zinc-200 dark:border-zinc-700 overflow-hidden shrink-0'>
                        {c.user ? <UserAvatar user={c.user} className='w-full h-full' /> : <User size={13} className='text-zinc-500' />}
                      </div>
                      <div className='flex-1 min-w-0 space-y-1'>
                        <div className='flex items-center justify-between gap-2'>
                          <div className='flex min-w-0 items-center gap-2'>
                            <span className='truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100'>
                              {c.trace?.name || c.user?.name || user?.name || 'Usuário'}
                            </span>
                            {c.trace?.model && (
                              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${modelTagClass(c.trace.model)}`}>
                                {c.trace.model}
                              </span>
                            )}
                            {c.metadata?.poAnswer && (
                              <span className='shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'>
                                {c.metadata.poAnswer.answeredBy === 'agent' ? `Respondido pelo Agente PO${c.metadata.poAnswer.source ? ` (${c.metadata.poAnswer.source})` : ''}` : 'Decisão do PO'}
                              </span>
                            )}
                          </div>
                          <span className='shrink-0 text-xs text-zinc-400'>
                            {formatTimestamp(c.createdAt)}
                          </span>
                        </div>
                        <RichText content={c.content} />
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
                  </>
                )}
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
                      <option
                        key={id}
                        value={id}
                        disabled={id === 'release' && !!displayTask.waitingFor}
                      >
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

                {/* Projeto */}
                <div className='relative flex items-center justify-between gap-2' ref={projectPickerRef}>
                  <span className='flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
                    <FolderDot size={13} />
                    Projeto
                  </span>
                  <button
                    type='button'
                    onClick={() => setIsProjectPickerOpen((v) => !v)}
                    className='h-8 w-44 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 flex items-center justify-between gap-1.5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors text-left'
                  >
                    <span className='truncate'>
                      {currentProject ? currentProject.displayLabel : 'Selecionar'}
                    </span>
                    <ChevronDown size={12} className='text-zinc-400 shrink-0' />
                  </button>

                  {isProjectPickerOpen && (
                    <div className='absolute right-0 top-9 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95'>
                      <div className='max-h-60 overflow-y-auto custom-scrollbar space-y-2'>
                        {groupedProjects.map((group) => (
                          <div key={group.workspace} className='space-y-0.5'>
                            <div className='flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500'>
                              <Layers size={10} />
                              {group.workspace}
                            </div>
                            {group.items.map((p) => {
                              const isSelected = p.id === displayTask.project || p.name === displayTask.project;
                              return (
                                <button
                                  key={p.id}
                                  type='button'
                                  onClick={() => {
                                    handlePropertyUpdate('project', p.id);
                                    setIsProjectPickerOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                                    isSelected
                                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300 font-medium'
                                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                  }`}
                                >
                                  <div className='flex items-center gap-2 truncate'>
                                    <FolderDot size={12} className={isSelected ? 'text-blue-500' : 'text-zinc-400'} />
                                    <span className='truncate'>{p.scopeLabel}</span>
                                  </div>
                                  {isSelected && <Check size={12} className='text-blue-500 shrink-0 ml-1' />}
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

                <div className='flex items-center justify-between gap-2'>
                  <span className='flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400'>
                    <CalendarDays size={13} />
                    Prazo
                  </span>
                  <input
                    type='date'
                    value={displayTask.dueDate ? dateDay(displayTask.dueDate) : ''}
                    onChange={(e) => handlePropertyUpdate('dueDate', e.target.value || null)}
                    className={selectClass}
                  />
                </div>
              </div>

              <div className='h-px bg-zinc-200 dark:bg-zinc-800' />

              <div className='space-y-2.5'>
                <span className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>Etapas</span>
                <div className='space-y-1.5'>
                  {steps.map((step, index) => {
                    const done = index < currentStep;
                    const active = index === currentStep;
                    return (
                      <div key={step} className='flex items-center gap-2.5'>
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${
                            active ? 'bg-blue-500' : done ? 'bg-blue-400' : 'bg-zinc-300 dark:bg-zinc-700'
                          }`}
                        />
                        <span
                          className={`text-xs ${
                            active
                              ? 'font-semibold text-blue-600 dark:text-blue-400'
                              : done
                                ? 'text-zinc-700 dark:text-zinc-300'
                                : 'text-zinc-400 dark:text-zinc-500'
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
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
                                <UserAvatar user={m.user} className='w-5 h-5 rounded-full' />
                                <span className='text-xs font-medium text-zinc-700 dark:text-zinc-200 truncate'>
                                  {withAgentProfile(m.user).name}
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
                    const memberUser = member?.user && withAgentProfile(member.user);
                    const name =
                      memberUser?.name || displayTask.assignees?.[i]?.name || 'Usuário';

                    return (
                      <div
                        key={userId}
                        className='flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900'
                      >
                        <div className='flex items-center gap-2 min-w-0'>
                          <UserAvatar user={memberUser || displayTask.assignees?.[i] || { name }} className='w-5 h-5 rounded-full shrink-0' />
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

                    {!taskAgent && projectMachines.length > 0 && (
                      <select
                        value={machineId}
                        onChange={(e) => setMachineId(e.target.value)}
                        className='w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 font-medium'
                      >
                        <option value=''>Máquina padrão do projeto</option>
                        {projectMachines.map((machine) => (
                          <option key={machine.id} value={machine.id}>
                            {machine.name} ({machine.online ? 'Online' : 'Offline'}){machine.id === rawProject?.defaultMachineId ? ' - padrão' : ''}
                          </option>
                        ))}
                      </select>
                    )}

                    {!taskAgent && targetMachine && !targetMachine.online && (
                      <p className='text-xs text-amber-600 dark:text-amber-400'>
                        Máquina {targetMachine.name} está offline. A tarefa aguarda conexão ou troque a máquina acima.
                      </p>
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
                          {agentProfile(taskAgent.agent).name}
                        </span>
                        <span className='truncate'>{taskAgent.action}</span>
                        {taskAgent.model && (
                          <span className='ml-auto shrink-0 rounded bg-zinc-200/80 dark:bg-zinc-700/80 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-300'>
                            {taskAgent.model}
                          </span>
                        )}
                      </div>
                    )}

                    <Button
                      size='sm'
                      variant='outline'
                      className='w-full'
                      onClick={() => setIsTerminalOpen(true)}
                    >
                      <Terminal size={12} className='mr-1.5' />
                      Ver Logs e Git diff
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
