/*
 * FormularioPlantilla — edita una plantilla: el uso (solo en las de correo), el asunto y el texto con los datos que
 * acepta ese uso, una vista previa en vivo con datos de ejemplo y la validación antes de guardar. El texto puede
 * tener alineación y negrita.
 * - Uso: «Correo de invitación», «Correo de agradecimiento» o «Correo libre». La que está en uso no cambia de uso.
 * - Las de invitación y agradecimiento tienen el botón «Usar esta plantilla» (guarda lo escrito y la deja como la que
 *   se envía); las libres se eligen al pulsar «Enviar correo» en la ficha de un par o de un autor.
 * - La constancia (plantilla de archivo) es permanente: siempre está en uso, no tiene asunto ni menú de uso, no se
 *   elimina y lleva imágenes de encabezado, de pie de página y de firma.
 * Los mensajes de guardado y de error salen debajo de los botones, donde está la persona después de pulsar «Guardar».
 */
import { useEffect, useRef, useState } from 'react'
import {
  DATOS_EJEMPLO,
  ETIQUETA_FIN,
  EXPLICACION_FIN,
  USOS_DE_CORREO,
  VARIABLES_POR_FIN,
  validarPlantilla,
} from '../config/plantillas'
import { EditorTexto } from './EditorTexto'
import { ImagenesConstancia } from './ImagenesConstancia'
import { VistaPreviaConstancia } from './VistaPreviaConstancia'
import { VistaPreviaCorreo } from './VistaPreviaCorreo'
import { useAsignarPlantilla, useEliminarPlantilla, useGuardarPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { ModalConfirmacion } from '@/components/common/ModalConfirmacion'
import { mensajeDeApi } from '@/lib/api/errores'
import { aGuardado, aVisible } from '@/lib/datosPlantilla'
import { rellenar } from '@/lib/plantillas'
import type { FinPlantilla, Plantilla, UsoPlantilla } from '@/types/plantilla'
import { REVISTAS } from '@/types/revista'

export interface FormularioPlantillaProps {
  plantilla: Plantilla
  /** Se llama después de eliminar la plantilla para que la página elija otra. */
  onEliminada?: () => void
}

export function FormularioPlantilla({ plantilla, onEliminada }: FormularioPlantillaProps) {
  const [asunto, setAsunto] = useState(plantilla.asunto ?? '')
  const [cuerpo, setCuerpo] = useState(plantilla.cuerpo)
  const [fin, setFin] = useState<FinPlantilla>(plantilla.fin)
  const [error, setError] = useState<string | null>(null)
  const [guardada, setGuardada] = useState(false)
  const mutacion = useGuardarPlantilla()
  const eliminar = useEliminarPlantilla()
  const asignar = useAsignarPlantilla()
  const [confirmando, setConfirmando] = useState(false)
  const resultado = useRef<HTMLDivElement>(null)
  const tieneAsunto = plantilla.asunto !== null
  const esConstancia = plantilla.clase === 'archivo'
  const ejemplo = { ...DATOS_EJEMPLO, revista: REVISTAS[plantilla.revista].nombre }
  const datos = VARIABLES_POR_FIN[fin]

  // Cuando sale un mensaje (guardada, usada o con error) se lleva a la vista, junto a los botones.
  const hayMensaje = guardada || asignar.isSuccess || mutacion.isError || asignar.isError
  useEffect(() => {
    if (hayMensaje) resultado.current?.scrollIntoView?.({ block: 'nearest' })
  }, [hayMensaje])

  function validar(): boolean {
    const problema = validarPlantilla({ variables: datos }, tieneAsunto ? asunto : null, cuerpo)
    setError(problema)
    return problema === null
  }

  function guardar() {
    setGuardada(false)
    asignar.reset()
    if (!validar()) return
    mutacion.mutate(
      { id: plantilla.id, asunto: tieneAsunto ? asunto : null, cuerpo, fin: esConstancia ? undefined : fin },
      { onSuccess: () => setGuardada(true) },
    )
  }

  /** Guarda lo escrito y la deja como la plantilla que se envía para su uso. */
  function usar() {
    setGuardada(false)
    asignar.reset()
    if (!validar() || fin === 'mensaje' || fin === 'constancia') return
    mutacion.mutate(
      { id: plantilla.id, asunto: tieneAsunto ? asunto : null, cuerpo, fin },
      { onSuccess: () => asignar.mutate({ id: plantilla.id, uso: fin as UsoPlantilla }) },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {esConstancia ? (
        <p className="text-cuerpo-13 text-texto-secundario">
          <strong>{ETIQUETA_FIN.constancia}.</strong> {EXPLICACION_FIN.constancia}
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          <ListaDesplegable
            etiqueta="Uso de la plantilla"
            opciones={USOS_DE_CORREO.map((u) => ({ valor: u.valor, etiqueta: u.etiqueta }))}
            valor={fin}
            onCambio={(v) => {
              setFin(v as FinPlantilla)
              setError(null)
            }}
            disabled={plantilla.enUso}
          />
          <p className="text-cuerpo-13 text-texto-secundario">
            {plantilla.enUso
              ? 'Es la plantilla en uso: para cambiar su uso, primero use otra plantilla.'
              : EXPLICACION_FIN[fin]}
          </p>
        </div>
      )}

      {tieneAsunto && (
        <CampoTexto
          etiqueta="Asunto"
          value={aVisible(asunto)}
          onChange={(e) => setAsunto(aGuardado(e.target.value))}
        />
      )}
      <EditorTexto valor={cuerpo} onCambio={setCuerpo} datos={datos} error={error ?? undefined} />

      {esConstancia && <ImagenesConstancia plantilla={plantilla} />}

      <section
        aria-labelledby="titulo-previa-plantilla"
        className="flex flex-col gap-3 rounded-lg border border-borde-fuerte bg-superficie-sutil p-4"
      >
        <h3 id="titulo-previa-plantilla" className="text-micro-11 uppercase text-texto-secundario">
          {esConstancia ? 'Vista previa de la constancia' : 'Vista previa del correo'}
        </h3>
        <p className="text-cuerpo-13 text-texto-secundario">
          {esConstancia
            ? 'Así se ve el archivo PDF, con datos de ejemplo. Se actualiza mientras usted escribe y al subir las imágenes.'
            : 'Así recibe la persona el correo, con datos de ejemplo. Se actualiza mientras usted escribe.'}
        </p>
        {tieneAsunto && <p className="text-cuerpo-15-enfasis">Asunto: {rellenar(asunto, ejemplo)}</p>}
        {esConstancia ? (
          <VistaPreviaConstancia plantilla={plantilla} cuerpo={cuerpo} />
        ) : (
          <VistaPreviaCorreo revista={plantilla.revista} uso={fin as Exclude<FinPlantilla, 'constancia'>} cuerpo={cuerpo} />
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Boton onClick={guardar} cargando={mutacion.isPending && !asignar.isPending}>
          Guardar plantilla
        </Boton>
        {!esConstancia &&
          (plantilla.enUso ? (
            <span className="text-cuerpo-13 text-texto-secundario">
              <strong>Es la plantilla en uso</strong> para «{plantilla.uso ? ETIQUETA_FIN[plantilla.uso] : ''}». Para
              eliminarla, primero use otra plantilla del mismo uso.
            </span>
          ) : (
            <>
              {(fin === 'invitacion' || fin === 'agradecimiento') && (
                <Boton variante="secundario" onClick={usar} cargando={asignar.isPending}>
                  Usar esta plantilla
                </Boton>
              )}
              <Boton variante="peligro" onClick={() => setConfirmando(true)}>
                Eliminar plantilla
              </Boton>
            </>
          ))}
      </div>

      <div ref={resultado} role="status" aria-live="polite" className="flex flex-col gap-2">
        {mutacion.isError && (
          <Alerta tipo="error">{mensajeDeApi(mutacion.error, 'No fue posible guardar la plantilla.')}</Alerta>
        )}
        {asignar.isError && (
          <Alerta tipo="error">{mensajeDeApi(asignar.error, 'No fue posible usar la plantilla.')}</Alerta>
        )}
        {guardada && !asignar.isSuccess && (
          <Alerta tipo="exito">Plantilla guardada. Los próximos envíos usarán el texto nuevo.</Alerta>
        )}
        {asignar.isSuccess && (
          <Alerta tipo="exito">
            Plantilla guardada. Desde ahora es la que se usa para «{ETIQUETA_FIN[fin]}».
          </Alerta>
        )}
      </div>

      <ModalConfirmacion
        abierto={confirmando}
        onCerrar={() => setConfirmando(false)}
        titulo="Eliminar plantilla"
        descripcion={`¿Desea eliminar la plantilla «${plantilla.nombre}»? Esta acción no se puede deshacer.`}
        etiquetaConfirmar="Eliminar plantilla"
        cargando={eliminar.isPending}
        error={
          eliminar.isError ? mensajeDeApi(eliminar.error, 'No fue posible eliminar la plantilla.') : null
        }
        onConfirmar={() =>
          eliminar.mutate(plantilla.id, {
            onSuccess: () => {
              setConfirmando(false)
              onEliminada?.()
            },
          })
        }
      />
    </div>
  )
}
