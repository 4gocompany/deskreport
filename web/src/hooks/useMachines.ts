import { useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client';
import { apiBase } from '../api/fetcher';

export type MachineFolder = { name: string; path: string; remote: string | null };
export type Machine = {
  id: string;
  name: string;
  workspaceRoot: string;
  folders: MachineFolder[] | null;
  agentRoles: Record<string, string[]> | null;
  online: boolean;
};

export function useMachines(orgId?: string) {
  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    if (!orgId) return;
    authClient
      .$fetch<{ machines: Machine[] }>(`${apiBase}/agents/machines`, { headers: { 'x-organization-id': orgId } })
      .then(({ data }) => setMachines(data?.machines || []));
  }, [orgId]);

  return machines;
}
