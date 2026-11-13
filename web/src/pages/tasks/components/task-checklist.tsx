import { useState } from 'react';
import { RichText } from '../../../components/ui/rich-text';
import { ChecklistItem, ChecklistItemStatus, ChecklistRole, TaskCardProps, TaskComment } from '../tasks-data';
import { agentProfile } from '../use-agents';
import { useTaskStore } from '../use-task-store';

const ROLE_GROUPS: { role: ChecklistRole; label: string }[] = [
  { role: 'engineering', label: 'Implementação' },
  { role: 'review', label: 'Revisão' },
  { role: 'qa', label: 'QA' },
  { role: 'devops', label: 'Deploy' },
];

const STATUS_LABELS: Record<ChecklistItemStatus, string> = {
  pending: 'Pendente',
  done: 'Feito',
  not_done: 'Não feito',
  na: 'Não se aplica',
  conflict: 'Em conflito com a spec',
};

const inputClass =
  'w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2.5 py-1.5 text-xs text-zinc-900 dark:text-zinc-100 outline-none focus:border-blue-500';
const selectClass =
  'rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 py-1 text-xs text-zinc-700 dark:text-zinc-300 outline-none focus:border-blue-500';

function formatDate(iso?: string | Date) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function ChecklistTab({ task }: { task: TaskCardProps }) {
  const { updateChecklist } = useTaskStore();
  const [newText, setNewText] = useState('');
  const [newRole, setNewRole] = useState<ChecklistRole>('engineering');
  const items = task.checklist?.items || [];

  async function handleAdd() {
    if (!newText.trim()) return;
    await updateChecklist(task.id, { addItem: { role: newRole, text: newText.trim() } });
    setNewText('');
  }

  return (
    <div className='space-y-5'>
      {ROLE_GROUPS.map(({ role, label }) => {
        const group = items.filter((item) => item.role === role);
        if (group.length === 0 && role === 'devops') return null;
        return (
          <div key={role} className='space-y-2'>
            <h4 className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>{label}</h4>
            {group.length === 0 && <p className='text-xs text-zinc-400'>Nenhum item.</p>}
            {group.map((item) => (
              <ChecklistRow key={item.id} taskId={task.id} item={item} />
            ))}
          </div>
        );
      })}

      <div className='flex items-center gap-2'>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder='Novo item'
          maxLength={500}
          className={inputClass}
        />
        <select value={newRole} onChange={(e) => setNewRole(e.target.value as ChecklistRole)} className={selectClass}>
          {ROLE_GROUPS.map(({ role, label }) => (
            <option key={role} value={role}>
              {label}
            </option>
          ))}
        </select>
        <button
          type='button'
          onClick={handleAdd}
          disabled={!newText.trim()}
          className='shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50'
        >
          Adicionar
        </button>
      </div>

      <div className='space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4'>
        <h4 className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>Além da spec</h4>
        {(task.checklist?.extraDeliveries || []).length === 0 && <p className='text-xs text-zinc-400'>Nada declarado fora do checklist.</p>}
        {(task.checklist?.extraDeliveries || []).map((entry) => (
          <div key={entry.id} className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 space-y-1'>
            <p className='text-xs text-zinc-900 dark:text-zinc-100'>{entry.text}</p>
            <p className='text-xs text-zinc-500'>Motivo: {entry.reason}</p>
            <p className='text-[10px] text-zinc-400'>
              {agentProfile(entry.agent).name} em {formatDate(entry.createdAt)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistRow({ taskId, item }: { taskId: string; item: ChecklistItem }) {
  const { updateChecklist } = useTaskStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.text);
  const [reason, setReason] = useState(item.reason || '');
  const needsReason = item.status === 'not_done' || item.status === 'conflict';

  async function handleStatus(status: ChecklistItemStatus) {
    const withReason = status === 'not_done' || status === 'conflict';
    const given = withReason ? reason.trim() || window.prompt('Informe o motivo') || '' : '';
    if (withReason && !given) return;
    await updateChecklist(taskId, { updateItem: { id: item.id, status, reason: withReason ? given : '' } });
  }

  async function handleText() {
    setEditing(false);
    if (text.trim() && text.trim() !== item.text) await updateChecklist(taskId, { updateItem: { id: item.id, text: text.trim() } });
    else setText(item.text);
  }

  const reasonClass = item.status === 'conflict' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400';
  return (
    <div className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 space-y-1.5'>
      <div className='flex items-start gap-2'>
        <div className='min-w-0 flex-1'>
          {editing ? (
            <input
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onBlur={handleText}
              onKeyDown={(e) => e.key === 'Enter' && handleText()}
              maxLength={500}
              className={inputClass}
            />
          ) : (
            <button type='button' onClick={() => setEditing(true)} className='text-left text-xs text-zinc-900 dark:text-zinc-100 hover:text-blue-600'>
              {item.text}
            </button>
          )}
        </div>
        <select value={item.status} onChange={(e) => handleStatus(e.target.value as ChecklistItemStatus)} className={selectClass}>
          {Object.entries(STATUS_LABELS).map(([status, label]) => (
            <option key={status} value={status}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {needsReason && !item.reason && <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder='Motivo' className={inputClass} />}
      {item.reason && <p className={`text-xs ${reasonClass}`}>{item.reason}</p>}
      {item.updatedBy && (
        <p className='text-[10px] text-zinc-400'>
          {item.updatedBy} {formatDate(item.updatedAt)}
        </p>
      )}
    </div>
  );
}

const FILE_BADGES: Record<string, { label: string; color: string }> = {
  novo: { label: 'Novo', color: 'text-emerald-600 dark:text-emerald-400' },
  removido: { label: 'Removido', color: 'text-red-600 dark:text-red-400' },
  modificado: { label: 'Modificado', color: 'text-amber-600 dark:text-amber-400' },
};

function fileEntry(line: string) {
  const trimmed = line.trim();
  const status = trimmed.slice(0, 2).trim();
  const kind = status === 'A' || status === '??' ? 'novo' : status === 'D' ? 'removido' : 'modificado';
  return { kind, path: trimmed.slice(2).trim() };
}

export function ChangelogTab({ comments }: { comments: TaskComment[] }) {
  const entries = comments.filter((comment) => comment.metadata?.changelog || comment.metadata?.touchedFiles?.length);
  const legacy = comments.filter((comment) => !entries.includes(comment) && comment.content.includes('Changelog de arquivos:'));

  if (entries.length === 0 && legacy.length === 0) {
    return (
      <p className='text-xs text-zinc-500 text-center py-6 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl'>
        Nenhuma alteração registrada nesta tarefa.
      </p>
    );
  }

  return (
    <div className='space-y-3'>
      {entries.map((comment) => {
        const profile = comment.metadata?.agent ? agentProfile(comment.metadata.agent) : null;
        return (
          <div key={comment.id} className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 space-y-2'>
            <div className='flex flex-wrap items-center gap-2 text-xs'>
              <span className='font-semibold text-zinc-900 dark:text-zinc-100'>{profile?.name || comment.user?.name}</span>
              {comment.metadata?.model && <span className='text-zinc-500'>{comment.metadata.model}</span>}
              {comment.metadata?.stage && (
                <span className='rounded bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:text-zinc-300'>
                  {comment.metadata.stage}
                </span>
              )}
              <span className='ml-auto text-zinc-400'>{formatDate(comment.createdAt)}</span>
            </div>
            {comment.metadata?.changelog && <p className='whitespace-pre-line text-xs text-zinc-700 dark:text-zinc-300'>{comment.metadata.changelog}</p>}
            {(comment.metadata?.touchedFiles || []).map((file) => {
              const { kind, path } = fileEntry(file);
              return (
                <p key={file} className='text-xs'>
                  <span className={`font-semibold ${FILE_BADGES[kind].color}`}>[{FILE_BADGES[kind].label}]</span>{' '}
                  <code className='text-zinc-700 dark:text-zinc-300'>{path}</code>
                </p>
              );
            })}
          </div>
        );
      })}
      {legacy.map((comment) => (
        <div key={comment.id} className='rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-3 space-y-1'>
          <p className='text-[10px] text-zinc-400'>{formatDate(comment.createdAt)}</p>
          <RichText content={comment.content} />
        </div>
      ))}
    </div>
  );
}
