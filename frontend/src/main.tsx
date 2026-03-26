import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { MotionProvider } from '@/components/ui/animate'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <MotionProvider>
      <App />
    </MotionProvider>
  </React.StrictMode>,
)
