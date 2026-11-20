import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { habilitarMocks } from './mocks/habilitar'
import './styles/index.css'

const raiz = document.getElementById('root')
if (!raiz) throw new Error('Root element not found')

// Con VITE_USE_MOCKS distinto de «false», MSW responde la API con datos de ejemplo (sin backend). En producción se apaga.
void habilitarMocks().then(() => {
  createRoot(raiz).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
