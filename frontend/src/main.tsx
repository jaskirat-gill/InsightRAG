import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import Landing from './pages/Landing'
import Docs from './pages/Docs'
import { MotionProvider } from '@/components/ui/animate'
import './index.css'

const pathname = window.location.pathname
const isLandingPage = pathname === '/landing'
const isDocsPage = pathname === '/docs'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MotionProvider>
      {isLandingPage ? <Landing /> : isDocsPage ? <Docs /> : <App />}
    </MotionProvider>
  </React.StrictMode>,
)
