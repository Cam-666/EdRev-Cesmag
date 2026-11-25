/*
 * FormularioPlantilla — edita el texto de una plantilla (y su asunto, si es un correo): con los datos que se pueden
 * insertar con un botón, una vista previa en vivo con datos de ejemplo y la validación antes de guardar. El texto
 * puede tener alineación y negrita. La constancia (un archivo) no tiene asunto y lleva imágenes de encabezado, de
 * pie de página y de firma. No hay nada más que elegir: los textos automáticos ya están en uso y los mensajes se
 * eligen al enviar un correo. Los avisos de guardado y de error salen debajo del botón «Guardar», donde está la
 * persona después de pulsarlo.
 */
import { useEffect, useRef, useState } from 'react'
import { DATOS_EJEMPLO, EXPLICACION_FIN, validarPlantilla } from '../config/plantillas'
import { EditorTexto } from './EditorTexto'
import { ImagenesConstancia } from './ImagenesConstancia'
import { VistaPreviaConstancia } from './VistaPreviaConstancia'
import { VistaPreviaCorreo } from './VistaPreviaCorreo'
import { useGuardarPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { mensajeDeApi } from '@/lib/api/errores'
import { rellenar } from '@/lib/plantillas'
import type { FinPlantilla, Plantilla } from '@/types/plantilla'
import { REVISTAS } from '@/types/revista'

export interface FormularioPlantillaProps {
  plantilla: Plantilla
}

export function FormularioPlantilla({ plantilla }: FormularioPlantillaProps) {
  const [asunto, setAsunto] = useState(plantilla.asunto ?? '')
  const [cuerpo, setCuerpo] = useState(plantilla.cuerpo)
  const [error, setError] = useState<string | null>(null)
  const [guardada, setGuardada] = useState(false)
  const mutacion = useGuardarPlantilla()
  const resultado = useRef<HTMLDivElement>(null)
  const tieneAsunto = plantilla.asunto !== null
  const esConstancia = plantilla.clase === 'archivo'
  const ejemplo = { ...DATOS_EJEMPLO, revista: REVISTAS[plantilla.revista].nombre }

  // Cuando sale un mensaje (guardada o con error) se lleva a la vista, junto al botón.
  const hayMensaje = guardada || mutacion.isError
  useEffect(() => {
    if (hayMensaje) resultado.current?.scrollIntoView?.({ block: 'nearest' })
  }, [hayMensaje])

  function guardar() {
    setGuardada(false)
    const problema = validarPlantilla(plantilla, tieneAsunto ? asunto : null, cuerpo)
    setError(problema)
    if (problema) return
    mutacion.mutate(
      { id: plantilla.id, asunto: tieneAsunto ? asunto : null, cuerpo },
      { onSuccess: () => setGuardada(true) },
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-cuerpo-13 text-texto-secundario">
        {EXPLICACION_FIN[plantilla.fin as FinPlantilla]}
      </p>

      <EditorTexto
        valor={cuerpo}
        onCambio={setCuerpo}
        datos={plantilla.variables}
        error={error ?? undefined}
        {...(tieneAsunto ? { asunto, onAsunto: setAsunto } : {})}
      />

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
        {tieneAsunto && (
          <p className="text-cuerpo-15-enfasis">Asunto: {rellenar(asunto, ejemplo)}</p>
        )}
        {esConstancia ? (
          <VistaPreviaConstancia plantilla={plantilla} cuerpo={cuerpo} />
        ) : (
          <VistaPreviaCorreo
            revista={plantilla.revista}
            uso={plantilla.fin as Exclude<FinPlantilla, 'constancia'>}
            cuerpo={cuerpo}
          />
        )}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Boton onClick={guardar} cargando={mutacion.isPending}>
          Guardar plantilla
        </Boton>
      </div>

      <div ref={resultado} role="status" aria-live="polite" className="flex flex-col gap-2">
        {mutacion.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(mutacion.error, 'No fue posible guardar la plantilla.')}
          </Alerta>
        )}
        {guardada && (
          <Alerta tipo="exito">
            Plantilla guardada. Los próximos envíos usarán el texto nuevo.
          </Alerta>
        )}
      </div>
    </div>
  )
}
