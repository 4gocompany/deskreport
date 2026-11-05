import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Terminal } from 'lucide-react';
import { authClient } from '../../lib/auth-client';
import { apiBase } from '../../api/fetcher';
import { Button } from '../../components/ui/button';
import { AGENT_TEAM } from '../tasks/use-agents';

type Organization = { id: string; name: string };

function validPort(value: string | null) {
  const port = Number(value);
  return Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : null;
}

export function CliAuth() {
  const [params] = useSearchParams();
  const port = validPort(params.get('port'));
  const state = params.get('state') || '';

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState(params.get('name') || 'Minha Máquina');
  const [workspaceRoot, setWorkspaceRoot] = useState(params.get('workspace') || '/home/user/workspace');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    authClient.organization.list().then(({ data }) => {
      setOrganizations(data || []);
      if (data && data.length > 0) setOrgId(data[0].id);
    });
  }, []);

  async function authorize() {
    const org = organizations.find((o) => o.id === orgId);
    if (!port || !state || !org) return;

    setSending(true);
    setError('');
    const { data, error } = await authClient.$fetch<{ token: string }>(`${apiBase}/agents/machines`, {
      method: 'POST',
      body: { name, workspaceRoot },
      headers: { 'x-organization-id': org.id },
    });

    if (error || !data?.token) {
      setError('Não foi possível autorizar a máquina. Tente de novo.');
      setSending(false);
      return;
    }

    window.location.href =
      `http://127.0.0.1:${port}/callback?token=${encodeURIComponent(data.token)}` +
      `&state=${encodeURIComponent(state)}&org=${encodeURIComponent(org.name)}&orgId=${encodeURIComponent(org.id)}` +
      `&workspace=${encodeURIComponent(workspaceRoot)}&apiUrl=${encodeURIComponent(apiBase)}&webUrl=${encodeURIComponent(window.location.origin)}`;
  }

  const inputClass =
    'w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500';

  return (
    <div className='min-h-screen w-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100'>
      <div className='flex flex-col w-full max-w-md'>
        <div className='flex justify-center mb-8'>
          <img src='/deskreport-logo.svg' alt='DeskReport' className='h-8' />
        </div>

        <div className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8'>
          <div className='flex justify-center mb-4'>
            <div className='w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center'>
              <Terminal size={22} />
            </div>
          </div>
          <h1 className='text-2xl font-bold text-center mb-2'>Conectar o DeskReport CLI</h1>
          <p className='text-zinc-500 dark:text-zinc-400 text-center text-sm mb-6'>
            Esta máquina vai rodar o time de agentes na organização escolhida.
          </p>

          {!port || !state ? (
            <p className='text-sm text-red-500 text-center'>
              Link inválido. Rode <code>deskreport setup</code> de novo no terminal.
            </p>
          ) : (
            <div className='space-y-4'>
              <label className='block space-y-1'>
                <span className='text-xs font-semibold text-zinc-500'>Organização</span>
                <div className='relative'>
                  <Building2 size={14} className='absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400' />
                  <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={`${inputClass} pl-9`}>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              </label>

              <label className='block space-y-1'>
                <span className='text-xs font-semibold text-zinc-500'>Nome da máquina</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
              </label>

              <label className='block space-y-1'>
                <span className='text-xs font-semibold text-zinc-500'>Pasta do workspace</span>
                <input value={workspaceRoot} onChange={(e) => setWorkspaceRoot(e.target.value)} className={`${inputClass} font-mono`} />
              </label>

              <div className='flex flex-col gap-2 pt-2'>
                {AGENT_TEAM.map((member) => (
                  <div key={member.agent} className='flex items-center gap-3 text-sm'>
                    <span className={`w-7 h-7 rounded-full ${member.color} text-white text-[10px] font-bold flex items-center justify-center`}>
                      {member.initials}
                    </span>
                    <span className='font-medium'>{member.name}</span>
                    <span className='text-xs text-zinc-500'>{member.role}</span>
                  </div>
                ))}
              </div>

              {error && <p className='text-sm text-red-500'>{error}</p>}

              <Button
                className='w-full'
                onClick={authorize}
                disabled={sending || !orgId || !name.trim() || !workspaceRoot.trim()}
              >
                {sending ? 'Autorizando...' : 'Autorizar Máquina e Time de Agentes'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
