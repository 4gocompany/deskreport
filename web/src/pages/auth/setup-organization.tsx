import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../lib/auth-client';
import { Button } from '../../components/ui/button';
import { Check, Building2, Briefcase, Zap, Settings, ArrowRight, ArrowLeft, MessageCircle } from 'lucide-react';

const MODULES = [
  { id: 'tasks', name: 'Tarefas (Kanban, Listas)', icon: <Building2 size={18} /> },
  { id: 'chat', name: 'Chat Omnichannel', icon: <Zap size={18} /> },
  { id: 'automation', name: 'Automações (Bots, Modelos)', icon: <Settings size={18} /> },
  { id: 'projects', name: 'Gestão de Projetos', icon: <Briefcase size={18} /> },
  { id: 'internal_chat', name: 'Chat Interno', icon: <MessageCircle size={18} /> },
];

export const INDUSTRIES = [
  'Tecnologia',
  'Varejo',
  'Saúde',
  'Educação',
  'Indústria',
  'Serviços',
  'Alimentação',
  'Construção Civil',
  'Consultoria',
  'Marketing',
  'Imobiliário',
  'Logística',
  'Financeiro',
  'Turismo',
  'Estética e Beleza',
  'Outros'
];

export function SetupOrganization() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [industries, setIndustries] = useState<string[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>(['tasks', 'chat']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleModule = (id: string) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || industries.length === 0) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    if (selectedModules.length === 0) {
      setError('Selecione pelo menos um módulo.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: organization, error } = await authClient.organization.create({
        name,
        slug: name.toLowerCase().split(' ')[0] || 'org',
        logo: '',
      });

      if (error) throw new Error(error.message);

      if (organization) {
        // If better-auth handles metadata directly we could have passed it above,
        // but if not, organization.update is an option, or since we only
        // need organization setup to bypass guard, we redirect:
        const { error: updateError } = await authClient.organization.update({
          organizationId: organization.id,
          data: {
            name, // Keep name in data for update, as it's part of the organization object
            metadata: {
              industry: industries,
              modules: selectedModules
            }
          }
        });

        if (updateError) throw new Error(updateError.message);

        authClient.organization.setActive({ organizationId: organization.id });
        navigate(`/${organization.id}`);
      }

    } catch (err: any) {
      setError(err.message || 'Erro ao criar organização. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 p-8 sm:p-12 lg:p-24 overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto space-y-10 relative">
        {/* Back Button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all flex items-center gap-2 text-sm font-medium w-fit mb-4"
        >
          <ArrowLeft size={20} />
          <span>Voltar para organizações</span>
        </button>

        <div className="space-y-12">
          <div className="text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Building2 size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight">Setup da Empresa</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-4 text-zinc-900 dark:text-zinc-50 leading-tight">Boas-vindas ao DeskReport</h1>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-lg mx-auto sm:mx-0">
              Para começar, vamos configurar o espaço de trabalho da sua empresa na plataforma da forma mais rápida possível.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12 bg-white/50 dark:bg-transparent backdrop-blur-sm -mx-4 px-4 sm:mx-0 sm:px-0">
            {error && (
              <div className="p-4 text-sm text-red-600 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <h2 className="text-sm font-black  text-zinc-400 tracking-widest uppercase">1. Informações Básicas</h2>
              <div className="grid grid-cols-1 gap-8">
                <label className="block group">
                  <span className="block mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 group-focus-within:text-blue-600 transition-colors">
                    Nome da Empresa
                  </span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="px-0 py-3 bg-transparent border-b-2 border-zinc-200 dark:border-zinc-800 w-full outline-none focus:border-blue-600 transition-all text-xl font-medium placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                    type="text"
                    placeholder="Ex: Acme Solutions"
                  />
                </label>

                <div className="space-y-4">
                  <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    Ramo de Atuação
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {INDUSTRIES.map(ind => {
                      const isSelected = industries.includes(ind);
                      return (
                        <button
                          key={ind}
                          type="button"
                          onClick={() => {
                            setIndustries(prev =>
                              prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]
                            );
                          }}
                          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/30 -translate-y-0.5'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                            }`}
                        >
                          {ind}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6 pt-6">
              <h2 className="text-sm font-black  text-zinc-400 tracking-widest uppercase">2. Módulos Utilizados</h2>
              <p className="text-sm text-zinc-500">
                Selecione os módulos que sua equipe irá utilizar agora.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MODULES.map(module => {
                  const isSelected = selectedModules.includes(module.id);
                  return (
                    <div
                      key={module.id}
                      onClick={() => toggleModule(module.id)}
                      className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${isSelected
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-500/10 shadow-lg shadow-blue-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex flex-col gap-3">
                          <span className={`p-3 rounded-xl w-fit ${isSelected ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                            {module.icon}
                          </span>
                          <span className={`font-bold text-sm leading-tight ${isSelected ? 'text-blue-900 dark:text-blue-100' : 'text-zinc-700 dark:text-zinc-300'}`}>
                            {module.name}
                          </span>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-blue-500 bg-blue-500 scale-110' : 'border-zinc-300 dark:border-zinc-700 scale-100'
                          }`}>
                          {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-10 flex items-center justify-end">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto px-10 py-7 text-lg rounded-2xl group gap-3 shadow-2xl shadow-blue-500/20">
                {loading ? 'Salvando...' : 'Concluir Setup'}
                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
