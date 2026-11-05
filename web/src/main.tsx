import React from 'react'
import ReactDOM from 'react-dom/client'
// import App from './app/index.tsx'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './router.tsx'

import { ThemeProvider } from './components/theme-provider.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  </React.StrictMode>,
)
