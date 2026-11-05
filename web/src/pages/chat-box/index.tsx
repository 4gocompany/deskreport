import { Settings, Send, Smile, Paperclip, Search } from 'lucide-react';
import customers from '../../api/customers.json';
import { Message } from '../../components/chat/message';
import { useParams, NavLink } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';
import { ContactCard } from '../../components/chat/contact-card';
import { Topbar } from '../../components/layout/topbar';
import { Page } from '../../components/layout/page';
import type { Contact } from '../../models/contact';

export default function ChatBox() {
  const params = useParams();
  const { companyUrl } = useTenant();
  const activeChatId = params['chatid'];

  const navigation = [
    { name: 'Conversas', to: companyUrl('chat/conversations') },
  ]

  function displayCustomerFromActiveChatId(): Contact | undefined {
    if (!activeChatId) return;
    return customers.data.filter((customer) => activeChatId === customer.id.toString())[0];
  }

  return (
    <Page navigation={navigation}>
      <Topbar title='Conversas' inputSearch='off' />

      <div className='flex h-[calc(100vh-68px)] overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50 transition-colors'>
        {/* Sidebar de Contatos */}
        <div className='w-80 border-r border-zinc-200 dark:border-zinc-800 flex flex-col bg-white dark:bg-zinc-950 transition-colors'>
          <div className='p-4 border-b border-zinc-100 dark:border-zinc-800'>
            <div className='relative flex items-center'>
              <Search className='absolute ml-3 text-zinc-400' size={14} />
              <input
                className='w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 pl-9 py-2 rounded-md text-xs outline-none focus:bg-white dark:focus:bg-zinc-900 transition-all'
                type='text'
                placeholder='Pesquisar conversas...'
              />
            </div>
          </div>
          <div className='flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800'>
            <div className='p-2 space-y-0.5'>
              {customers.data.map((customer) => (
                <NavLink
                  to={companyUrl('chat/conversations/' + customer.id)}
                  key={customer.id}
                  className={({ isActive }) =>
                    `flex items-center gap-3 py-3 px-3 rounded-lg transition-all border border-transparent ${isActive
                      ? 'bg-zinc-100/80 dark:bg-zinc-900 border-zinc-200/50 dark:border-zinc-800'
                      : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`
                  }
                >
                  <div className='relative flex-shrink-0'>
                    <img className='rounded-full bg-zinc-100 dark:bg-zinc-800' width={40} height={40} src={customer.avatar} />
                    <div className='absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-zinc-900 rounded-full'></div>
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center justify-between mb-0.5'>
                      <span className='font-medium text-[13px] truncate text-zinc-900 dark:text-zinc-100'>{customer.first_name + ' ' + customer.last_name}</span>
                      <span className='text-[10px] text-zinc-400'>12:30</span>
                    </div>
                    <p className='text-xs text-zinc-400 truncate font-normal'>Última mensagem enviada aqui...</p>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {/* Área do Chat */}
        {activeChatId ? (
          <div className='flex-1 flex flex-col relative bg-white dark:bg-zinc-950 transition-colors'>
            {/* Cabeçalho Interno do Chat */}
            <div className='h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-white dark:bg-zinc-950 flex-shrink-0 z-10'>
              <ContactCard data={displayCustomerFromActiveChatId()} />
              <div className='flex items-center gap-1'>
                <button className='p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors group' title="Pesquisar nesta conversa">
                  <Search size={18} />
                </button>
                <button className='p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors' title="Configurações do Chat">
                  <Settings size={18} />
                </button>
              </div>
            </div>

            <div className='flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30'>
              <Message type="text" content="Olá, tudo bem? Preciso de uma ajuda com o meu pedido." timestamp="12:30" />
              <Message type="audio" timestamp="12:31" />
              <Message type="text" isMine content="Com certeza! Pode me informar o número do pedido?" timestamp="12:32" />
              <Message type="image" timestamp="12:33" mediaUrl="https://images.unsplash.com/photo-1586769852836-bc069f19e1b6?w=800&auto=format&fit=crop&q=60" />
              <Message type="document" fileName="Comprovante_Pagamento.pdf" fileSize="450 KB" timestamp="12:34" />
              <Message type="text" isMine content="Obrigado! Já estou verificando aqui no sistema." timestamp="12:35" />
            </div>

            {/* Input modernizado */}
            <div className='p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800'>
              <div className='max-w-4xl mx-auto'>
                <form className='relative flex items-end gap-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 focus-within:ring-2 focus-within:ring-zinc-100 dark:focus-within:ring-zinc-900 transition-all'>
                  <div className='flex items-center pb-1 pl-1'>
                    <button type='button' className='p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg transition-colors'>
                      <Paperclip size={20} />
                    </button>
                  </div>

                  <textarea
                    rows={1}
                    className='flex-1 max-h-48 py-3 px-2 bg-transparent outline-none text-[14px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-none font-normal'
                    placeholder='Escreva sua mensagem...'
                  />

                  <div className='flex items-center gap-1 pb-1 pr-1'>
                    <button type='button' className='p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 rounded-lg transition-colors'>
                      <Smile size={20} />
                    </button>
                    <button type='submit' className='bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 p-2.5 rounded-lg hover:opacity-90 transition-opacity'>
                      <Send size={18} fill='currentColor' />
                    </button>
                  </div>
                </form>
                <div className='mt-2 flex items-center justify-center gap-4 text-[10px] text-zinc-400 font-medium'>
                  <span>Pressione <kbd className='px-1 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-sans'>Enter</kbd> para enviar</span>
                  <span className='w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700'></span>
                  <span>Shift + Enter para nova linha</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className='flex-1 flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 transition-colors'>
            <div className='w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mb-4 text-zinc-300 dark:text-zinc-700'>
              <Send size={32} />
            </div>
            <h3 className='text-zinc-900 dark:text-zinc-100 font-semibold'>Suas conversas</h3>
            <p className='text-sm text-zinc-500 mt-1'>Selecione um contato para começar a atender.</p>
          </div>
        )}
      </div>
    </Page>
  );
}
