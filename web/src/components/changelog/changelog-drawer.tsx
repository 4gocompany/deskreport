import { X, Sparkles, Shield, Wrench, Zap } from 'lucide-react';
import { ChangelogCategory, RELEASES } from '../../data/changelog';

type ChangelogDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

const CATEGORY_CONFIG: Record<ChangelogCategory, { label: string; className: string; icon: typeof Sparkles }> = {
  feature: {
    label: 'Novo',
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: Sparkles,
  },
  improvement: {
    label: 'Melhoria',
    className: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: Zap,
  },
  fix: {
    label: 'Correção',
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: Wrench,
  },
  security: {
    label: 'Segurança',
    className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    icon: Shield,
  },
};

export function ChangelogDrawer({ isOpen, onClose }: ChangelogDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200'>
      <div className='w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200'>
        <div className='px-6 py-5 border-b border-zinc-800 flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20'>
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className='text-sm font-semibold text-zinc-100'>Novidades e Atualizações</h2>
              <p className='text-xs text-zinc-400'>Histórico de versões e melhorias do DeskReport</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors'
            title='Fechar'
          >
            <X size={18} />
          </button>
        </div>

        <div className='flex-1 overflow-y-auto px-6 py-6 space-y-8'>
          {RELEASES.map((release, index) => (
            <div key={release.version} className='relative pl-6 border-l border-zinc-800 space-y-3'>
              <div className='absolute -left-2 top-0 w-4 h-4 rounded-full bg-zinc-950 border-2 border-blue-500 flex items-center justify-center'>
                <span className='w-1.5 h-1.5 rounded-full bg-blue-400' />
              </div>

              <div className='flex items-baseline justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20'>
                    v{release.version}
                  </span>
                  {index === 0 && (
                    <span className='text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20'>
                      Mais recente
                    </span>
                  )}
                </div>
                <span className='text-xs font-mono text-zinc-500'>{release.date}</span>
              </div>

              <div>
                <h3 className='text-sm font-semibold text-zinc-200'>{release.title}</h3>
                <p className='text-xs text-zinc-400 mt-1 leading-relaxed'>{release.summary}</p>
              </div>

              <ul className='space-y-2 pt-1'>
                {release.items.map((item, itemIdx) => {
                  const conf = CATEGORY_CONFIG[item.category];
                  const Icon = conf.icon;
                  return (
                    <li key={itemIdx} className='flex items-start gap-2.5 text-xs text-zinc-300'>
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] shrink-0 font-medium ${conf.className}`}>
                        <Icon size={10} />
                        {conf.label}
                      </span>
                      <span className='leading-relaxed'>{item.text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className='px-6 py-3.5 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-400'>
          <span>Powered by 4Go Company</span>
          <a
            href='https://github.com/4gocompany/deskreport/releases'
            target='_blank'
            rel='noreferrer'
            className='text-blue-400 hover:text-blue-300 transition-colors'
          >
            Ver releases no GitHub →
          </a>
        </div>
      </div>
    </div>
  );
}
