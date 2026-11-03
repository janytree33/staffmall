import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './styles/tokens.css'
import App from './App.jsx'
import { syncSession } from './lib/auth'

// 정식 로그인 세션을 먼저 확인한 뒤 화면을 그림 (계획서 02 · 4-2)
syncSession().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
})
