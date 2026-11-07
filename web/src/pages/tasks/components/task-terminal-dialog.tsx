import { useEffect, useRef, useState } from 'react';
import { Copy, Check, FileDiff, Terminal } from 'lucide-react';
import { Button, Dialog } from '../../../components/ui';
import { useAgentsStore } from '../use-agents';
import { useTaskStore } from '../use-task-store';

type TaskTerminalDialogProps = {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
};

// Terminal somente leitura com o stdout/stderr do agente que roda a tarefa
export function TaskTerminalDialog({ taskId, isOpen, onClose }: TaskTerminalDialogProps) {
  const output = useAgentsStore((state) => state.taskOutputs[taskId] || '');
  const fetchTerminal = useTaskStore((state) => state.fetchTerminal);
  const fetchTaskDiff = useTaskStore((state) => state.fetchTaskDiff);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'diff'>('logs');
  const [diff, setDiff] = useState('');
  const [diffError, setDiffError] = useState('');
  const [diffLoading, setDiffLoading] = useState(false);
  const screenRef = useRef<HTMLPreElement>(null);

  // Ao abrir, busca o que o agente já escreveu. O resto chega pelo socket
  useEffect(() => {
    if (!isOpen) return;
    fetchTerminal(taskId).then((text) => useAgentsStore.getState().setTaskOutput(taskId, text));
  }, [isOpen, taskId, fetchTerminal]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'diff') return;
    setDiffLoading(true);
    setDiffError('');
    fetchTaskDiff(taskId)
      .then(setDiff)
      .catch(() => setDiffError('Não foi possível carregar o diff desta tarefa.'))
      .finally(() => setDiffLoading(false));
  }, [isOpen, activeTab, taskId, fetchTaskDiff]);

  useEffect(() => {
    const screen = screenRef.current;
    if (screen) screen.scrollTop = screen.scrollHeight;
  }, [output, isOpen]);

  const content = activeTab === 'logs' ? output : diff;

  async function handleCopy() {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title='Logs e Git diff' maxWidth='4xl' padded={false}>
      <div className='flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800'>
        <div className='flex gap-1'>
          <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs ${activeTab === 'logs' ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold' : 'text-zinc-500'}`}><Terminal size={13} /> Logs ao vivo</button>
          <button onClick={() => setActiveTab('diff')} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs ${activeTab === 'diff' ? 'bg-zinc-100 dark:bg-zinc-800 font-semibold' : 'text-zinc-500'}`}><FileDiff size={13} /> Git diff</button>
        </div>
        <Button size='sm' variant='outline' onClick={handleCopy} disabled={!content}>
          {copied ? <Check size={12} className='mr-1.5' /> : <Copy size={12} className='mr-1.5' />}
          {copied ? 'Copiado' : `Copiar ${activeTab === 'logs' ? 'logs' : 'diff'}`}
        </Button>
      </div>
      <pre
        ref={screenRef}
        className='h-[60vh] overflow-y-auto custom-scrollbar bg-zinc-950 text-zinc-200 p-4 font-mono text-xs whitespace-pre-wrap break-all'
      >
        {activeTab === 'logs'
          ? output || 'Nenhuma saída do agente ainda.'
          : diffLoading ? 'Carregando diff…' : diffError || diff || 'Nenhum diff disponível para esta tarefa.'}
      </pre>
    </Dialog>
  );
}
