import { useEffect, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { Download, FileCode, FileImage, FileText, Paperclip, Trash2, Upload } from 'lucide-react';
import { apiBase } from '../../../api/fetcher';
import { Button, Dialog } from '../../../components/ui';

interface Attachment {
  id: string;
  filename: string;
  size: number;
  mimeType: string;
  createdAt: string;
}

const ACCEPT = '.md,.txt,.pdf,.png,.jpg,.jpeg,.webp,.json,.diff';
const MAX_SIZE = 25 * 1024 * 1024;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isMarkdown(attachment: Attachment) {
  return attachment.filename.toLowerCase().endsWith('.md');
}

function FileIcon({ attachment }: { attachment: Attachment }) {
  if (attachment.mimeType.startsWith('image/')) return <FileImage size={16} />;
  if (['application/json', 'text/x-diff'].includes(attachment.mimeType)) return <FileCode size={16} />;
  return <FileText size={16} />;
}

export function TaskAttachments({ taskId, orgId }: { taskId: string; orgId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ filename: string; content: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const baseUrl = `${apiBase}/tasks/${taskId}/attachments`;

  function request(url: string, init: RequestInit = {}) {
    return fetch(url, { ...init, credentials: 'include', headers: { 'x-organization-id': orgId } });
  }

  useEffect(() => {
    setAttachments([]);
    setError('');
    request(baseUrl)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setAttachments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [baseUrl, orgId]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError('');
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        setError(`${file.name} passa de 25MB`);
        continue;
      }
      const body = new FormData();
      body.append('file', file);
      const res = await request(baseUrl, { method: 'POST', body }).catch(() => null);
      const data = await res?.json().catch(() => null);
      if (res?.ok && data) setAttachments((list) => [...list, data]);
      else setError(data?.message || `Não foi possível enviar ${file.name}`);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  }

  async function fetchFile(attachment: Attachment) {
    const res = await request(`${baseUrl}/${attachment.id}/download`);
    if (!res.ok) throw new Error('Não foi possível baixar o arquivo');
    return res.blob();
  }

  async function download(attachment: Attachment) {
    try {
      const url = URL.createObjectURL(await fetchFile(attachment));
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function openPreview(attachment: Attachment) {
    try {
      const content = await (await fetchFile(attachment)).text();
      setPreview({ filename: attachment.filename, content });
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function remove(attachment: Attachment) {
    if (!confirm(`Remover ${attachment.filename}?`)) return;
    const res = await request(`${baseUrl}/${attachment.id}`, { method: 'DELETE' }).catch(() => null);
    if (res?.ok) setAttachments((list) => list.filter((item) => item.id !== attachment.id));
    else setError('Não foi possível remover o anexo');
  }

  return (
    <div className='space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <h3 className='text-xs font-semibold text-zinc-500 dark:text-zinc-400'>Anexos</h3>
          {attachments.length > 0 && (
            <span className='px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium'>
              {attachments.length}
            </span>
          )}
        </div>
        <Button
          variant='ghost'
          size='sm'
          className='h-7 px-2.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 gap-1.5'
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={12} />
          {uploading ? 'Enviando...' : 'Enviar arquivo'}
        </Button>
        <input ref={inputRef} type='file' multiple accept={ACCEPT} className='hidden' onChange={(e) => upload(e.target.files)} />
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        className={`rounded-xl border border-dashed p-2 transition-colors ${
          dragging
            ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-500/10'
            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/40 dark:bg-zinc-950/30'
        }`}
      >
        {attachments.length === 0 ? (
          <p className='flex items-center justify-center gap-2 py-4 text-xs text-zinc-400'>
            <Paperclip size={14} />
            Arraste specs .md, imagens ou documentos para cá
          </p>
        ) : (
          <ul className='divide-y divide-zinc-200 dark:divide-zinc-800'>
            {attachments.map((attachment) => (
              <li key={attachment.id} className='flex items-center gap-3 px-2 py-2'>
                <span className='text-zinc-400'>
                  <FileIcon attachment={attachment} />
                </span>
                <button
                  type='button'
                  onClick={() => (isMarkdown(attachment) ? openPreview(attachment) : download(attachment))}
                  className='flex-1 min-w-0 text-left text-sm text-zinc-700 dark:text-zinc-200 truncate hover:underline'
                  title={isMarkdown(attachment) ? 'Pré-visualizar' : 'Baixar'}
                >
                  {attachment.filename}
                </button>
                <span className='text-xs text-zinc-400 shrink-0'>{formatSize(attachment.size)}</span>
                <button
                  type='button'
                  onClick={() => download(attachment)}
                  className='p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  title='Baixar'
                >
                  <Download size={14} />
                </button>
                <button
                  type='button'
                  onClick={() => remove(attachment)}
                  className='p-1 rounded text-zinc-400 hover:text-red-500'
                  title='Remover'
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className='text-xs text-red-500'>{error}</p>}

      <Dialog isOpen={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.filename} maxWidth='3xl'>
        <div className='prose prose-sm dark:prose-invert max-w-none'>
          <Markdown>{preview?.content || ''}</Markdown>
        </div>
      </Dialog>
    </div>
  );
}
