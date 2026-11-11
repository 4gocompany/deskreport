import { useState } from 'react';
import { withAgentProfile } from '../use-agents';

// Avatar de pessoa ou agente. Sem imagem, ou com a imagem fora do ar, mostra as iniciais
export function UserAvatar({ user, className }: { user: { id?: string; name?: string; image?: string | null }; className: string }) {
  const [broken, setBroken] = useState(false);
  const shown = withAgentProfile(user);
  const initials = (shown.name || '?')
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  if (shown.image && !broken) {
    return <img src={shown.image} alt={shown.name} title={shown.name} onError={() => setBroken(true)} className={`${className} object-cover`} />;
  }
  return (
    <span
      title={shown.name}
      className={`${className} bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200 text-[10px] font-semibold flex items-center justify-center`}
    >
      {initials}
    </span>
  );
}
