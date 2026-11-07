import { AgentProfile } from '../use-agents';

// Avatar do agente: imagem personalizada, ou as iniciais na cor do agente
export function AgentAvatar({ profile, className }: { profile: AgentProfile; className: string }) {
  if (profile.avatar) {
    return <img src={profile.avatar} alt={profile.name} className={`${className} object-cover`} />;
  }
  return (
    <span
      className={`${className} ${profile.color} text-white font-bold flex items-center justify-center`}
      style={profile.background ? { backgroundColor: profile.background } : undefined}
    >
      {profile.initials}
    </span>
  );
}
