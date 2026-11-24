/*
 * FichaArticuloLayout — marco de la ficha del artículo: encabezado y cinco pestañas enrutadas (Resumen, Revisión
 * del comité, Autores, Pares y evaluación, Historial de correos y cambios). «Cambiar de revista» se ofrece en
 * cualquier etapa del artículo. Cada dato aparece en una sola pestaña. Carga el artículo una vez y se lo entrega
 * a las pestañas mediante el contexto del outlet.
 */
import { BotonVolver } from '@/components/common/BotonVolver'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { AvisoResultadoPares } from './AvisoResultadoPares'
import { CambiarRevistaModal } from './CambiarRevistaModal'
import { CerrarProcesoModal } from './CerrarProcesoModal'
import { EditarArticuloModal } from './EditarArticuloModal'
import { EncabezadoFicha } from './EncabezadoFicha'
import { useArticulo } from '../hooks/useArticulo'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EnlaceBoton } from '@/components/common/EnlaceBoton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { Pestanas } from '@/components/common/Pestanas'
import { ErrorApi } from '@/lib/api/cliente'
import { requiereNuevaRevision } from '@/lib/dominio/comite'
import { useRevista } from '@/lib/revista/useRevista'
import type { EstadoArticulo } from '@/types/articulo'

/** Estados cuyo proceso sigue abierto. */
const ABIERTOS: readonly EstadoArticulo[] = ['postulado', 'en-revision', 'en-evaluacion']

const SEGMENTOS = ['comite', 'autores', 'pares', 'historial'] as const

function pestanaActiva(pathname: string, base: string): string {
  const resto = pathname.slice(base.length).split('/').filter(Boolean)[0]
  return SEGMENTOS.find((s) => s === resto) ?? 'resumen'
}

export function FichaArticuloLayout() {
  const { revista } = useRevista()
  const { id = '' } = useParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const consulta = useArticulo(id)
  const puedeEditar = usePermiso('registrar-datos')
  const puedeCambiar = usePermiso('registrar-revision')
  const [editando, setEditando] = useState(false)
  const [cambiando, setCambiando] = useState(false)
  const puedeCerrar = usePermiso('cerrar-articulo')
  const [cerrando, setCerrando] = useState(false)
  const base = `/${revista}/articulos/${encodeURIComponent(id)}`

  if (consulta.error instanceof ErrorApi && consulta.error.estado === 404) {
    return (
      <section className="flex flex-col gap-4">
        <h1 className="text-titulo-24">Artículo no encontrado</h1>
        <Alerta
          tipo="advertencia"
          accion={
            <EnlaceBoton variante="secundario" tamano="sm" to={`/${revista}/articulos`}>
              Volver al listado
            </EnlaceBoton>
          }
        >
          No existe el artículo {id} en esta revista.
        </Alerta>
      </section>
    )
  }

  const articulo = consulta.data
  const panel = articulo ? <Outlet context={articulo} /> : null

  return (
    <EstadoConsulta
      cargando={consulta.isPending}
      error={consulta.isError}
      onReintentar={() => void consulta.refetch()}
      descripcion="el artículo"
    >
      {articulo && (
        <div className="flex flex-col gap-4">
          <BotonVolver to={`/${revista}/articulos`}>Volver a artículos</BotonVolver>
          <EncabezadoFicha
            articulo={articulo}
            acciones={
              <>
                {puedeCambiar && (
                  <Boton variante="secundario" tamano="sm" onClick={() => setCambiando(true)}>
                    Cambiar de revista
                  </Boton>
                )}
                {puedeEditar && (
                  <Boton variante="secundario" tamano="sm" onClick={() => setEditando(true)}>
                    Editar
                  </Boton>
                )}
                {puedeCerrar && ABIERTOS.includes(articulo.estado) && (
                  <Boton variante="secundario" tamano="sm" onClick={() => setCerrando(true)}>
                    Cerrar proceso
                  </Boton>
                )}
              </>
            }
          />
          <AvisoResultadoPares articulo={articulo} onAsignarPublicacion={() => setCerrando(true)} />
          {requiereNuevaRevision(articulo) &&
            articulo.resultadoPares !== 'publicable-con-modificaciones' &&
            articulo.resultadoPares !== 'no-publicable' && (
              <Alerta
                tipo="advertencia"
                titulo="Este artículo debe revisarse de nuevo"
                accion={
                  <EnlaceBoton
                    variante="secundario"
                    tamano="sm"
                    to={`/${revista}/articulos/${encodeURIComponent(articulo.id)}/comite`}
                  >
                    Ir a la revisión del comité
                  </EnlaceBoton>
                }
              >
                El proceso fue retomado. El comité editorial debe registrar una nueva ronda de
                revisión antes de asignar pares evaluadores.
              </Alerta>
            )}
          <Pestanas
            etiqueta="Secciones del artículo"
            valor={pestanaActiva(pathname, base)}
            onCambio={(v) => navigate(v === 'resumen' ? base : `${base}/${v}`)}
            pestanas={[
              { valor: 'resumen', etiqueta: 'Resumen', contenido: panel },
              { valor: 'comite', etiqueta: 'Revisión del comité', contenido: panel },
              { valor: 'autores', etiqueta: 'Autores', contenido: panel },
              { valor: 'pares', etiqueta: 'Pares y evaluación', contenido: panel },
              { valor: 'historial', etiqueta: 'Historial', contenido: panel },
            ]}
          />
          <CerrarProcesoModal
            articulo={articulo}
            abierto={cerrando}
            onCerrar={() => setCerrando(false)}
          />
          <CambiarRevistaModal
            articulo={articulo}
            abierto={cambiando}
            onCerrar={() => setCambiando(false)}
          />
          <EditarArticuloModal
            articulo={articulo}
            abierto={editando}
            onCerrar={() => setEditando(false)}
          />
        </div>
      )}
    </EstadoConsulta>
  )
}
