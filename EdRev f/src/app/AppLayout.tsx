/*
 * AppLayout — shell for every screen except access: side panel, top bar, main landmark and
 * skip link. On small screens the side panel opens from «Menú» (RNF-10). data-revista on the root rewrites the journal CSS variables; only the top bar and
 * ISSN pill consume them. When printed (for example the report saved as PDF) only the content shows. Covers: RF-02, RNF-11 (skip link, landmarks).
 */
import { Outlet, useLocation } from 'react-router-dom'
import { useRevistaOpcional } from '@/lib/revista/useRevista'
import { EncabezadoComun } from '@/components/common/EncabezadoComun'
import { EncabezadoRevista } from '@/components/common/EncabezadoRevista'
import { MenuMovil } from '@/components/common/MenuMovil'
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

  const panel = {
    revistaActiva: revista,
    rutaActual: pathname,
    usuario: { nombre: usuario.nombre, perfil: ETIQUETA_PERFIL[usuario.perfil] },
    onCerrarSesion: () => cerrarSesion('manual'),
    mostrarAdministracion: puede(usuario.perfil, 'administrar'),
  }

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
      <PanelLateral {...panel} className="hidden lg:flex print:hidden" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center border-b border-borde-base bg-superficie-tarjeta px-2 py-1 lg:hidden print:hidden">
          <MenuMovil ruta={pathname}>
            <PanelLateral {...panel} className="h-full" />
          </MenuMovil>
        </div>
        <div className="print:hidden">
          {revista ? <EncabezadoRevista revista={revista} /> : <EncabezadoComun />}
        </div>
        <main id="contenido" tabIndex={-1} className="flex-1 p-4 sm:p-6 print:p-0">
          <Outlet />
        </main>
      </div>
      <div className="print:hidden">
        <SelectorUsuarioDemo />
      </div>
    </div>
  )
}
