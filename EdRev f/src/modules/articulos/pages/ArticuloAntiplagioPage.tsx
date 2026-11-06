/*
 * ArticuloAntiplagioPage — Antiplagio y revisión del comité (/:revista/articulos/:id/antiplagio):
 * edit screen of the anti-plagiarism report and the committee review, with what was registered
 * before. Administradora only (RNF-05).
 * Covers: RF-05, RF-06, HU-02, HU-03.
 */
import { useNavigate, useParams } from 'react-router-dom'
import { FormularioRevision } from '../components/FormularioRevision'
import { ETIQUETA_RESULTADO } from '../config/listas'
import { useArticulo } from '../hooks/useArticulo'
import { Boton } from '@/components/common/Boton'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import { abreviarNombre, formatearFechaHora } from '@/lib/format'
import { useRevista } from '@/lib/revista/useRevista'
import type { ArticuloDetalle } from '@/types/articulo'

const FORMULARIO = 'formulario-revision'

interface Registro {
  fecha: string
  usuario: string
  texto: string
}

function registrosPrevios(a: ArticuloDetalle): Registro[] {
  const lista: Registro[] = []
  if (a.antiplagio) {
    lista.push({
      fecha: a.antiplagio.fecha,
      usuario: a.antiplagio.usuario,
      texto: `Antiplagio: ${a.antiplagio.coincidencias} % y ${a.antiplagio.atribuidoIa} %.`,
    })
  }
  if (a.revisionInicial) {
    lista.push({
      fecha: a.revisionInicial.fecha,
      usuario: a.revisionInicial.usuario,
      texto: `Revisión inicial registrada: ${ETIQUETA_RESULTADO[a.revisionInicial.resultado]}.`,
    })
  }
  if (a.revisionFinal) {
    lista.push({
      fecha: a.revisionFinal.fecha,
      usuario: a.revisionFinal.usuario,
      texto: `Revisión final registrada: ${ETIQUETA_RESULTADO[a.revisionFinal.resultado]}.`,
    })
  }
  return lista.sort((x, y) => (x.fecha < y.fecha ? 1 : -1))
}

export function ArticuloAntiplagioPage() {
  const { revista } = useRevista()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const consulta = useArticulo(id)
  const volver = () => navigate(`/${revista}/articulos/${encodeURIComponent(id)}`)

  return (
    <section className="flex flex-col gap-4">
      <AccionesEncabezado>
        <Boton type="submit" form={FORMULARIO} tamano="sm">
          Guardar
        </Boton>
        <Boton variante="neutro" tamano="sm" onClick={volver}>
          Cancelar
        </Boton>
      </AccionesEncabezado>
      <EstadoConsulta
        cargando={consulta.isPending}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="el artículo"
      >
        {consulta.data && (
          <>
            <header>
              <h1 className="text-titulo-24">Antiplagio y revisión del comité</h1>
              <p className="text-cuerpo-13 text-texto-secundario">
                {consulta.data.numeroOjs} · {consulta.data.titulo}
              </p>
            </header>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_320px]">
              <FormularioRevision
                articulo={consulta.data}
                idFormulario={FORMULARIO}
                onGuardado={volver}
              />
              <section
                aria-labelledby="titulo-registrado-antes"
                className="h-fit rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
              >
                <h2 id="titulo-registrado-antes" className="mb-3 text-titulo-16">
                  Registrado antes
                </h2>
                {registrosPrevios(consulta.data).length === 0 ? (
                  <p className="text-cuerpo-13 text-texto-secundario">Aún no hay registros.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {registrosPrevios(consulta.data).map((r) => (
                      <li key={`${r.fecha}-${r.texto}`} className="flex flex-col">
                        <span className="text-cuerpo-13 text-texto-secundario">
                          {formatearFechaHora(r.fecha)} · {abreviarNombre(r.usuario)}
                        </span>
                        <span className="text-cuerpo-15 text-texto-principal">{r.texto}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </EstadoConsulta>
    </section>
  )
}
