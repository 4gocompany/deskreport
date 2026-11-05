import { Outlet, useParams } from 'react-router-dom';
import { Navbar } from './navbar';
import { InternalChatSidebar } from './internal-chat-sidebar';
import { useEffect } from 'react';
import { useAgentsSocket } from '../../pages/tasks/use-agents';

export function Layout() {
  const { company_id } = useParams();
  useAgentsSocket(company_id || '');

  useEffect(() => {
    if (window) {
      Notification.requestPermission().then((result) => {
        console.log('Notifications', result);
      });
    }
  }, []);

  return (
    <main className='flex min-h-screen overflow-hidden'>
      <Navbar />
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
      <InternalChatSidebar />
    </main>
  );
}
