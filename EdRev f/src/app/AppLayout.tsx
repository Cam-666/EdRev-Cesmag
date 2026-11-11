/*
 * AppLayout — shell for every screen except access: side panel, top bar, main landmark and
 * skip link. data-revista on the root rewrites the journal CSS variables; only the top bar and
 * ISSN pill consume them. Covers: RF-02, RNF-11 (skip link, landmarks).
 */
import { Outlet, useLocation } from 'react-router-dom'
import { useRevistaOpcional } from '@/lib/revista/useRevista'
import { EncabezadoComun } from '@/components/common/EncabezadoComun'
import { EncabezadoRevista } from '@/components/common/EncabezadoRevista'
import { PanelLateral } from '@/components/common/PanelLateral'
import { SelectorUsuarioDemo } from '@/modules/acceso/components/SelectorUsuarioDemo'
import { puede } from '@/modules/acceso/config/permisos'
import { POLITICA_ACCESO } from '@/modules/acceso/config/politicaAcceso'
import { useCierrePorInactividad } from '@/modules/acceso/hooks/useCierrePorInactividad'
import { useSesion, useUsuarioActual } from '@/modules/acceso/hooks/useSesion'
import { ETIQUETA_PERFIL } from '@/types/usuario'

export function AppLayout() {
  const contexto = useRevistaOpcional()
  const revista = contexto?.revista ?? null
  const { pathname } = useLocation()
  const usuario = useUsuarioActual()
  const { cerrarSesion } = useSesion()

  // RNF-05: the session closes after a period of inactivity.
  useCierrePorInactividad(POLITICA_ACCESO.inactividadMinutos, () => cerrarSesion('inactividad'))

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
        usuario={{ nombre: usuario.nombre, perfil: ETIQUETA_PERFIL[usuario.perfil] }}
        onCerrarSesion={() => cerrarSesion('manual')}
        mostrarAdministracion={puede(usuario.perfil, 'administrar')}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {revista ? <EncabezadoRevista revista={revista} /> : <EncabezadoComun />}
        <main id="contenido" tabIndex={-1} className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
      <SelectorUsuarioDemo />
    </div>
  )
}
