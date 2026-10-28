import { createBrowserRouter, redirect } from 'react-router-dom';
import ChatBox from './pages/chat-box';
import App from './pages/resume';
import { Login } from './pages/auth/login';
import { Layout } from './components/layout';
import Settings from './pages/settings';
import { Reports } from './pages/reports';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <App />,
      },
      {
        path: '/chat',
        loader: () => redirect('/chat/all'),
      },
      {
        path: '/chat/:option',
        element: <ChatBox />,
      },
      {
        path: '/chat/:option/:chatid',
        element: <ChatBox />,
      },
      {
        path: '/reports',
        loader: () => redirect('/reports/all'),
      },
      {
        path: '/reports/:option',
        element: <Reports />,
      },
      {
        path: '/reports/:option/:report_id',
        element: <Reports />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
    ],
  },
]);
