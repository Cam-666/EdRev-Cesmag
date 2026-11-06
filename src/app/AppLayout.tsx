/*
 * AppLayout — shell for every screen except access: side panel, top bar, main landmark and
 * skip link. data-revista on the root rewrites the journal CSS variables; only the top bar and
 * ISSN pill consume them. Covers: RF-02, RNF-11 (skip link, landmarks).
 */
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { DestinoAcciones } from './DestinoAcciones'
import { useRevistaOpcional } from './useRevista'
import { EncabezadoComun } from '@/design-system/EncabezadoComun'
import { EncabezadoRevista } from '@/design-system/EncabezadoRevista'
import { PanelLateral } from '@/design-system/PanelLateral'

// TODO(phase 3): replace with the real session (user selector in the mock, decision 12).
const USUARIO_TEMPORAL = { nombre: 'Ma. Camila Mendoza', perfil: 'Administradora' }

export function AppLayout() {
  const contexto = useRevistaOpcional()
  const revista = contexto?.revista ?? null
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [destino, setDestino] = useState<HTMLElement | null>(null)

  const acciones = <div ref={setDestino} className="flex items-center gap-2" />

  return (
    <div data-revista={revista ?? undefined} className="flex min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-superficie-tarjeta focus:px-4 focus:py-2 focus:text-texto-enlace"
      >
        Saltar al contenido
      </a>
      <PanelLateral
        revistaActiva={revista}
        rutaActual={pathname}
        usuario={USUARIO_TEMPORAL}
        onAbrirRevista={(r) => navigate(`/${r}/tablero`)}
        onCerrarSesion={() => navigate('/acceso')}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {revista ? (
          <EncabezadoRevista revista={revista} acciones={acciones} />
        ) : (
          <EncabezadoComun acciones={acciones} />
        )}
        <main id="contenido" tabIndex={-1} className="flex-1 p-6">
          <DestinoAcciones.Provider value={destino}>
            <Outlet />
          </DestinoAcciones.Provider>
        </main>
      </div>
    </div>
  )
}
