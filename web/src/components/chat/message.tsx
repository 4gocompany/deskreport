import { FileIcon, Play, Download, MoreVertical } from 'lucide-react';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document';

interface ChatMessageProps {
  type?: MessageType;
  content?: string;
  timestamp?: string;
  isMine?: boolean;
  fileName?: string;
  fileSize?: string;
  mediaUrl?: string;
}

export function Message({
  type = 'text',
  content,
  timestamp = '20:00',
  isMine = false,
  fileName,
  fileSize,
  mediaUrl
}: ChatMessageProps) {
  const renderContent = () => {
    switch (type) {
      case 'image':
        return (
          <div className='relative group/media overflow-hidden rounded-lg'>
            <img src={mediaUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60'} alt="Shared media" className='max-w-full h-auto object-cover max-h-72 cursor-pointer hover:scale-[1.02] transition-transform duration-300' />
            <div className='absolute inset-0 bg-black/0 group-hover/media:bg-black/20 transition-colors flex items-center justify-center'>
              <button className='opacity-0 group-hover/media:opacity-100 p-2 bg-white/20 backdrop-blur-md rounded-full text-white transition-opacity'>
                <Download size={20} />
              </button>
            </div>
          </div>
        );
      case 'video':
        return (
          <div className='relative group/video overflow-hidden rounded-lg bg-zinc-900'>
            <video src={mediaUrl} className='max-w-full max-h-72' />
            <div className='absolute inset-0 flex items-center justify-center'>
              <button className='w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-white/40 transition-all'>
                <Play size={24} fill="currentColor" />
              </button>
            </div>
            <div className='absolute bottom-3 right-3 text-[10px] text-white/80 bg-black/40 px-2 py-0.5 rounded'>1:24</div>
          </div>
        );
      case 'audio':
        return (
          <div className='flex items-center gap-4 w-[280px] py-1'>
            <button className='w-10 h-10 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-full flex items-center justify-center hover:opacity-90 flex-shrink-0'>
              <Play size={18} fill="currentColor" />
            </button>
            <div className='flex-1 flex flex-col gap-1.5'>
              <div className='flex items-end gap-0.5 h-6'>
                {[2, 4, 3, 6, 8, 4, 9, 3, 5, 2, 7, 4, 6, 8, 3, 5, 4, 6, 2, 4, 3, 5].map((h, i) => (
                  <div key={i} className={`flex-1 rounded-full ${i < 8 ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-300 dark:bg-zinc-700'}`} style={{ height: `${h * 10}%` }}></div>
                ))}
              </div>
              <div className='flex justify-between text-[10px] text-zinc-400 font-medium'>
                <span>0:24</span>
                <span>2:10</span>
              </div>
            </div>
          </div>
        );
      case 'document':
        return (
          <div className='flex items-center gap-3 p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg border border-zinc-100 dark:border-zinc-700 w-72'>
            <div className='w-10 h-10 bg-zinc-200 dark:bg-zinc-700 rounded flex items-center justify-center text-zinc-500'>
              <FileIcon size={20} />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm font-medium truncate'>{fileName || 'Relatorio_Mensal_v1.pdf'}</p>
              <p className='text-[10px] text-zinc-400 font-medium'>{fileSize || '2.4 MB'} • PDF</p>
            </div>
            <button className='p-2 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded transition-colors'>
              <Download size={16} className='text-zinc-500' />
            </button>
          </div>
        );
      default:
        return (
          <p className='text-[15px] leading-relaxed'>
            {content || "Lorem Ipsum dolor sit amet, jet amet Lorem Ipsum dolor sit amet, jet amet Lorem Ipsum dolor sit amet, jet amet."}
          </p>
        );
    }
  };

  return (
    <div className={`flex flex-col w-full mt-6 group/msg message ${isMine ? 'items-end' : 'items-start'}`}>
      <div className={`flex flex-col group max-w-[85%] ${isMine ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            relative p-3 rounded-2xl border transition-colors w-fit
            ${isMine
              ? 'bg-zinc-900 text-white border-zinc-800 rounded-tr-none'
              : 'bg-white dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 rounded-tl-none'
            }
          `}
        >
          {renderContent()}
          <button className={`absolute top-2 -right-10 opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-all ${isMine ? 'right-auto -left-10' : ''}`}>
            <MoreVertical size={14} className='text-zinc-400' />
          </button>
        </div>
        <span className={`block py-1.5 px-1 text-[10px] font-bold text-zinc-400 dark:text-zinc-500`}>
          {timestamp} {isMine && '• Visualizada'}
        </span>
      </div>
    </div>
  );
}

