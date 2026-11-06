/*
 * FichaArticuloLayout — article sheet shell: title + five routed tabs (Resumen, Autores,
 * Pares y evaluación, Observaciones, Historial). Each datum appears in a single tab.
 * Covers: RF-36, HU-26 (criterion 3).
 */
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useRevista } from '@/app/useRevista'
import { Pestanas } from '@/design-system/Pestanas'

const SEGMENTOS = ['autores', 'pares', 'observaciones', 'historial'] as const

function pestanaActiva(pathname: string, base: string): string {
  const resto = pathname.slice(base.length).split('/').filter(Boolean)[0]
  return SEGMENTOS.find((s) => s === resto) ?? 'resumen'
}

export function FichaArticuloLayout() {
  const { revista } = useRevista()
  const { id = '' } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const base = `/${revista}/articulos/${id}`

  const panel = <Outlet />
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-titulo-24">Artículo {id}</h1>
      <Pestanas
        etiqueta="Secciones del artículo"
        valor={pestanaActiva(pathname, base)}
        onCambio={(v) => navigate(v === 'resumen' ? base : `${base}/${v}`)}
        pestanas={[
          { valor: 'resumen', etiqueta: 'Resumen', contenido: panel },
          { valor: 'autores', etiqueta: 'Autores', contenido: panel },
          { valor: 'pares', etiqueta: 'Pares y evaluación', contenido: panel },
          { valor: 'observaciones', etiqueta: 'Observaciones', contenido: panel },
          { valor: 'historial', etiqueta: 'Historial', contenido: panel },
        ]}
      />
    </div>
  )
}
