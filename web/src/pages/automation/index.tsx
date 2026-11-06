import { Zap, Plus, Settings2, Power, MoreVertical, Clock, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { useTenant } from '../../hooks/useTenant';
import { Button } from '../../components/ui/button';

export default function AutoMessages() {
  const { companyUrl } = useTenant();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Modelos de mensagens', to: companyUrl('automation/templates') },
    { name: 'Mensagens automáticas', to: companyUrl('automation/flow') },
    { name: 'Construtor de Bots', to: companyUrl('automation/list') },
  ];

  const automations = [
    { id: 1, name: 'Resposta Fora de Horário', trigger: 'Sábado e Domingo', action: 'Enviar mensagem de ausência', active: true },
    { id: 2, name: 'Boas-vindas WhatsApp', trigger: 'Novo contato via WhatsApp', action: 'Enviar menu inicial', active: true },
    { id: 3, name: 'Pesquisa de Satisfação', trigger: 'Chat finalizado', action: 'Aguardar 10 min e enviar CSAT', active: false },
    { id: 4, name: 'Reengajamento', trigger: 'Inatividade por 24h', action: 'Enviar lembrete de pendência', active: true },
  ];

  return (
    <Page navigation={navigation}>
      <Topbar title='Automações' inputSearch='off' />

      <div className='flex-1 p-6 overflow-auto transition-colors'>
        <div className='max-w-6xl mx-auto space-y-6'>
          <div className='flex items-center justify-between'>
            <div>
              <h2 className='text-xl font-semibold text-zinc-900 dark:text-zinc-100'>Automações</h2>
              <p className='text-sm text-zinc-500 dark:text-zinc-400 mt-1'>Configure gatilhos e respostas automáticas para seus canais.</p>
            </div>
            <Button size="md" className='gap-2'>
              <Plus size={18} />
              Criar Automação
            </Button>
          </div>

          <div className='space-y-3'>
            {automations.map((automation) => (
              <div key={automation.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-xl shadow-sm flex items-center justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group'>
                <div className='flex items-center gap-4'>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${automation.active ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                    <Zap size={24} fill={automation.active ? 'currentColor' : 'none'} />
                  </div>
                  <div>
                    <h3 className='font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2'>
                      {automation.name}
                      {!automation.active && <span className='text-xs bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400'>Pausado</span>}
                    </h3>
                    <div className='flex items-center gap-4 mt-1'>
                      <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                        <Clock size={14} />
                        Trigger: {automation.trigger}
                      </div>
                      <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
                        <MessageSquare size={14} />
                        Ação: {automation.action}
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-1.5'>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={automation.active ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-zinc-400'}
                  >
                    <Power size={18} />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <Settings2 size={18} />
                  </Button>
                  <Button size="icon" variant="ghost">
                    <MoreVertical size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className='p-5 bg-zinc-900 dark:bg-zinc-900 border border-zinc-800 rounded-xl relative overflow-hidden'>
            <div className='relative z-10'>
              <h3 className='text-white font-semibold text-base mb-2'>Precisa de uma automação complexa?</h3>
              <p className='text-zinc-400 text-sm max-w-md mb-4'>Integre com Webhooks ou utilize nosso construtor de Chatbots para fluxos avançados de atendimento.</p>
              <Button variant="secondary" size="md" onClick={() => navigate(companyUrl('automation/list'))}>
                Ver construtor de Robôs
              </Button>
            </div>
            <Zap size={140} className='absolute -right-4 -bottom-8 text-zinc-800/40 transform -rotate-12' />
          </div>
        </div>
      </div>
    </Page>
  );
}
