/*
 * FormularioPlantilla — edita una plantilla (asunto y texto) con las marcas que acepta, una vista previa en vivo
 * con datos de ejemplo y la validación antes de guardar: solo puede usar sus propias marcas. El texto puede
 * tener alineación y negrita. La constancia (plantilla de archivo) no tiene asunto; lleva imágenes de encabezado,
 * de pie de página y de firma. Dice de qué tipo es la plantilla y, en las de invitación, agradecimiento y constancia,
 * tiene el botón «Usar esta plantilla» (guarda el texto y la deja como la que se envía); las de mensaje se eligen
 * al enviar un correo desde la ficha de un par o de un autor. Una plantilla que no está en uso se puede eliminar.
 */
import { useState } from 'react'
import { DATOS_EJEMPLO, ETIQUETA_USO, EXPLICACION_FIN, ETIQUETA_FIN, validarPlantilla } from '../config/plantillas'
import { EditorTexto } from './EditorTexto'
import { ImagenesConstancia } from './ImagenesConstancia'
import { VistaPreviaConstancia } from './VistaPreviaConstancia'
import { VistaPreviaCorreo } from './VistaPreviaCorreo'
import { useAsignarPlantilla, useEliminarPlantilla, useGuardarPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ModalConfirmacion } from '@/components/common/ModalConfirmacion'
import { mensajeDeApi } from '@/lib/api/errores'
import { aGuardado, aVisible } from '@/lib/datosPlantilla'
import { rellenar } from '@/lib/plantillas'
import type { Plantilla, UsoPlantilla } from '@/types/plantilla'
import { REVISTAS } from '@/types/revista'

export interface FormularioPlantillaProps {
  plantilla: Plantilla
  /** Se llama después de eliminar la plantilla para que la página elija otra. */
  onEliminada?: () => void
}

export function FormularioPlantilla({ plantilla, onEliminada }: FormularioPlantillaProps) {
  const [asunto, setAsunto] = useState(plantilla.asunto ?? '')
  const [cuerpo, setCuerpo] = useState(plantilla.cuerpo)
  const [error, setError] = useState<string | null>(null)
  const [guardada, setGuardada] = useState(false)
  const mutacion = useGuardarPlantilla()
  const eliminar = useEliminarPlantilla()
  const asignar = useAsignarPlantilla()
  const [confirmando, setConfirmando] = useState(false)
  const tieneAsunto = plantilla.asunto !== null
  const ejemplo = { ...DATOS_EJEMPLO, revista: REVISTAS[plantilla.revista].nombre }

  function guardar() {
    setGuardada(false)
    const problema = validarPlantilla(plantilla, tieneAsunto ? asunto : null, cuerpo)
    setError(problema)
    if (problema) return
    mutacion.mutate(
      {
        id: plantilla.id,
        asunto: tieneAsunto ? asunto : null,
        cuerpo,
      },
      { onSuccess: () => setGuardada(true) },
    )
  }

  /** Guarda lo escrito y la deja como la plantilla que se envía para su tipo. */
  function usar() {
    setGuardada(false)
    const problema = validarPlantilla(plantilla, tieneAsunto ? asunto : null, cuerpo)
    setError(problema)
    if (problema || plantilla.fin === 'mensaje') return
    mutacion.mutate(
      { id: plantilla.id, asunto: tieneAsunto ? asunto : null, cuerpo },
      { onSuccess: () => asignar.mutate({ id: plantilla.id, uso: plantilla.fin as UsoPlantilla }) },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-cuerpo-13 text-texto-secundario">
        <strong>{ETIQUETA_FIN[plantilla.fin]}.</strong> {EXPLICACION_FIN[plantilla.fin]}
      </p>
      {asignar.isError && (
        <Alerta tipo="error">{mensajeDeApi(asignar.error, 'No fue posible usar la plantilla.')}</Alerta>
      )}
      {mutacion.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(mutacion.error, 'No fue posible guardar la plantilla.')}
        </Alerta>
      )}
      <div role="status" aria-live="polite">
        {guardada && (
          <Alerta tipo="exito">
            Plantilla guardada. Los próximos envíos usarán el texto nuevo.
          </Alerta>
        )}
      </div>

      {tieneAsunto && (
        <CampoTexto
          etiqueta="Asunto"
          value={aVisible(asunto)}
          onChange={(e) => setAsunto(aGuardado(e.target.value))}
        />
      )}
      <EditorTexto
        valor={cuerpo}
        onCambio={setCuerpo}
        datos={plantilla.variables}
        error={error ?? undefined}
      />

      {plantilla.clase === 'archivo' && <ImagenesConstancia plantilla={plantilla} />}

      <section
        aria-labelledby="titulo-previa-plantilla"
        className="flex flex-col gap-3 rounded-lg border border-borde-fuerte bg-superficie-sutil p-4"
      >
        <h3 id="titulo-previa-plantilla" className="text-micro-11 uppercase text-texto-secundario">
          {plantilla.clase === 'correo' ? 'Vista previa del correo' : 'Vista previa de la constancia'}
        </h3>
        <p className="text-cuerpo-13 text-texto-secundario">
          {plantilla.clase === 'correo'
            ? 'Así recibe la persona el correo, con datos de ejemplo. Se actualiza mientras usted escribe.'
            : 'Así se ve el archivo PDF, con datos de ejemplo. Se actualiza mientras usted escribe y al subir las imágenes.'}
        </p>
        {tieneAsunto && (
          <p className="text-cuerpo-15-enfasis">Asunto: {rellenar(asunto, ejemplo)}</p>
        )}
        {plantilla.clase === 'correo' ? (
          <VistaPreviaCorreo
            revista={plantilla.revista}
            uso={
              plantilla.fin === 'agradecimiento'
                ? 'agradecimiento'
                : plantilla.fin === 'mensaje'
                  ? 'mensaje'
                  : 'invitacion'
            }
            cuerpo={cuerpo}
          />
        ) : (
          <VistaPreviaConstancia plantilla={plantilla} cuerpo={cuerpo} />
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Boton onClick={guardar} cargando={mutacion.isPending}>
          Guardar plantilla
        </Boton>
        {plantilla.enUso ? (
          <span className="text-cuerpo-13 text-texto-secundario">
            <strong>Es la plantilla en uso</strong> para «{plantilla.uso ? ETIQUETA_USO[plantilla.uso] : ''}».
            Para eliminarla, primero use otra plantilla del mismo tipo.
          </span>
        ) : (
          <>
            {plantilla.fin !== 'mensaje' && (
              <Boton
                variante="secundario"
                onClick={usar}
                cargando={asignar.isPending || mutacion.isPending}
              >
                Usar esta plantilla
              </Boton>
            )}
            <Boton variante="peligro" onClick={() => setConfirmando(true)}>
              Eliminar plantilla
            </Boton>
          </>
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
