import { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useSession, authClient, useOrganization } from '../lib/auth-client';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: session, isPending } = useSession();
  const [hasOrg, setHasOrg] = useState<boolean | null>(null);
  const [checkingOrg, setCheckingOrg] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const { company_id } = useParams();
  const { data: activeOrg } = useOrganization();

  useEffect(() => {
    if (!isPending && session && company_id) {
      const currentActiveId = activeOrg?.id;


      // Se o ID da URL não bate com a organização ativa, forçamos o setActive
      if (activeOrg === undefined || (activeOrg && currentActiveId !== company_id)) {
        console.log('Sincronizando organização ativa:', company_id);
        authClient.organization.setActive({
          organizationId: company_id
        }).catch(err => {
          console.error('Erro ao definir organização ativa:', err);
        });
      }
    }
  }, [session, isPending, company_id, activeOrg]);

  useEffect(() => {
    if (!isPending) {
      if (!session) {
        navigate('/login', { state: { from: location }, replace: true });
      } else if (!checkingOrg && hasOrg === null) {
        // Ignore org check if we are on the setup or select page
        if (location.pathname === '/setup-organization' || location.pathname === '/select-organization') {
          setHasOrg(true); // Permit render children setup or select
          return;
        }

        setCheckingOrg(true);
        // Check organizations
        authClient.organization.list().then(({ data }) => {
          if (data && data.length > 0) {
            setHasOrg(true);
            // Se não tem nenhuma ativa, ativa a primeira por padrão
            if (!activeOrg && !company_id) {
              authClient.organization.setActive({ organizationId: data[0].id });
            }
          } else {
            setHasOrg(false);
            navigate('/setup-organization', { replace: true });
          }
        }).catch(() => {
          setHasOrg(false);
          navigate('/setup-organization', { replace: true });
        }).finally(() => {
          setCheckingOrg(false);
        });
      }
    }
  }, [session, isPending, navigate, location.pathname, hasOrg, checkingOrg, activeOrg, company_id]);

  if (isPending || (session && hasOrg === null)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-medium animate-pulse text-zinc-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session || hasOrg === false) {
    return null;
  }

  return <>{children}</>;
}
