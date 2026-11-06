import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { habilitarMocks } from './mocks/habilitar'
import './styles/index.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Root element not found')

// No backend in this stage: MSW answers the API. Set VITE_USE_MOCKS=false to turn it off.
void habilitarMocks().then(() => {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
