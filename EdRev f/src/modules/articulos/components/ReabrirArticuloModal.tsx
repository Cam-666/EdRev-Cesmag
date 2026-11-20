/*
 * ReabrirArticuloModal — «Retomar el proceso» de un artículo archivado: pide el motivo (se guarda como una
 * observación con fecha) y el estado al que vuelve, y muestra lo que se conserva (autores, pares, antiplagio,
 * observaciones, constancias).
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { ESTADOS_REAPERTURA } from '../config/listas'
import { esquemaReapertura } from '../config/esquemas'
import { paresVigentes } from '../config/reglas'
import type { ReaperturaForm } from '../config/esquemas'
import { useReabrirArticulo } from '../hooks/useMutacionesArticulo'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { formatearFechaLarga } from '@/lib/format'
import type { ArticuloDetalle } from '@/types/articulo'

export interface ReabrirArticuloModalProps {
  articulo: ArticuloDetalle
  onCerrar: () => void
  onReabierto: () => void
}

const FORMULARIO = 'formulario-reabrir'

export function ReabrirArticuloModal({
  articulo,
  onCerrar,
  onReabierto,
}: ReabrirArticuloModalProps) {
  const mutacion = useReabrirArticulo(articulo.id)
  const archivado = articulo.estado === 'archivado'
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReaperturaForm>({
    resolver: zodResolver(esquemaReapertura),
    defaultValues: { motivo: '', estado: 'en-revision' },
  })

  const conserva: Array<[string, string]> = [
    ['Autores', String(articulo.autores.length)],
    [
      'Pares',
      paresVigentes(articulo.asignaciones).length === 0
        ? 'Ninguno asignado'
        : `${paresVigentes(articulo.asignaciones).length} asignados`,
    ],
    [
      'Antiplagio',
      articulo.coincidencias !== null
        ? `${articulo.coincidencias} % · ${articulo.atribuidoIa ?? 0} % de IA`
        : 'Ninguno',
    ],
    ['Revisión del comité', `${articulo.rondasComite.length} rondas`],
    [
      'Constancias',
      articulo.asignaciones.filter((a) => a.constanciaEmitida).length === 0
        ? 'Ninguna'
        : `${articulo.asignaciones.filter((a) => a.constanciaEmitida).length} emitidas`,
    ],
  ]

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Retomar el proceso"
      descripcion={`Artículo ${articulo.numeroOjs} · ${articulo.titulo}`}
      acciones={
        archivado ? (
          <>
            <Boton variante="neutro" onClick={onCerrar}>
              Cancelar
            </Boton>
            <Boton type="submit" form={FORMULARIO} cargando={mutacion.isPending}>
              Retomar
            </Boton>
          </>
        ) : (
          <Boton variante="neutro" onClick={onCerrar}>
            Cerrar
          </Boton>
        )
      }
    >
      {!archivado ? (
        <Alerta tipo="informacion">
          Este artículo no está archivado, así que no hay un proceso que retomar.
        </Alerta>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-cuerpo-13 text-texto-secundario">
              <DistintivoEstado estado="archivado" />
              {articulo.archivadoEn && `Archivado el ${formatearFechaLarga(articulo.archivadoEn)}`}
            </p>
            {articulo.motivoArchivo && (
              <p className="text-cuerpo-13 text-texto-secundario">{articulo.motivoArchivo}</p>
            )}
          </div>

          <form
            id={FORMULARIO}
            noValidate
            onSubmit={handleSubmit((v) => mutacion.mutate(v, { onSuccess: onReabierto }))}
            className="flex flex-col gap-3"
          >
            {mutacion.isError && (
              <Alerta tipo="error">No fue posible retomar el proceso. Intente de nuevo.</Alerta>
            )}
            <AreaTexto
              etiqueta="Motivo de la reapertura"
              rows={3}
              error={errors.motivo?.message}
              {...register('motivo')}
            />
            <Controller
              control={control}
              name="estado"
              render={({ field }) => (
                <ListaDesplegable
                  etiqueta="Estado al que vuelve"
                  opciones={ESTADOS_REAPERTURA}
                  valor={field.value}
                  onCambio={field.onChange}
                />
              )}
            />
          </form>

          <section
            aria-labelledby="titulo-se-conserva"
            className="rounded-md bg-superficie-sutil p-3"
          >
            <h3 id="titulo-se-conserva" className="mb-2 text-etiqueta-13">
              Se conserva
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-cuerpo-13">
              {conserva.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-texto-secundario">{k}</dt>
                  <dd className="text-texto-principal">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </Modal>
  )
}
