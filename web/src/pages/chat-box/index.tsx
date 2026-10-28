import { useEffect, useState } from 'react';
import { Settings, Send, Smile, Paperclip, ChevronUp, ChevronDown, Search } from 'lucide-react';

import customers from '../../api/customers.json';
import { Message } from '../../components/chat/message';

import { useParams, NavLink } from 'react-router-dom';
import { ContactCard } from '../../components/chat/contact-card';
import { Topbar } from '../../components/layout/topbar';
import { Page } from '../../components/layout/page';
import type { Contact } from '../../models/contact';

export default function ChatBox() {
  const inputBoxHeight = 100;
  const [targetHeight, setTargetHeight] = useState(inputBoxHeight);
  const [scrollHeight, setScrollHeight] = useState(0);

  const params = useParams();
  const activeChatId = params['chatid'];
  const activeOption = params['option'];

  const navigation = [
    { name: 'Todas', to: '/chat/all' },
    { name: 'Em espera', to: '/chat/await' },
    { name: 'Finalizadas', to: '/chat/finalized' },
    { name: 'Spam', to: '/chat/spam' },
  ]

  useEffect(() => {
    if (window !== undefined) {
      navigator.requestMediaKeySystemAccess
      window.addEventListener('resize', () => {
        setScrollHeightOnLoad(window.innerHeight);
        return;
      });
      setScrollHeightOnLoad(window.innerHeight);
    }
  }, [params]);

  function setScrollHeightOnLoad(windowSize: number) {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) setScrollHeight(windowSize - toolbar.clientHeight);
    window.removeEventListener('resize', () => { });
  }

  function handleApplyTargetHeight() {
    if (targetHeight === scrollHeight - inputBoxHeight) return setTargetHeight(inputBoxHeight);
    setTargetHeight(scrollHeight - inputBoxHeight);
  }

  function displayCustomerFromActiveChatId(): Contact | undefined {
    if (!activeChatId) return;
    return customers.data.filter((customer) => activeChatId === customer.id.toString())[0];
  }

  return (
    <Page navigation={navigation}>
      <Topbar
        title='Conversas'
        toolbarOptions={
          activeChatId ? <>
            <div className='relative flex items-center'>
              <Search className='absolute ml-2.5 pointer-events-none' size={16} />
              <input
                className='cursor-pointer focus:cursor-text transition-all w-0 focus:w-[320px] bg-neutral-950 focus:bg-neutral-800 hover:bg-neutral-800 pl-9 py-2 rounded-lg text-sm outline-none ring-1 ring-transparent focus:ring-indigo-400'
                type='text'
                placeholder='Procurar mensagens'
              />
            </div>
            <button className='flex items-center gap-1 px-3 py-2 text-sm bg-transparent hover:bg-neutral-800 rounded-lg focus:bg-neutral-900'>
              <Settings className='' size={16} />
              <span>Preferências</span>
            </button>
          </> : null
        }
      >
        <ContactCard data={displayCustomerFromActiveChatId()} />
      </Topbar>
      <div className='flex px-10'>
        <div className='min-w-[260px] border-r border-neutral-900'>
          <div
            style={{ height: scrollHeight + 'px' }}
            className='overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-neutral-900 py-4 space-y-2 w-full text-sm'
          >
            {customers.data.map((customer) => (
              <NavLink
                to={'/chat/' + activeOption + '/' + customer.id}
                key={customer.id}
                className={`${activeChatId === customer.id.toString() ? 'bg-neutral-900 text-indigo-500' : ''
                  } max-w-[260px] flex items-center gap-3 py-2 px-4 hover:bg-neutral-800 rounded-lg`}
              >
                <img className='rounded-full bg-indigo-400' width={32} height={32} src={customer.avatar} />
                <span className='truncate'>{customer.first_name + ' ' + customer.last_name}</span>
              </NavLink>
            ))}
          </div>
        </div>
        {activeChatId ? (
          <div className='flex-1 ml-10 -mr-10'>
            <div
              style={{ height: scrollHeight + 'px' }}
              className='overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-800 scrollbar-track-neutral-900 w-full overflow-hidden pr-10'
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reverse().map((item) => (
                <Message key={item} />
              ))}
              <div style={{ height: targetHeight }} className='mt-10 transition-all flex flex-col sticky rounded-t-2xl bottom-0 bg-neutral-900 pt-1 px-5 pb-4'>
                <button
                  onClick={handleApplyTargetHeight}
                  draggable
                  className='mx-auto opacity-50 hover:opacity-100 rounded-full hover:bg-neutral-800 px-10 mb-1'
                >
                  {targetHeight <= 100 ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                <form className='flex-1 p-3 flex items-start rounded-lg bg-neutral-800'>
                  <textarea
                    style={{ height: targetHeight <= 100 ? '40px' : '100%' }}
                    className='scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800 resize-none flex-1 bg-transparent outline-none pl-3 py-2 border-r mr-2 border-neutral-700/50'
                    placeholder='Mensagem...'
                  />
                  <div className={targetHeight <= 100 ? '' : 'flex flex-col-reverse items-center gap-2'}>
                    <button type='button' className='bg-transparent rounded-lg p-2.5 opacity-50 hover:opacity-100 hover:bg-neutral-700'>
                      <Smile size={20} />
                    </button>
                    <button type='button' className='mx-1 bg-transparent rounded-lg p-2.5 opacity-50 hover:opacity-100 hover:bg-neutral-700'>
                      <Paperclip size={20} />
                    </button>
                    <button type='submit' className='bg-indigo-600 rounded-lg p-2.5 hover:bg-indigo-500'>
                      <Send size={20} />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        ) : <div className='flex-1 flex items-center justify-center'>
          <img src='/svg/empty-chat.svg' />
        </div>}
      </div>
    </Page>
  );
}
