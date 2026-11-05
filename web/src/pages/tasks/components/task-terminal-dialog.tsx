import { useEffect, useRef, useState } from 'react';
import { Copy, Check } from 'lucide-react';
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
  const [copied, setCopied] = useState(false);
  const screenRef = useRef<HTMLPreElement>(null);

  // Ao abrir, busca o que o agente já escreveu. O resto chega pelo socket
  useEffect(() => {
    if (!isOpen) return;
    fetchTerminal(taskId).then((text) => useAgentsStore.getState().setTaskOutput(taskId, text));
  }, [isOpen, taskId, fetchTerminal]);

  useEffect(() => {
    const screen = screenRef.current;
    if (screen) screen.scrollTop = screen.scrollHeight;
  }, [output, isOpen]);

  async function handleCopy() {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title='Terminal ao vivo' maxWidth='4xl' padded={false}>
      <div className='flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800'>
        <span className='text-xs text-zinc-500'>Somente leitura</span>
        <Button size='sm' variant='outline' onClick={handleCopy} disabled={!output}>
          {copied ? <Check size={12} className='mr-1.5' /> : <Copy size={12} className='mr-1.5' />}
          {copied ? 'Copiado' : 'Copiar logs'}
        </Button>
      </div>
      <pre
        ref={screenRef}
        className='h-[60vh] overflow-y-auto custom-scrollbar bg-zinc-950 text-zinc-200 p-4 font-mono text-xs whitespace-pre-wrap break-all'
      >
        {output || 'Nenhuma saída do agente ainda.'}
      </pre>
    </Dialog>
  );
}
