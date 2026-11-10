import { createPortal } from 'react-dom';
import { X, ExternalLink } from 'lucide-react';
import { RELEASES } from '../../data/changelog';

type ChangelogDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ChangelogDrawer({ isOpen, onClose }: ChangelogDrawerProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 font-sans antialiased animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 flex flex-col shadow-2xl z-10 animate-in slide-in-from-right duration-150">
        {/* Header Minimalista */}
        <div className="h-14 px-6 border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-zinc-200">Novidades</h2>
            <p className="text-[11px] text-zinc-500">Histórico de versões do DeskReport</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors"
            title="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lista de Versões e Entregas (Minimalista, estilo notas do GitHub) */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
          {RELEASES.map((release, idx) => (
            <div key={release.version} className="space-y-3">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-900">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-200">v{release.version}</span>
                  {idx === 0 && (
                    <span className="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.2 rounded">
                      atual
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-zinc-500">{release.date}</span>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-zinc-300">{release.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{release.summary}</p>
              </div>

              <ul className="space-y-2 pt-1">
                {release.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-xs text-zinc-300 leading-relaxed">
                    <span className="text-zinc-600 mt-0.5 select-none">•</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Rodapé Minimalista */}
        <div className="h-12 px-6 border-t border-zinc-800/80 bg-zinc-950 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <span>DeskReport</span>
          <a
            href="https://github.com/4gocompany/deskreport/releases"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <span>GitHub releases</span>
            <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>,
    document.body
  );
}
