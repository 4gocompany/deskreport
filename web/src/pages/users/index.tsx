import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { Users2, UserPlus, ShieldCheck, Activity, Search, MoreHorizontal, Mail, Phone, Shield } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { useState, useEffect } from 'react';
import { authClient } from '../../lib/auth-client';
import { useTenantStore } from '../../store';
import { useTenant } from '../../hooks/useTenant';

export default function UsersPage() {
    const navigate = useNavigate();
    const { company_id } = useTenant();
    const { organizations } = useTenantStore();
    const currentOrg = organizations.find(o => o.id === company_id || (o as any).slug === company_id) || organizations[0];
    const activeOrganizationId = currentOrg?.id;

    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (activeOrganizationId) {
            loadMembers();
        }
    }, [activeOrganizationId]);

    const loadMembers = async () => {
        try {
            setLoading(true);
            const { data } = await authClient.organization.getFullOrganization({
                query: { organizationId: activeOrganizationId }
            });
            if (data?.members) {
                const humanMembers = data.members.filter(
                    (m: any) => !m.userId?.startsWith('agent-user-') && !m.user?.email?.endsWith('@agents.deskreport.com.br')
                );
                setMembers(humanMembers);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const filteredMembers = members.filter(m =>
        (m.user?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.user?.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Page navigation={[]}>
            <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-transparent">
                <Topbar title='Gestão de Usuários' />

                <div className="flex-1 overflow-y-auto p-8">
                    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                        {/* STATS CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <StatCard
                                icon={<Users2 className="text-blue-500" />}
                                label="Total de Usuários"
                                value={members.length.toString()}
                                trend="+2 este mês"
                            />
                            <StatCard
                                icon={<ShieldCheck className="text-emerald-500" />}
                                label="Administradores"
                                value={members.filter(m => m.role === 'admin').length.toString()}
                            />
                            <StatCard
                                icon={<Activity className="text-amber-500" />}
                                label="Ativos Agora"
                                value="5"
                                trend="82% de engajamento"
                            />
                            <StatCard
                                icon={<Shield className="text-purple-500" />}
                                label="Licenças Disponíveis"
                                value="25"
                                trend="Plano Business"
                            />
                        </div>

                        {/* TABLE SECTION */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-md">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nome ou email..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" className="gap-2 h-10 px-4">
                                        Exportar CSV
                                    </Button>
                                    <Button
                                        onClick={() => navigate(`/${company_id}/settings/security`)}
                                        className="gap-2 h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white border-0"
                                    >
                                        <UserPlus size={18} />
                                        Novo Usuário
                                    </Button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 text-[11px] font-bold text-zinc-400  tracking-wider">
                                            <th className="px-6 py-4">Usuário</th>
                                            <th className="px-6 py-4">Contato</th>
                                            <th className="px-6 py-4">Cargo</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Último Acesso</th>
                                            <th className="px-6 py-4 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                        {loading ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td colSpan={6} className="px-6 py-8">
                                                        <div className="h-4 bg-zinc-100 dark:bg-zinc-800 rounded w-full" />
                                                    </td>
                                                </tr>
                                            ))
                                        ) : filteredMembers.map((member) => (
                                            <tr key={member.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 flex items-center justify-center overflow-hidden">
                                                            {member.user?.image ? (
                                                                <img src={member.user.image} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-blue-600 font-bold">{member.user?.name?.charAt(0) || '?'}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{member.user?.name || 'Sem nome'}</span>
                                                            <span className="text-xs text-zinc-500">ID: {member.id.substring(0, 8)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                                                            <Mail size={12} /> {member.user?.email}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                                            <Phone size={12} /> +55 (11) 9....
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold  ${member.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                                                            {member.role}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                                        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Ativo</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-xs text-zinc-500 font-medium">Hoje, 10:45</span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors">
                                                        <MoreHorizontal size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </Page>
    );
}

function StatCard({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: string, trend?: string }) {
    return (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
                <div className="p-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                    {icon}
                </div>
                {trend && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">{trend}</span>}
            </div>
            <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-400  tracking-wider">{label}</span>
                <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100 mt-1">{value}</span>
            </div>
        </div>
    );
}
