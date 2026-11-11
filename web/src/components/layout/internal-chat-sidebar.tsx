import { useState, useEffect } from 'react';
import { useOrganization, useSession, authClient } from '../../lib/auth-client';
import { apiBase } from '../../api/fetcher';
import { useUIStore } from '../../store';
import { Search, MessagesSquare, ArrowLeft, Send, Users, AlertTriangle, Plus, History, Trash2, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';
import { AgentChatMessage, AgentChatSession, agentProfile, useAgentsStore, withAgentProfile } from '../../pages/tasks/use-agents';
import { AgentAvatar } from '../../pages/tasks/components/agent-avatar';
import { ChatMarkdown } from '../chat/chat-markdown';

type OrgMember = { id: string; userId: string; role: string; user: { name: string; image?: string | null } };

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Agrupa as sessões em Hoje, Ontem e Anteriores pela última mensagem
function sessionGroup(date: string) {
  const day = new Date(date).toDateString();
  if (day === new Date().toDateString()) return 'Hoje';
  if (day === new Date(Date.now() - 86_400_000).toDateString()) return 'Ontem';
  return 'Anteriores';
}

function formatTokens(n: number) {
  if (!n || n <= 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(Math.round(n));
}

function formatDateDivider(date: string) {
  const d = new Date(date);
  const target = d.toDateString();
  if (target === new Date().toDateString()) return 'Hoje';
  if (target === new Date(Date.now() - 86_400_000).toDateString()) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={handleCopy}
      className='p-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-500 hover:text-zinc-200 transition-colors'
      title='Copiar mensagem'
    >
      {copied ? <Check size={12} className='text-emerald-400' /> : <Copy size={12} />}
    </button>
  );
}

function SectionLabel({ label, count }: { label: string; count?: number }) {
  return (
    <div className='flex items-center justify-between px-2 pt-4 pb-1.5'>
      <span className='text-[11px] font-semibold text-zinc-500'>{label}</span>
      {count !== undefined && <span className='text-[11px] text-zinc-600'>{count}</span>}
    </div>
  );
}

export function InternalChatSidebar() {
  const { chatSidebarMode, setChatSidebarMode } = useUIStore();
  const { data: organization } = useOrganization();
  const { data: session } = useSession();
  const agents = useAgentsStore((state) => state.agents);
  // Apelidos e avatares chegam pelo socket e redesenham os perfis
  useAgentsStore((state) => state.profiles);
  const taskLogs = useAgentsStore((state) => state.taskLogs);
  const chatMessages = useAgentsStore((state) => state.chatMessages);
  const setChatHistory = useAgentsStore((state) => state.setChatHistory);
  const addChatMessage = useAgentsStore((state) => state.addChatMessage);
  const teamMessages = useAgentsStore((state) => state.teamMessages);
  const setTeamMessages = useAgentsStore((state) => state.setTeamMessages);
  const [search, setSearch] = useState('');
  const [openAgent, setOpenAgent] = useState<string | null>(null);
  const [openMember, setOpenMember] = useState<OrgMember | null>(null);
  const [openTeam, setOpenTeam] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sessions, setSessions] = useState<AgentChatSession[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);
  const [isFull, setIsFull] = useState(false);

  const isExpanded = chatSidebarMode === 'expanded';
  const isCompact = chatSidebarMode === 'compact';
  const isHidden = chatSidebarMode === 'hidden';

  // Ao abrir o agente, volta para a sessão ativa (ou a mais recente)
  useEffect(() => {
    setSessions([]);
    setSessionId(null);
    setShowSessions(false);
    if (!openAgent || !organization?.id) return;
    authClient
      .$fetch<AgentChatSession[]>(`${apiBase}/agents/${openAgent}/sessions`, {
        headers: { 'x-organization-id': organization.id },
      })
      .then(({ data }) => {
        if (!Array.isArray(data)) return;
        setSessions(data);
        setSessionId((data.find((s) => s.active) || data[0])?.id || null);
      })
      .catch(() => {});
  }, [openAgent, organization?.id]);

  useEffect(() => {
    if (!sessionId || !organization?.id) return;
    authClient
      .$fetch<AgentChatMessage[]>(`${apiBase}/agents/sessions/${sessionId}/messages`, {
        headers: { 'x-organization-id': organization.id },
      })
      .then(({ data }) => {
        if (Array.isArray(data)) setChatHistory(sessionId, data);
      })
      .catch(() => {});
  }, [sessionId, organization?.id, setChatHistory]);

  useEffect(() => {
    if (!openTeam || !organization?.id) return;
    authClient
      .$fetch<AgentChatMessage[]>(`${apiBase}/agents/team/messages`, {
        headers: { 'x-organization-id': organization.id },
      })
      .then(({ data }) => {
        if (Array.isArray(data)) setTeamMessages(data);
      })
      .catch(() => {});
  }, [openTeam, organization?.id, setTeamMessages]);

  if (isHidden) return null;

  const query = search.toLowerCase();
  // Os agentes também são membros no banco, mas aparecem na seção própria
  const members = ((organization?.members || []) as OrgMember[])
    .filter((m) => !m.userId.startsWith('agent-user-'))
    .filter((m) => m.user.name.toLowerCase().includes(query));
  const team = agents.map((a) => agentProfile(a.agent)).filter((a) => `${a.name} ${a.label}`.toLowerCase().includes(query));

  function statusOf(agent: string) {
    return agents.find((a) => a.agent === agent);
  }

  function openConversation(agent: string | null, member: OrgMember | null, team = false) {
    setOpenAgent(agent);
    setOpenMember(member);
    setOpenTeam(team);
    if (!isExpanded) setChatSidebarMode('expanded');
  }

  function closeConversation() {
    setOpenAgent(null);
    setOpenMember(null);
    setOpenTeam(false);
    setDraft('');
  }

  // "Continuar mesmo assim": a máquina libera o agente travado pela cota
  async function continueAgent(agent: string) {
    if (!organization?.id) return;
    setApproving(agent);
    try {
      await authClient.$fetch(`${apiBase}/agents/${agent}/quota/continue`, {
        method: 'POST',
        headers: { 'x-organization-id': organization.id },
      });
    } finally {
      setApproving(null);
    }
  }

  // "Interromper": a máquina tira da fila o que esperava a cota do agente
  async function dropQueue(agent: string) {
    if (!organization?.id) return;
    setApproving(agent);
    try {
      await authClient.$fetch(`${apiBase}/agents/${agent}/quota/drop`, {
        method: 'POST',
        headers: { 'x-organization-id': organization.id },
      });
    } finally {
      setApproving(null);
    }
  }

  // Nova sessão: o agente começa sem o contexto da conversa anterior
  async function createSession() {
    if (!openAgent || !organization?.id) return null;
    const { data } = await authClient.$fetch<AgentChatSession>(`${apiBase}/agents/${openAgent}/sessions`, {
      method: 'POST',
      body: {},
      headers: { 'x-organization-id': organization.id },
    });
    if (!data) return null;
    setSessions((current) => [data, ...current.map((s) => ({ ...s, active: false }))]);
    setSessionId(data.id);
    setShowSessions(false);
    return data.id;
  }

  async function deleteSession(id: string) {
    if (!organization?.id || !window.confirm('Apagar esta sessão e as mensagens dela?')) return;
    await authClient.$fetch(`${apiBase}/agents/sessions/${id}`, {
      method: 'DELETE',
      headers: { 'x-organization-id': organization.id },
    });
    setSessions((current) => current.filter((s) => s.id !== id));
    if (sessionId === id) setSessionId(null);
  }

  async function handleSendAgentMessage() {
    if (!openAgent || !organization?.id || !draft.trim() || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const id = sessionId || (await createSession());
      if (!id) return;
      const { data } = await authClient.$fetch<AgentChatMessage & { session: AgentChatSession }>(`${apiBase}/agents/sessions/${id}/messages`, {
        method: 'POST',
        body: { content: text },
        headers: { 'x-organization-id': organization.id },
      });
      if (!data) return;
      addChatMessage(data);
      setSessions((current) => [data.session, ...current.filter((s) => s.id !== id)]);
    } finally {
      setSending(false);
    }
  }

  const itemClass = `flex items-center gap-3 rounded-lg transition-colors text-left hover:bg-zinc-800/60 ${isExpanded ? 'w-full px-2 py-2' : 'w-11 h-11 justify-center'}`;
  const avatarSize = isExpanded ? 'w-9 h-9' : 'w-8 h-8';

  const openProfile = openAgent ? agentProfile(openAgent) : undefined;
  const agentStatus = openAgent ? statusOf(openAgent) : undefined;
  const agentLogs = agentStatus?.taskId ? taskLogs[agentStatus.taskId] || [] : [];
  const messages = sessionId ? chatMessages[sessionId] || [] : [];
  const currentSession = sessions.find((s) => s.id === sessionId);
  const alerts = agents.filter((a) => a.alert);
  const onlineCount = agents.filter((a) => a.state !== 'paused').length;

  // Só mostra o que a CLI do provedor informou na máquina, sem estimativa
  const quotaUsed = agentStatus?.quotaUsed;
  const hasQuota = typeof quotaUsed === 'number';
  const contextTokens = agentStatus?.contextTokens;
  const contextLimit = agentStatus?.contextLimit;
  const tokens = agentStatus?.tokens;
  const quotaTitle = agentStatus?.quotaResetsAt ? `Renova em ${new Date(agentStatus.quotaResetsAt).toLocaleString('pt-BR')}` : undefined;

  // Na tela cheia a conversa fica numa coluna central para não esticar as linhas
  const column = isFull ? 'w-full max-w-3xl mx-auto' : 'w-full';

  return (
    // O chat fica preso à direita e cresce para a esquerda na tela cheia
    <div className={`h-screen shrink-0 transition-all duration-300 ease-in-out ${isExpanded ? 'w-80' : isCompact ? 'w-[74px]' : 'w-0'}`}>
      <aside
        className={`fixed top-0 right-0 h-screen flex flex-col bg-zinc-900 border-l border-zinc-800 transition-all duration-300 ease-in-out ${isExpanded && isFull ? 'z-50' : 'z-40'} ${
          isExpanded ? (isFull ? 'w-screen' : 'w-80') : isCompact ? 'w-[74px]' : 'w-0 opacity-0 pointer-events-none'
        }`}
      >
        <div className={`h-12 shrink-0 px-4 border-b border-zinc-800 flex items-center ${isExpanded ? 'justify-between' : 'justify-center'}`}>
          <div className='flex items-center gap-2'>
            <MessagesSquare size={isExpanded ? 16 : 20} className='text-zinc-400' />
            {isExpanded && (
              <>
                <span className='text-sm font-semibold text-zinc-100'>Chat</span>
                {agents.length > 0 && (
                  <span className='px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-[11px] font-medium'>
                    {onlineCount} de {agents.length} agentes ativos
                  </span>
                )}
              </>
            )}
          </div>
          {isExpanded && (
            <button
              onClick={() => setIsFull(!isFull)}
              className='h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors'
              title={isFull ? 'Reduzir chat' : 'Chat em tela cheia'}
            >
              {isFull ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
          )}
        </div>

        {alerts.length > 0 && (
          <div className={`border-b border-zinc-800 ${isExpanded ? 'p-3 space-y-2' : 'py-3 flex justify-center'}`}>
            {isExpanded ? (
              alerts.map((a) => (
                <div key={a.agent} className={`${column} rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2.5`}>
                  <div className='flex gap-2 text-xs text-amber-200'>
                    <AlertTriangle size={14} className='shrink-0 mt-0.5 text-amber-400' />
                    <span className='leading-relaxed'>{a.alert}</span>
                  </div>
                  {a.queued && a.queued.length > 0 && <p className='text-xs text-amber-300/80'>Na fila: {a.queued.join(', ')}</p>}
                  <div className='flex gap-2'>
                    {a.quotaLevel === 'stop' && (
                      <button
                        onClick={() => continueAgent(a.agent)}
                        disabled={approving === a.agent}
                        className='h-7 px-3 rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 text-xs font-semibold transition-colors'
                      >
                        {a.queued && a.queued.length > 0 ? `Seguir com a fila (${a.queued.length})` : 'Seguir'}
                      </button>
                    )}
                    {(a.quotaLevel === 'stop' || a.quotaLevel === 'block') && a.queued && a.queued.length > 0 && (
                      <button
                        onClick={() => dropQueue(a.agent)}
                        disabled={approving === a.agent}
                        className='h-7 px-3 rounded-md border border-amber-500/50 hover:bg-amber-500/10 disabled:opacity-50 text-amber-300 text-xs font-semibold transition-colors'
                      >
                        Interromper
                      </button>
                    )}
                  </div>
                  {a.quotaLevel === 'block' && <p className='text-xs text-amber-300/80'>Troque o modelo no widget da máquina ou espere a cota renovar.</p>}
                </div>
              ))
            ) : (
              <button onClick={() => setChatSidebarMode('expanded')} className='text-amber-400 animate-pulse' title={alerts[0].alert}>
                <AlertTriangle size={20} />
              </button>
            )}
          </div>
        )}

        {isExpanded && openTeam ? (
          <div className='flex-1 flex flex-col min-h-0 animate-in fade-in duration-200'>
            <div className='h-14 shrink-0 px-3 border-b border-zinc-800 flex items-center gap-3'>
              <button
                onClick={closeConversation}
                className='h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors'
                title='Voltar'
              >
                <ArrowLeft size={15} />
              </button>
              <span className='w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0'>
                <Users size={15} />
              </span>
              <div className='flex flex-col min-w-0'>
                <span className='text-sm font-semibold text-zinc-100 truncate'>Sala do time</span>
                <span className='text-[11px] text-zinc-500 truncate'>Conversa entre os agentes</span>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto custom-scrollbar p-4'>
              <div className={`${column} space-y-2.5`}>
                {teamMessages.length === 0 && (
                  <p className='text-xs text-zinc-500 text-center py-8'>Quando um agente falar com outro, a conversa aparece aqui ao vivo.</p>
                )}
                {teamMessages.map((msg) => {
                  const from = agentProfile(msg.agent);
                  return (
                    <div key={msg.id} className='rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-1.5'>
                      <div className='flex items-center justify-between gap-2'>
                        <span className='flex items-center gap-2 min-w-0'>
                          <AgentAvatar profile={from} className='w-5 h-5 rounded-full text-[8px] shrink-0' />
                          <span className='text-xs font-semibold text-zinc-200 truncate'>{from.name}</span>
                          <span className='text-[11px] text-zinc-500 truncate'>
                            para {msg.targetAgent ? agentProfile(msg.targetAgent).name : 'o time'}
                          </span>
                        </span>
                        <span className='text-[11px] text-zinc-500 shrink-0'>{formatTime(msg.createdAt)}</span>
                      </div>
                      <p className='text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed break-words'>{msg.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : isExpanded && (openProfile || openMember) ? (
          <div className='flex-1 flex flex-col min-h-0 animate-in fade-in duration-200'>
            <div className='shrink-0 border-b border-zinc-800'>
              <div className='h-14 px-3 flex items-center gap-3'>
                <button
                  onClick={closeConversation}
                  className='h-7 w-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors shrink-0'
                  title='Voltar'
                >
                  <ArrowLeft size={15} />
                </button>
                {openProfile ? (
                  <AgentAvatar profile={openProfile} className='w-8 h-8 rounded-full text-[10px] shrink-0' />
                ) : openMember?.user.image ? (
                  <img src={openMember.user.image} alt={openMember.user.name} className='w-8 h-8 rounded-full object-cover shrink-0' />
                ) : (
                  <span className='w-8 h-8 rounded-full bg-zinc-700 text-zinc-200 text-[10px] font-bold flex items-center justify-center shrink-0'>
                    {initials(openMember?.user.name || '')}
                  </span>
                )}
                <div className='flex flex-col min-w-0 flex-1'>
                  <span className='flex items-center gap-1.5 min-w-0'>
                    <span className='text-sm font-semibold text-zinc-100 truncate'>{openProfile?.name || openMember?.user.name}</span>
                    {openProfile?.nickname && (
                      <span className='text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 shrink-0'>{openProfile.label}</span>
                    )}
                  </span>
                  <span className='text-[11px] text-zinc-500 truncate capitalize'>{openProfile ? currentSession?.title || 'Nova conversa' : openMember?.role}</span>
                </div>
                {openProfile && (
                  <div className='flex items-center gap-1 shrink-0'>
                    <button
                      onClick={() => setShowSessions(!showSessions)}
                      className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                        showSessions ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800'
                      }`}
                      title='Sessões'
                    >
                      <History size={14} />
                    </button>
                    <button
                      onClick={createSession}
                      className='h-7 px-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1 transition-colors'
                      title='Nova sessão, limpa o contexto do agente'
                    >
                      <Plus size={13} />
                      Nova
                    </button>
                  </div>
                )}
              </div>

              {openProfile && (hasQuota || !!contextTokens || !!tokens) && (
                <div className='px-4 pb-3 flex items-center gap-3 text-[11px] text-zinc-500'>
                  {hasQuota && (
                    <div className='flex items-center gap-2 flex-1 min-w-0' title={quotaTitle}>
                      <span className='shrink-0'>Cota</span>
                      <div className='h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden'>
                        <div className={`h-full rounded-full ${agentStatus?.quotaLevel ? 'bg-amber-500' : 'bg-blue-500'}`} style={{ width: `${quotaUsed}%` }} />
                      </div>
                      <span className={`shrink-0 font-medium ${agentStatus?.quotaLevel ? 'text-amber-400' : 'text-zinc-300'}`}>{quotaUsed}%</span>
                    </div>
                  )}
                  {contextTokens ? (
                    <span className='shrink-0'>
                      Contexto <span className='text-zinc-300 font-medium'>{formatTokens(contextTokens)}</span>
                      {contextLimit ? ` / ${formatTokens(contextLimit)}` : ''}
                    </span>
                  ) : (
                    !!tokens && (
                      <span className='shrink-0'>
                        Tokens <span className='text-zinc-300 font-medium'>{formatTokens(tokens)}</span>
                      </span>
                    )
                  )}
                </div>
              )}
            </div>

            {openProfile && showSessions && (
              <div className='max-h-64 shrink-0 overflow-y-auto custom-scrollbar border-b border-zinc-800 bg-zinc-950/40 p-2 space-y-2'>
                {sessions.length === 0 && <p className='text-xs text-zinc-500 px-2 py-1'>Nenhuma sessão ainda.</p>}
                {['Hoje', 'Ontem', 'Anteriores'].map((group) => {
                  const list = sessions.filter((s) => sessionGroup(s.updatedAt) === group);
                  if (list.length === 0) return null;
                  return (
                    <div key={group} className='space-y-0.5'>
                      <span className='block px-2 py-1 text-[11px] font-semibold text-zinc-500'>{group}</span>
                      {list.map((s) => (
                        <div
                          key={s.id}
                          className={`group/session flex items-center gap-1 rounded-md px-2 py-1.5 text-xs ${
                            s.id === sessionId ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                          }`}
                        >
                          <button
                            onClick={() => {
                              setSessionId(s.id);
                              setShowSessions(false);
                            }}
                            className='flex-1 truncate text-left'
                          >
                            {s.title}
                          </button>
                          <button
                            onClick={() => deleteSession(s.id)}
                            className='opacity-0 group-hover/session:opacity-100 text-zinc-500 hover:text-red-400 shrink-0'
                            title='Apagar sessão'
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}

            <div className='flex-1 overflow-y-auto custom-scrollbar px-3 py-4'>
              <div className={column}>
                {openProfile && agentStatus?.state === 'working' && (
                  <div className='mb-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 space-y-2'>
                    <div className='flex items-center gap-2 text-xs text-zinc-200'>
                      <span className='w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0' />
                      <span className='truncate'>
                        Trabalhando{agentStatus.project ? ` em ${agentStatus.project}` : ''}: {agentStatus.action || 'executando'}
                      </span>
                    </div>
                    {agentLogs.slice(-5).map((log, i) => (
                      <div key={i} className='pl-4 border-l border-zinc-800 font-mono text-[11px] text-zinc-400'>
                        {log.action}
                        {log.file && <span className='block text-zinc-600 truncate'>{log.file}</span>}
                      </div>
                    ))}
                  </div>
                )}

                {openProfile && messages.length === 0 && (
                  <div className='flex flex-col items-center text-center gap-3 py-12'>
                    <AgentAvatar profile={openProfile} className='w-12 h-12 rounded-full text-sm' />
                    <div className='space-y-1'>
                      <p className='text-sm font-semibold text-zinc-200'>Converse com {openProfile.name}</p>
                      <p className='text-xs text-zinc-500'>Cada sessão começa com o contexto limpo.</p>
                    </div>
                  </div>
                )}

                {openProfile &&
                  messages.map((msg, idx) => {
                    const fromAgent = msg.userId.startsWith('agent-user-');
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showDateDivider = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
                    // Mensagens seguidas do mesmo autor em até 5 minutos ficam no mesmo bloco
                    const sameBlock =
                      !!prevMsg &&
                      !showDateDivider &&
                      prevMsg.userId === msg.userId &&
                      new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() < 5 * 60_000;
                    const authorName = (msg.user && withAgentProfile(msg.user).name) || (fromAgent ? openProfile.name : 'Você');

                    return (
                      <div key={msg.id}>
                        {showDateDivider && (
                          <div className='flex items-center gap-3 my-4'>
                            <div className='flex-1 border-t border-zinc-800' />
                            <span className='text-[11px] font-medium text-zinc-500'>{formatDateDivider(msg.createdAt)}</span>
                            <div className='flex-1 border-t border-zinc-800' />
                          </div>
                        )}

                        <div className={`group relative flex items-start gap-3 px-2 rounded-lg hover:bg-zinc-800/40 transition-colors ${sameBlock ? 'py-0.5' : 'pt-2 pb-0.5 mt-1'}`}>
                          <div className='w-8 shrink-0'>
                            {!sameBlock &&
                              (fromAgent ? (
                                <AgentAvatar profile={openProfile} className='w-8 h-8 rounded-full text-[10px]' />
                              ) : session?.user?.image ? (
                                <img src={session.user.image} alt={authorName} className='w-8 h-8 rounded-full object-cover' />
                              ) : (
                                <span className='w-8 h-8 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center'>
                                  {session?.user?.name ? initials(session.user.name) : 'EU'}
                                </span>
                              ))}
                          </div>

                          <div className='flex-1 min-w-0'>
                            {!sameBlock && (
                              <div className='flex items-baseline gap-2 mb-0.5'>
                                <span className='text-[13px] font-semibold text-zinc-100'>{authorName}</span>
                                <span className='text-[11px] text-zinc-500'>{formatTime(msg.createdAt)}</span>
                              </div>
                            )}
                            {fromAgent ? (
                              <ChatMarkdown content={msg.content} />
                            ) : (
                              <p className='text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed break-words'>{msg.content}</p>
                            )}
                          </div>

                          <div className='opacity-0 group-hover:opacity-100 absolute right-2 top-1 transition-opacity'>
                            <CopyButton text={msg.content} />
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {openMember && <p className='text-xs text-zinc-500 text-center py-12'>Nenhuma mensagem com {openMember.user.name} ainda.</p>}
              </div>
            </div>

            {openProfile && (
              <div className='shrink-0 p-3 border-t border-zinc-800'>
                <div className={`${column} rounded-xl border border-zinc-800 bg-zinc-950/40 focus-within:border-blue-500/60 transition-colors`}>
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendAgentMessage();
                      }
                    }}
                    placeholder={`Mensagem para ${openProfile.name}`}
                    className='w-full bg-transparent text-[13px] text-zinc-200 placeholder:text-zinc-500 outline-none resize-none px-3 pt-2.5'
                  />
                  <div className='flex items-center justify-between px-3 pb-2'>
                    <span className='text-[11px] text-zinc-600'>Enter envia, Shift+Enter quebra linha</span>
                    <button
                      onClick={handleSendAgentMessage}
                      disabled={!draft.trim() || sending}
                      className='h-7 w-7 rounded-md bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white flex items-center justify-center transition-colors'
                      title='Enviar mensagem'
                    >
                      <Send size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {isExpanded && (
              <div className='px-3 pt-3 animate-in fade-in duration-200'>
                <div className='relative'>
                  <Search size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500' />
                  <input
                    type='text'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder='Buscar agente ou membro'
                    className='w-full h-9 rounded-lg border border-zinc-800 bg-zinc-950/40 pl-9 pr-3 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-blue-500/60 transition-colors'
                  />
                </div>
              </div>
            )}

            <div className={`flex-1 overflow-y-auto custom-scrollbar px-2 pb-2 ${isExpanded ? 'pt-1' : 'pt-3 flex flex-col items-center gap-1.5'}`}>
              {team.length > 0 && (
                <>
                  {isExpanded && <SectionLabel label='Canais' />}
                  <button onClick={() => openConversation(null, null, true)} title={!isExpanded ? 'Sala do time' : ''} className={itemClass}>
                    <span className={`${avatarSize} rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0`}>
                      <Users size={15} />
                    </span>
                    {isExpanded && (
                      <div className='flex flex-col min-w-0'>
                        <span className='text-sm font-medium text-zinc-200 truncate'>Sala do time</span>
                        <span className='text-[11px] text-zinc-500 truncate'>Conversa entre os agentes</span>
                      </div>
                    )}
                  </button>
                </>
              )}

              {isExpanded && <SectionLabel label='Agentes' count={team.length} />}

              {team.map((agent) => {
                const state = statusOf(agent.agent)?.state;
                const working = state === 'working';
                const paused = state === 'paused';
                return (
                  <button
                    key={agent.agent}
                    onClick={() => openConversation(agent.agent, null)}
                    title={!isExpanded ? `${agent.name} (${paused ? 'pausado' : working ? 'trabalhando' : 'disponível'})` : ''}
                    className={itemClass}
                  >
                    <div className='relative shrink-0'>
                      <AgentAvatar profile={agent} className={`${avatarSize} rounded-full text-xs`} />
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-900 ${
                          paused ? 'bg-amber-500' : working ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'
                        }`}
                      />
                    </div>

                    {isExpanded && (
                      <div className='flex flex-col min-w-0 flex-1'>
                        <span className='flex items-center gap-1.5 min-w-0'>
                          <span className='text-sm font-medium text-zinc-200 truncate'>{agent.name}</span>
                          {agent.nickname && <span className='text-[10px] font-medium text-zinc-500 shrink-0'>{agent.label}</span>}
                        </span>
                        <span className='text-[11px] text-zinc-500 truncate'>{agent.role}</span>
                      </div>
                    )}

                    {isExpanded && (
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md shrink-0 ${
                          paused ? 'bg-amber-500/10 text-amber-400' : working ? 'bg-blue-500/10 text-blue-400' : 'text-zinc-500'
                        }`}
                      >
                        {paused ? 'Pausado' : working ? 'Trabalhando' : 'Disponível'}
                      </span>
                    )}
                  </button>
                );
              })}

              {isExpanded && <SectionLabel label='Membros' count={members.length} />}

              {members.map((member) => (
                <button key={member.id} onClick={() => openConversation(null, member)} title={!isExpanded ? member.user.name : ''} className={itemClass}>
                  {member.user.image ? (
                    <img src={member.user.image} alt={member.user.name} className={`${avatarSize} shrink-0 rounded-full object-cover`} />
                  ) : (
                    <span className={`${avatarSize} shrink-0 rounded-full bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center`}>
                      {initials(member.user.name)}
                    </span>
                  )}

                  {isExpanded && (
                    <div className='flex flex-col min-w-0'>
                      <span className='text-sm font-medium text-zinc-200 truncate'>{member.user.name}</span>
                      <span className='text-[11px] text-zinc-500 truncate capitalize'>{member.role}</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        <div className={`shrink-0 px-4 py-3 border-t border-zinc-800 flex ${isExpanded ? 'justify-start' : 'justify-center'}`}>
          <div className='flex items-center gap-3 min-w-0'>
            <div className='relative shrink-0'>
              {session?.user?.image ? (
                <img src={session.user.image} alt={session.user.name} className='w-8 h-8 rounded-full object-cover' />
              ) : (
                <span className='w-8 h-8 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center'>
                  {session?.user?.name ? initials(session.user.name) : 'EU'}
                </span>
              )}
              <span className='absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-zinc-900' />
            </div>
            {isExpanded && (
              <div className='flex flex-col min-w-0'>
                <span className='text-xs font-semibold text-zinc-200 truncate'>{session?.user.name}</span>
                <span className='text-[11px] text-zinc-500'>Disponível</span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
