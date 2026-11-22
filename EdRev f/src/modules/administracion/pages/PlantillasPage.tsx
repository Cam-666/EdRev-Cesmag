/*
 * PlantillasPage — Plantillas (/administracion/plantillas): los textos de los correos y de la constancia, que se
 * editan sin tocar el código. Cuatro grupos por revista, cada uno para algo fijo que se elige al crear la plantilla:
 * - Invitación al par y agradecimiento al par: puede haber varias. Una es la «recomendada» (sale elegida al asignar un par
 *   o emitir una constancia); quien envía puede escoger otra en esa misma ventana. La recomendada no se elimina.
 * - Constancia: una sola por revista; solo se edita.
 * - Mensajes libres: se eligen al pulsar «Enviar correo» en la ficha de un par o de un autor.
 * Al pulsar «Editar» se abre el texto de esa plantilla; «Volver a las plantillas» regresa a las listas.
 * Solo para la Administradora.
 */
import { useState } from 'react'
import { FormularioPlantilla } from '../components/FormularioPlantilla'
import { NuevaPlantillaModal } from '../components/NuevaPlantillaModal'
import { GRUPOS } from '../config/plantillas'
import { useEliminarPlantilla, useMarcarPredeterminada, usePlantillas } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { ModalConfirmacion } from '@/components/common/ModalConfirmacion'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
import type { Plantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

const OPCIONES_REVISTA = (Object.keys(REVISTAS) as Revista[]).map((r) => ({
  valor: r,
  etiqueta: REVISTAS[r].nombreCorto,
}))

function Fila({ nombre, descripcion, children }: { nombre: string; descripcion: string; children: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-borde-base bg-superficie-tarjeta p-4">
      <div className="min-w-0 flex-1">
        <p className="text-titulo-16">{nombre}</p>
        <p className="text-cuerpo-13 text-texto-secundario">{descripcion}</p>
      </div>
      <div className="flex gap-2">{children}</div>
    </li>
  )
}

export function PlantillasPage() {
  const consulta = usePlantillas()
  const eliminar = useEliminarPlantilla()
  const habitual = useMarcarPredeterminada()
  const [revista, setRevista] = useState<Revista>('reep')
  const [editando, setEditando] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [borrando, setBorrando] = useState<Plantilla | null>(null)
  const delaRevista = (consulta.data?.plantillas ?? []).filter((p) => p.revista === revista)
  const abierta = delaRevista.find((p) => p.id === editando)

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        nivel="h2"
        titulo="Plantillas"
        acciones={
          !abierta && (
            <Boton tamano="sm" onClick={() => setCreando(true)}>
              Nueva plantilla
            </Boton>
          )
        }
      />

      <EstadoConsulta
        cargando={consulta.isPending}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="las plantillas"
      >
        {consulta.data && (
          <div className="flex max-w-3xl flex-col gap-5">
            {abierta ? (
              <>
                <div>
                  <Boton variante="neutro" tamano="sm" onClick={() => setEditando(null)}>
                    ← Volver a las plantillas
                  </Boton>
                </div>
                <h3 className="text-titulo-20">
                  {abierta.nombre} · {REVISTAS[revista].nombreCorto}
                </h3>
                <FormularioPlantilla key={abierta.id} plantilla={abierta} />
              </>
            ) : (
              <>
                <ListaDesplegable
                  etiqueta="Revista"
                  opciones={OPCIONES_REVISTA}
                  valor={revista}
                  onCambio={(v) => setRevista(v as Revista)}
                  className="max-w-sm"
                />

                {GRUPOS.map((g) => {
                  const lista = delaRevista.filter((p) => p.fin === g.fin)
                  return (
                    <section key={g.fin} aria-labelledby={`titulo-${g.fin}`} className="flex flex-col gap-3">
                      <div>
                        <h3 id={`titulo-${g.fin}`} className="text-titulo-16">
                          {g.nombre}
                        </h3>
                        <p className="text-cuerpo-13 text-texto-secundario">{g.descripcion}</p>
                      </div>
                      {lista.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-borde-fuerte p-4 text-cuerpo-13 text-texto-secundario">
                          Todavía no hay plantillas de este tipo en esta revista. Cree una con «Nueva plantilla».
                        </p>
                      ) : (
                        <ul className="flex flex-col gap-3">
                          {lista.map((p) => {
                            const conVarias = p.fin === 'invitacion' || p.fin === 'agradecimiento'
                            return (
                              <Fila
                                key={p.id}
                                nombre={conVarias && p.enUso ? `${p.nombre} · Recomendada` : p.nombre}
                                descripcion={p.cuerpo.trim() ? 'Lista para usar.' : 'Todavía está en blanco: escriba su texto.'}
                              >
                                <Boton variante="secundario" tamano="sm" onClick={() => setEditando(p.id)}>
                                  Editar <span className="sr-only">{p.nombre}</span>
                                </Boton>
                                {conVarias && !p.enUso && p.cuerpo.trim() && (
                                  <Boton
                                    variante="neutro"
                                    tamano="sm"
                                    cargando={habitual.isPending && habitual.variables === p.id}
                                    onClick={() => habitual.mutate(p.id)}
                                  >
                                    Usar como recomendada <span className="sr-only">{p.nombre}</span>
                                  </Boton>
                                )}
                                {p.fin !== 'constancia' && !p.enUso && (
                                  <Boton variante="peligro" tamano="sm" onClick={() => setBorrando(p)}>
                                    Eliminar <span className="sr-only">{p.nombre}</span>
                                  </Boton>
                                )}
                              </Fila>
                            )
                          })}
                        </ul>
                      )}
                    </section>
                  )
                })}
                {habitual.isError && (
                  <Alerta tipo="error">{mensajeDeApi(habitual.error, 'No fue posible cambiar la plantilla recomendada.')}</Alerta>
                )}
              </>
            )}
          </div>
        )}
      </EstadoConsulta>

      <NuevaPlantillaModal
        revista={revista}
        abierto={creando}
        onCerrar={() => setCreando(false)}
        onCreada={(p) => {
          setCreando(false)
          setRevista(p.revista)
          setEditando(p.id)
        }}
      />

      <ModalConfirmacion
        abierto={borrando !== null}
        onCerrar={() => setBorrando(null)}
        titulo="Eliminar plantilla"
        descripcion={`¿Desea eliminar la plantilla «${borrando?.nombre ?? ''}»? Esta acción no se puede deshacer.`}
        etiquetaConfirmar="Eliminar plantilla"
        cargando={eliminar.isPending}
        error={eliminar.isError ? mensajeDeApi(eliminar.error, 'No fue posible eliminar la plantilla.') : null}
        onConfirmar={() => {
          if (borrando) eliminar.mutate(borrando.id, { onSuccess: () => setBorrando(null) })
        }}
      />
    </section>
  )
}
