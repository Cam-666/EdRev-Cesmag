/*
 * FormularioPlantilla — edits one template (subject and text) with the markers it accepts, a
 * live preview filled with sample data, and validation before saving: it may only use its own
 * markers and must keep the required ones. The text can have alignment and bold. The constancia
 * (a file template) has no subject; it carries a header, a footer and a signature image (RF-30).
 * It says what the template is used for (chosen in Configuración) and a template that is not
 * in use can be deleted. Covers: RF-25, RF-30, RF-45.
 */
import { useState } from 'react'
import { DATOS_EJEMPLO, ETIQUETA_USO, validarPlantilla } from '../config/plantillas'
import { EditorTexto } from './EditorTexto'
import { ImagenesConstancia } from './ImagenesConstancia'
import { VistaPreviaConstancia } from './VistaPreviaConstancia'
import { VistaPreviaCorreo } from './VistaPreviaCorreo'
import { useEliminarPlantilla, useGuardarPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ModalConfirmacion } from '@/components/common/ModalConfirmacion'
import { mensajeDeApi } from '@/lib/api/errores'
import { aGuardado, aVisible } from '@/lib/datosPlantilla'
import { rellenar } from '@/lib/plantillas'
import type { Plantilla } from '@/types/plantilla'
import { REVISTAS } from '@/types/revista'

export interface FormularioPlantillaProps {
  plantilla: Plantilla
  /** Called after the template is deleted so the page can choose another one. */
  onEliminada?: () => void
}

export function FormularioPlantilla({ plantilla, onEliminada }: FormularioPlantillaProps) {
  const [asunto, setAsunto] = useState(plantilla.asunto ?? '')
  const [cuerpo, setCuerpo] = useState(plantilla.cuerpo)
  const [error, setError] = useState<string | null>(null)
  const [guardada, setGuardada] = useState(false)
  const mutacion = useGuardarPlantilla()
  const eliminar = useEliminarPlantilla()
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

  return (
    <div className="flex flex-col gap-4">
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
            ? 'Así recibe el par el mensaje, con datos de ejemplo. Se actualiza mientras usted escribe.'
            : 'Así se ve el archivo PDF, con datos de ejemplo. Se actualiza mientras usted escribe y al subir las imágenes.'}
        </p>
        {tieneAsunto && (
          <p className="text-cuerpo-15-enfasis">Asunto: {rellenar(asunto, ejemplo)}</p>
        )}
        {plantilla.clase === 'correo' ? (
          <VistaPreviaCorreo
            revista={plantilla.revista}
            uso={plantilla.fin === 'agradecimiento' ? 'agradecimiento' : 'invitacion'}
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
            En uso como: {plantilla.uso ? ETIQUETA_USO[plantilla.uso] : ''}. Para eliminarla,
            elija antes otra en Configuración.
          </span>
        ) : (
          <>
            <span className="text-cuerpo-13 text-texto-secundario">
              Sin uso asignado. Elija para qué se usará en Configuración.
            </span>
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
