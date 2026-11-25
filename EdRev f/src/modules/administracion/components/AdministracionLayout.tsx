/*
 * AdministracionLayout — «Administración del sistema» con pestañas enrutadas (Usuarios, Plantillas,
 * Auditoría, Configuración). La pestaña Usuarios solo la ve la Administradora; las auxiliares ven las otras tres.
 */
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Pestanas } from '@/components/common/Pestanas'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'

const BASE = '/administracion'
const VALORES = ['usuarios', 'plantillas', 'auditoria', 'configuracion'] as const

/** /administracion abre la primera pestaña que la persona puede ver. */
export function InicioAdministracion() {
  const usuarios = usePermiso('administrar-usuarios')
  return <Navigate to={`${BASE}/${usuarios ? 'usuarios' : 'plantillas'}`} replace />
}

export function AdministracionLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const verUsuarios = usePermiso('administrar-usuarios')
  const actual =
    VALORES.find((v) => pathname.startsWith(`${BASE}/${v}`)) ??
    (verUsuarios ? 'usuarios' : 'plantillas')
  const panel = <Outlet />
  // Una auxiliar que llega a la dirección de Usuarios (por un enlace guardado) pasa a Plantillas.
  if (actual === 'usuarios' && !verUsuarios) return <Navigate to={`${BASE}/plantillas`} replace />

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-titulo-24">Administración del sistema</h1>
      <Pestanas
        etiqueta="Secciones de administración"
        valor={actual}
        onCambio={(v) => navigate(`${BASE}/${v}`)}
        pestanas={[
          ...(verUsuarios ? [{ valor: 'usuarios', etiqueta: 'Usuarios', contenido: panel }] : []),
          { valor: 'plantillas', etiqueta: 'Plantillas', contenido: panel },
          { valor: 'auditoria', etiqueta: 'Auditoría', contenido: panel },
          { valor: 'configuracion', etiqueta: 'Configuración', contenido: panel },
        ]}
      />
    </div>
  )
}
