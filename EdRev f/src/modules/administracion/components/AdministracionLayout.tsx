/*
 * AdministracionLayout — "Administración del sistema" with routed tabs
 * (Usuarios, Plantillas, Auditoría). Migration is out of scope in this version.
 * Covers: RF-40, RF-41, RNF-19, RNF-05, HU-29, HU-30.
 */
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Pestanas } from '@/components/common/Pestanas'

const BASE = '/administracion'
const VALORES = ['usuarios', 'plantillas', 'auditoria'] as const

export function AdministracionLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const actual = VALORES.find((v) => pathname.startsWith(`${BASE}/${v}`)) ?? 'usuarios'
  const panel = <Outlet />

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-titulo-24">Administración del sistema</h1>
      <Pestanas
        etiqueta="Secciones de administración"
        valor={actual}
        onCambio={(v) => navigate(`${BASE}/${v}`)}
        pestanas={[
          { valor: 'usuarios', etiqueta: 'Usuarios', contenido: panel },
          { valor: 'plantillas', etiqueta: 'Plantillas', contenido: panel },
          { valor: 'auditoria', etiqueta: 'Auditoría', contenido: panel },
        ]}
      />
    </div>
  )
}
