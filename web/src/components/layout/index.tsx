import { Outlet } from 'react-router-dom';
import { Navbar } from './navbar';
import { useEffect } from 'react';

export function Layout() {
  useEffect(() => {
    if (window) {
      Notification.requestPermission().then((result) => {
        console.log('Notifications', result);
      });
    }
  }, []);

  return (
    <main className='flex min-h-screen'>
      <Navbar />
      <Outlet />
    </main>
  );
}
