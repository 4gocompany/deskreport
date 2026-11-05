import { Plus, Bot, Play, Pause, Edit2, Trash2, MoreHorizontal, Zap } from 'lucide-react';
import { Page } from '../../components/layout/page';
import { Topbar } from '../../components/layout/topbar';
import { NavLink } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';
import { Button, buttonVariants } from '../../components/ui/button';

export default function BotList() {
  const { companyUrl } = useTenant();

  const navigation = [
    { name: 'Modelos de mensagens', to: companyUrl('automation/templates') },
    { name: 'Mensagens automáticas', to: companyUrl('automation/flow') },
    { name: 'Construtor de Bots', to: companyUrl('automation/list') },
  ];

  const bots = [
    {
      id: 1,
      name: 'Atendimento Cortex',
      description: 'Fluxo principal de triagem com IA para suporte e vendas.',
      active: true,
      nodes: 12,
      runs: '1.2k',
      lastUpdate: 'há 2 horas'
    },
    {
      id: 2,
      name: 'Pesquisa CSAT',
      description: 'Coleta de feedback após finalização de atendimento.',
      active: true,
      nodes: 5,
      runs: '850',
      lastUpdate: 'há 1 dia'
    },
    {
      id: 3,
      name: 'Lead Gen Imobiliário',
      description: 'Captação de leads qualificados para o setor comercial.',
      active: false,
      nodes: 8,
      runs: '430',
      lastUpdate: 'há 3 dias'
    }
  ];

  return (
    <Page navigation={navigation}>
      <Topbar title='Automações' inputSearch='off' />

      <div className='flex-1 p-8 overflow-auto transition-colors'>
        <div className='max-w-6xl mx-auto'>
          <div className='flex items-center justify-between mb-8'>
            <div>
              <h2 className='text-2xl font-bold text-zinc-900 dark:text-zinc-100'>Seus Bots</h2>
              <p className='text-zinc-500 dark:text-zinc-400 mt-1'>Crie e gerencie fluxos de conversação inteligentes.</p>
            </div>
            <NavLink
              to={companyUrl('automation/builder/new')}
              className={buttonVariants('primary', 'md', 'gap-2')}
            >
              <Plus size={18} />
              Novo Bot
            </NavLink>
          </div>

          <div className='grid grid-cols-1 gap-4'>
            {bots.map((bot) => (
              <div key={bot.id} className='bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 transition-all group flex items-center justify-between'>
                <div className='flex items-center gap-6'>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${bot.active ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800'}`}>
                    <Bot size={32} />
                  </div>
                  <div>
                    <div className='flex items-center gap-3 mb-1'>
                      <h3 className='font-bold text-zinc-900 dark:text-zinc-100 text-lg'>{bot.name}</h3>
                      {bot.active ? (
                        <span className='px-2 py-0.5 bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 text-[10px] font-black rounded'>Ativo</span>
                      ) : (
                        <span className='px-2 py-0.5 bg-zinc-100 text-zinc-400 dark:bg-zinc-800 text-[10px] font-black rounded'>Pausado</span>
                      )}
                    </div>
                    <p className='text-sm text-zinc-500 dark:text-zinc-400 max-w-md'>{bot.description}</p>

                    <div className='flex items-center gap-6 mt-4'>
                      <div className='flex items-center gap-1.5 text-xs text-zinc-400 font-medium'>
                        <Zap size={14} className='text-amber-500' />
                        {bot.runs} execuções
                      </div>
                      <div className='flex items-center gap-1.5 text-xs text-zinc-400 font-medium'>
                        <Edit2 size={14} />
                        {bot.nodes} blocos
                      </div>
                      <div className='flex items-center gap-1.5 text-xs text-zinc-400 font-medium'>
                        {bot.lastUpdate}
                      </div>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-1.5'>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-10 w-10 ${bot.active ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                  >
                    {bot.active ? <Pause size={20} fill='currentColor' /> : <Play size={20} fill='currentColor' />}
                  </Button>
                  <NavLink
                    to={companyUrl('automation/builder/' + bot.id)}
                    className={buttonVariants('ghost', 'icon', 'h-10 w-10 text-zinc-500')}
                  >
                    <Edit2 size={20} />
                  </NavLink>
                  <Button size="icon" variant="ghost" className='h-10 w-10 text-zinc-500'>
                    <Trash2 size={20} />
                  </Button>
                  <div className='w-px h-8 bg-zinc-100 dark:bg-zinc-800 mx-1'></div>
                  <Button size="icon" variant="ghost" className='h-10 w-10 text-zinc-500'>
                    <MoreHorizontal size={20} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className='mt-8 flex items-center justify-center p-12 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl'>
            <div className='text-center'>
              <div className='w-16 h-16 bg-white dark:bg-neutral-900 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-100 dark:border-neutral-800'>
                <Plus size={32} className='text-neutral-400' />
              </div>
              <h4 className='text-zinc-900 dark:text-zinc-100 font-bold'>Criar novo bot do zero</h4>
              <p className='text-zinc-500 text-sm mt-1 max-w-xs'>Comece a automatizar sua operação com inteligência artificial hoje mesmo.</p>
              <NavLink
                to={companyUrl('automation/builder/new')}
                className='mt-6 inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline'
              >
                Iniciar agora
              </NavLink>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
