import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient, useSession } from '../../lib/auth-client';
import { Button } from '../../components/ui/button';
import { Building2, Plus, LogOut } from 'lucide-react';

export function SelectOrganization() {
    const navigate = useNavigate();
    const [organizations, setOrganizations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // useSession just to be safe
    const { data: session, isPending } = useSession();

    useEffect(() => {
        if (isPending) return;
        if (!session) {
            navigate('/login');
            return;
        }

        const fetchOrgs = async () => {
            try {
                const { data } = await authClient.organization.list();
                if (data && data.length > 0) {
                    setOrganizations(data);
                    // Auto-redirect if only one organization? Usually let them choose, but can be a plus.
                    // Decidimos apenas mostrar a lista.
                } else {
                    navigate('/setup-organization');
                }
            } catch (error) {
                console.error('Failed to fetch orgs', error);
            } finally {
                setLoading(false);
            }
        };
        fetchOrgs();
    }, [navigate, session, isPending]);

    const handleSelect = async (org: any) => {
        try {
            await authClient.organization.setActive({ organizationId: org.id });
        } catch (err) {
            console.error('Erro ao ativar organização', err);
        }
        navigate(`/${org.id}`);
    };

    const handleLogout = async () => {
        await authClient.signOut();
        navigate('/login');
    };

    if (loading || isPending) {
        return (
            <div className='h-screen w-screen flex items-center justify-center p-10 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100'>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium animate-pulse text-zinc-500">Buscando empresas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className='h-screen w-screen flex items-center justify-center p-6 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100'>
            <div className='flex flex-col w-full max-w-md'>

                <div className="flex justify-center mb-8">
                    <img src="/deskreport-logo.svg" alt="Logo" className="h-8" />
                </div>

                <div className="bg-white dark:bg-[#0f0f12] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
                    <h1 className="text-2xl font-bold text-center mb-2">Selecione uma Empresa</h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-center text-sm mb-8">
                        Escolha qual espaço de trabalho você deseja acessar.
                    </p>

                    <div className="space-y-3">
                        {organizations.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => handleSelect(org)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-left group"
                            >
                                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                                    <Building2 size={20} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{org.name}</h3>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">Acessar workspace</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-3">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/setup-organization')}
                            className="w-full justify-center flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Criar nova empresa
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleLogout}
                            className="w-full justify-center flex items-center gap-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                        >
                            <LogOut size={16} />
                            Sair da conta
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
