import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Landing from './pages/Landing'
import { MotionProvider } from '@/components/ui/animate'
import './index.css'

const isLandingPage = window.location.pathname === '/landing'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MotionProvider>
      {isLandingPage ? <Landing /> : <App />}
    </MotionProvider>
  </React.StrictMode>,
)
