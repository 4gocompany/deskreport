import { useEffect, useState } from 'react';
import { Plus, Users, Building, MoreVertical, Briefcase, Power, Settings2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { authClient } from '../../../lib/auth-client';
import { useNavigate } from 'react-router-dom';
import { EditOrganizationModal } from './edit-organization-modal';

export function OrganizationsHub() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const { data } = await authClient.organization.list();
      if (data) setOrganizations(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetActive = async (org: any) => {
    try {
      await authClient.organization.setActive({ organizationId: org.id });
      navigate(`/${org.id}/resume`);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-slide-up pb-10 max-w-6xl mx-auto">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Organizações</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Gerencie todos os seus espaços de trabalho e alterne entre contextos.</p>
        </div>
        <Button onClick={() => navigate('/setup-organization')} className="gap-2">
          <Plus size={18} />
          Nova Organização
        </Button>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="w-full flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : organizations.length === 0 ? (
          <div className="text-center py-12 text-zinc-500 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            Nenhuma organização encontrada.
          </div>
        ) : (
          <div className="space-y-3">
            {organizations.map(org => {
              const metadata = org.metadata ? (typeof org.metadata === 'string' ? JSON.parse(org.metadata) : org.metadata) : {};
              const industries = Array.isArray(metadata.industry) ? metadata.industry : (metadata.industry ? [metadata.industry] : []);

              return (
                <div
                  key={org.id}
                  className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* Icon Container */}
                    <div className="w-12 h-12 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <Building size={24} />
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        {org.name}
                      </h3>

                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <Briefcase size={14} />
                          Ramo: {industries.length > 0 ? industries.join(', ') : 'Não definido'}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <Users size={14} />
                          Acesso: Administrador
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSetActive(org)}
                      className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                      title="Acessar"
                    >
                      <Power size={18} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingOrg(org);
                      }}
                      title="Editar"
                    >
                      <Settings2 size={18} />
                    </Button>
                    <Button size="icon" variant="ghost">
                      <MoreVertical size={18} />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editingOrg && (
        <EditOrganizationModal
          organization={editingOrg}
          onClose={() => setEditingOrg(null)}
          onSuccess={() => {
            setEditingOrg(null);
            loadOrganizations();
          }}
        />
      )}
    </div>
  );
}
