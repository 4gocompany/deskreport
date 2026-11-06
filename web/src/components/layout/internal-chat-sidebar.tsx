import { useState, useEffect } from 'react';
import { useOrganization, useSession, authClient } from '../../lib/auth-client';
import { apiBase } from '../../api/fetcher';
import { useUIStore } from '../../store';
import { Search, Circle, MessagesSquare, ArrowLeft, Send, Users, AlertTriangle, Plus, History, Trash2, Copy, Check } from 'lucide-react';
import { AgentChatMessage, AgentChatSession, agentProfile, useAgentsStore } from '../../pages/tasks/use-agents';
import { ChatMarkdown } from '../chat/chat-markdown';

type OrgMember = { id: string; userId: string; role: string; user: { name: string; image?: string | null } };

function initials(name: string) {
  return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase();
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
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86_400_000).toDateString();
  const target = d.toDateString();
  if (target === today) return 'Hoje';
  if (target === yesterday) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
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
      className="p-1 rounded bg-zinc-800/90 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors shadow-sm"
      title="Copiar mensagem"
    >
      {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
    </button>
  );
}

export function InternalChatSidebar() {
  const { chatSidebarMode, setChatSidebarMode } = useUIStore();
  const { data: organization } = useOrganization();
  const { data: session } = useSession();
  const agents = useAgentsStore((state) => state.agents);
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
  const team = agents.map((a) => agentProfile(a.agent)).filter((a) => a.name.toLowerCase().includes(query));

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
      const { data } = await authClient.$fetch<AgentChatMessage & { session: AgentChatSession }>(
        `${apiBase}/agents/sessions/${id}/messages`,
        {
          method: 'POST',
          body: { content: text },
          headers: { 'x-organization-id': organization.id },
        },
      );
      if (!data) return;
      addChatMessage(data);
      setSessions((current) => [data.session, ...current.filter((s) => s.id !== id)]);
    } finally {
      setSending(false);
    }
  }

  const itemClass = `flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-all group text-left ${isExpanded ? 'w-full' : 'w-12 h-12 justify-center'}`;
  const avatarSize = isExpanded ? 'w-10 h-10' : 'w-9 h-9';
  const dotSize = isExpanded ? 'w-3 h-3' : 'w-2.5 h-2.5';

  const openProfile = openAgent ? agentProfile(openAgent) : undefined;
  const agentStatus = openAgent ? statusOf(openAgent) : undefined;
  const agentLogs = agentStatus?.taskId ? taskLogs[agentStatus.taskId] || [] : [];
  const messages = sessionId ? chatMessages[sessionId] || [] : [];
  const currentSession = sessions.find((s) => s.id === sessionId);
  const alerts = agents.filter((a) => a.alert);

  const sessionContextTokens = messages.reduce((acc, m) => acc + Math.ceil((m.content?.length || 0) / 4), 0);
  const contextLimit = 200_000;
  const tokenBudget = 100_000;
  const tokensUsed = agentStatus?.tokens || sessionContextTokens;
  const quotaPercent = Math.min(100, Math.round((tokensUsed / tokenBudget) * 100));
  const quotaRemaining = Math.max(0, tokenBudget - tokensUsed);

  return (
    <aside
      className={`h-screen flex flex-col bg-zinc-900 border-l border-zinc-800 transition-all duration-300 ease-in-out z-40 ${isExpanded ? 'w-72' : (isCompact ? 'w-[74px]' : 'w-0 opacity-0 pointer-events-none')
        }`}
    >
      <div className={`p-4 border-b border-zinc-800 flex items-center ${isExpanded ? 'justify-between' : 'justify-center py-6'}`}>
        <div className="flex items-center gap-2 text-white">
          <MessagesSquare size={isExpanded ? 18 : 22} className="text-zinc-400" />
          {isExpanded && <span className="font-semibold text-sm">Chat</span>}
        </div>
      </div>

      {alerts.length > 0 && (
        <div className={`border-b border-zinc-800 ${isExpanded ? 'p-2.5 space-y-2' : 'py-3 flex justify-center'}`}>
          {isExpanded ? (
            alerts.map((a) => (
              <div key={a.agent} className="rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 p-2.5 text-xs space-y-2">
                <p className="flex gap-1.5">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  {a.alert}
                </p>
                {a.quotaLevel === 'stop' && (
                  <button
                    onClick={() => continueAgent(a.agent)}
                    disabled={approving === a.agent}
                    className="rounded-md bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-zinc-950 font-semibold px-2.5 py-1"
                  >
                    Continuar mesmo assim
                  </button>
                )}
                {a.quotaLevel === 'block' && <p className="text-amber-300/80">Troque o modelo no widget da máquina ou espere a cota renovar.</p>}
              </div>
            ))
          ) : (
            <button onClick={() => setChatSidebarMode('expanded')} className="text-amber-400 animate-pulse" title={alerts[0].alert}>
              <AlertTriangle size={20} />
            </button>
          )}
        </div>
      )}

      {isExpanded && openTeam ? (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
          <div className="p-3 border-b border-zinc-800 flex items-center gap-3">
            <button onClick={closeConversation} className="text-zinc-500 hover:text-zinc-200" title="Voltar">
              <ArrowLeft size={16} />
            </button>
            <span className="w-8 h-8 rounded-full bg-zinc-700 text-zinc-200 flex items-center justify-center shrink-0">
              <Users size={14} />
            </span>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-zinc-200 truncate">Sala do time</span>
              <span className="text-[10px] text-zinc-500 truncate">Conversa entre os agentes</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 text-xs">
            {teamMessages.length === 0 && (
              <p className="text-zinc-500 py-2">Quando um agente falar com outro, a conversa aparece aqui ao vivo.</p>
            )}
            {teamMessages.map((msg) => {
              const from = agentProfile(msg.agent);
              return (
                <div key={msg.id} className="rounded-xl p-2.5 space-y-1 bg-zinc-800/80 border border-zinc-700/60 text-zinc-200">
                  <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400">
                    <span className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-4 h-4 rounded-full ${from.color} text-white text-[8px] font-bold flex items-center justify-center shrink-0`}>
                        {from.initials}
                      </span>
                      <span className="font-semibold text-zinc-300 truncate">
                        {from.name} para {msg.targetAgent ? agentProfile(msg.targetAgent).name : 'o time'}
                      </span>
                    </span>
                    <span>{new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                </div>
              );
            })}
          </div>
        </div>
      ) : isExpanded && (openProfile || openMember) ? (
        <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
          <div className="p-3 border-b border-zinc-800 flex items-center gap-3">
            <button onClick={closeConversation} className="text-zinc-500 hover:text-zinc-200" title="Voltar">
              <ArrowLeft size={16} />
            </button>
            {openProfile ? (
              <span className={`w-8 h-8 rounded-full ${openProfile.color} text-white text-[10px] font-bold flex items-center justify-center shrink-0`}>
                {openProfile.initials}
              </span>
            ) : openMember?.user.image ? (
              <img src={openMember.user.image} alt={openMember.user.name} className="w-8 h-8 rounded-full object-cover shrink-0" />
            ) : (
              <span className="w-8 h-8 rounded-full bg-zinc-700 text-zinc-200 text-[10px] font-bold flex items-center justify-center shrink-0">
                {initials(openMember?.user.name || '')}
              </span>
            )}
            <div className="flex flex-col overflow-hidden flex-1">
              {openProfile && (
                <div className="flex items-center gap-1.5 text-[9px] font-mono leading-tight mb-0.5 text-zinc-400">
                  <span className={quotaPercent > 80 ? 'text-amber-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                    {quotaPercent}% usado
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span>{formatTokens(quotaRemaining)} restantes</span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400 truncate">Contexto: {formatTokens(sessionContextTokens)} / {formatTokens(contextLimit)}</span>
                </div>
              )}
              <span className="text-sm font-medium text-zinc-200 truncate">{openProfile?.name || openMember?.user.name}</span>
              <span className="text-[10px] text-zinc-500 truncate">
                {openProfile ? currentSession?.title || 'Nova conversa' : openMember?.role}
              </span>
            </div>
            {openProfile && (
              <>
                <button
                  onClick={() => setShowSessions(!showSessions)}
                  className={`shrink-0 ${showSessions ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-200'}`}
                  title="Sessões"
                >
                  <History size={15} />
                </button>
                <button
                  onClick={createSession}
                  className="shrink-0 h-6 px-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold flex items-center gap-0.5"
                  title="Nova sessão, limpa o contexto do agente"
                >
                  <Plus size={12} />
                  Nova
                </button>
              </>
            )}
          </div>

          {openProfile && showSessions && (
            <div className="max-h-64 overflow-y-auto custom-scrollbar border-b border-zinc-800 p-2 space-y-2 text-xs">
              {sessions.length === 0 && <p className="text-zinc-500 px-1">Nenhuma sessão ainda.</p>}
              {['Hoje', 'Ontem', 'Anteriores'].map((group) => {
                const list = sessions.filter((s) => sessionGroup(s.updatedAt) === group);
                if (list.length === 0) return null;
                return (
                  <div key={group} className="space-y-0.5">
                    <span className="px-1 text-[10px] font-bold text-zinc-500">{group}</span>
                    {list.map((s) => (
                      <div
                        key={s.id}
                        className={`group/session flex items-center gap-1 rounded-lg px-2 py-1.5 ${s.id === sessionId ? 'bg-blue-600/20 text-blue-100' : 'text-zinc-300 hover:bg-white/5'}`}
                      >
                        <button
                          onClick={() => {
                            setSessionId(s.id);
                            setShowSessions(false);
                          }}
                          className="flex-1 truncate text-left"
                        >
                          {s.title}
                        </button>
                        <button
                          onClick={() => deleteSession(s.id)}
                          className="opacity-0 group-hover/session:opacity-100 text-zinc-500 hover:text-red-400 shrink-0"
                          title="Apagar sessão"
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

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5 text-xs">
            {openProfile && agentStatus?.state === 'working' && (
              <div className="space-y-1.5 pb-2 border-b border-zinc-800">
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 p-2">
                  Trabalhando{agentStatus.project ? ` em ${agentStatus.project}` : ''}: {agentStatus.action || 'executando'}
                </div>
                {agentLogs.slice(-5).map((log, i) => (
                  <div key={i} className="rounded-lg bg-zinc-800/60 text-zinc-300 p-2 font-mono text-[10px]">
                    {log.action}
                    {log.file && <span className="block text-zinc-500 truncate">{log.file}</span>}
                  </div>
                ))}
              </div>
            )}

            {openProfile && messages.length === 0 && (
              <p className="text-zinc-500 py-3 text-center">
                Converse com {openProfile.name} abaixo. Cada sessão começa com o contexto limpo.
              </p>
            )}

            {openProfile &&
              messages.map((msg, idx) => {
                const fromAgent = msg.userId.startsWith('agent-user-');
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showDateDivider = !prevMsg || new Date(msg.createdAt).toDateString() !== new Date(prevMsg.createdAt).toDateString();
                const authorName = msg.user?.name || (fromAgent ? openProfile.name : 'Você');

                return (
                  <div key={msg.id} className="space-y-1">
                    {showDateDivider && (
                      <div className="relative flex items-center justify-center my-3">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-zinc-800" />
                        </div>
                        <span className="relative px-2.5 py-0.5 text-[9px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-full">
                          {formatDateDivider(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <div className="group relative flex items-start gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-colors">
                      {fromAgent ? (
                        <span className={`w-7 h-7 rounded-lg ${openProfile.color} text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                          {openProfile.initials}
                        </span>
                      ) : (
                        <span className="w-7 h-7 rounded-lg bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {session?.user?.name ? initials(session.user.name) : 'EU'}
                        </span>
                      )}

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 leading-none">
                          <span className="font-semibold text-xs text-zinc-200">{authorName}</span>
                          <span className="text-[10px] text-zinc-500">
                            {new Date(msg.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        {fromAgent ? (
                          <ChatMarkdown content={msg.content} />
                        ) : (
                          <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>
                        )}
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 absolute right-2 top-2 transition-opacity">
                        <CopyButton text={msg.content} />
                      </div>
                    </div>
                  </div>
                );
              })}

            {openMember && <p className="text-zinc-500">Nenhuma mensagem com {openMember.user.name} ainda.</p>}
          </div>

          {openProfile && (
            <div className="p-2.5 border-t border-zinc-800 bg-zinc-950/60">
              <div className="flex flex-col bg-zinc-800/60 border border-zinc-700/60 rounded-xl focus-within:border-blue-500/60 transition-colors overflow-hidden">
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
                  placeholder={`Mensagem para ${openProfile.name}... (Shift+Enter quebra linha)`}
                  className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-500 outline-none resize-none p-2"
                />
                <div className="flex items-center justify-between px-2 py-1.5 border-t border-zinc-800/40 bg-zinc-900/30">
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Enter envia
                  </span>
                  <button
                    onClick={handleSendAgentMessage}
                    disabled={!draft.trim() || sending}
                    className="h-6 px-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-30 text-white text-[11px] font-medium flex items-center gap-1 transition-colors"
                    title="Enviar mensagem"
                  >
                    <span>Enviar</span>
                    <Send size={11} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {isExpanded && (
            <div className="p-3 animate-in fade-in duration-300">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full bg-zinc-800/50 border-none rounded-lg py-2 pl-9 pr-3 text-xs text-zinc-300 placeholder:text-zinc-600 focus:ring-1 focus:ring-zinc-700 outline-none transition-all"
                />
              </div>
            </div>
          )}

          <div className={`flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2 ${!isExpanded && 'flex flex-col items-center'}`}>
            {team.length > 0 && (
              <button onClick={() => openConversation(null, null, true)} title={!isExpanded ? 'Sala do time' : ''} className={itemClass}>
                <span className={`${avatarSize} rounded-full bg-zinc-700 text-zinc-200 flex items-center justify-center shrink-0`}>
                  <Users size={16} />
                </span>
                {isExpanded && (
                  <div className="flex flex-col overflow-hidden animate-in slide-in-from-left-2 duration-300">
                    <span className="text-sm font-medium text-zinc-200 truncate">Sala do time</span>
                    <span className="text-[10px] text-zinc-500 truncate">Conversa entre os agentes</span>
                  </div>
                )}
              </button>
            )}

            {isExpanded && (
              <div className="px-2 mb-2">
                <span className="text-[10px] font-bold text-zinc-500 tracking-wider">Agentes</span>
              </div>
            )}

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
                  <div className="relative shrink-0">
                    <span className={`${avatarSize} rounded-full ${agent.color} text-white text-xs font-bold flex items-center justify-center`}>
                      {agent.initials}
                    </span>
                    <div className={`absolute bottom-0 right-0 ${dotSize} ${paused ? 'bg-amber-500' : working ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'} border-2 border-zinc-900 rounded-full`}></div>
                  </div>

                  {isExpanded && (
                    <div className="flex flex-col overflow-hidden animate-in slide-in-from-left-2 duration-300">
                      <span className="text-sm font-medium text-zinc-200 truncate">{agent.name}</span>
                      <span className={`text-[10px] truncate ${paused ? 'text-amber-400' : working ? 'text-blue-400' : 'text-zinc-500'}`}>
                        {agent.role} · {paused ? 'Pausado' : working ? 'Trabalhando' : 'Disponível'}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}

            {isExpanded && (
              <div className="px-2 mt-4 mb-2">
                <span className="text-[10px] font-bold text-zinc-500 tracking-wider">Membros</span>
              </div>
            )}

            {members.map((member) => (
              <button
                key={member.id}
                onClick={() => openConversation(null, member)}
                title={!isExpanded ? member.user.name : ''}
                className={itemClass}
              >
                {member.user.image ? (
                  <img
                    src={member.user.image}
                    alt={member.user.name}
                    className={`${avatarSize} shrink-0 rounded-full object-cover border-2 border-transparent group-hover:border-zinc-700 transition-all`}
                  />
                ) : (
                  <span className={`${avatarSize} shrink-0 rounded-full bg-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center`}>
                    {initials(member.user.name)}
                  </span>
                )}

                {isExpanded && (
                  <div className="flex flex-col overflow-hidden animate-in slide-in-from-left-2 duration-300">
                    <span className="text-sm font-medium text-zinc-200 truncate">{member.user.name}</span>
                    <span className="text-[10px] text-zinc-500 truncate capitalize">{member.role}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      <div className={`p-4 bg-zinc-950/50 border-t border-white/5 flex ${isExpanded ? 'justify-start' : 'justify-center'}`}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
            <Circle size={10} className="text-blue-500 fill-blue-500" />
          </div>
          {isExpanded && (
            <div className="flex flex-col animate-in fade-in duration-300">
              <span className="text-xs font-semibold text-zinc-300">{session?.user.name}</span>
              <span className="text-[10px] text-emerald-500">Disponível</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
