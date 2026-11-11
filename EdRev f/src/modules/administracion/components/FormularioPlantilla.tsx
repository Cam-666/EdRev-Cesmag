/*
 * FormularioPlantilla — edits one template (subject and text) with the markers it accepts, a
 * live preview filled with sample data, and validation before saving: it may only use its own
 * markers and must keep the required ones. For the constancia only the text between the fixed
 * letterhead and signature is editable (RF-30). A template not in use can be chosen as the one
 * the system sends for its use. Covers: RNF-19, RF-25, RF-30.
 */
import { useState } from 'react'
import { DATOS_EJEMPLO, validarPlantilla } from '../config/plantillas'
import { useGuardarPlantilla, useUsarPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { AreaTexto } from '@/components/common/AreaTexto'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { mensajeDeApi } from '@/lib/api/errores'
import { rellenar } from '@/lib/plantillas'
import type { Plantilla } from '@/types/plantilla'

export interface FormularioPlantillaProps {
  plantilla: Plantilla
}

export function FormularioPlantilla({ plantilla }: FormularioPlantillaProps) {
  const [asunto, setAsunto] = useState(plantilla.asunto ?? '')
  const [cuerpo, setCuerpo] = useState(plantilla.cuerpo)
  const [error, setError] = useState<string | null>(null)
  const [guardada, setGuardada] = useState(false)
  const mutacion = useGuardarPlantilla()
  const usar = useUsarPlantilla()
  const tieneAsunto = plantilla.asunto !== null

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
      {mutacion.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(mutacion.error, 'No fue posible guardar la plantilla.')}
        </Alerta>
      )}
      {usar.isError && (
        <Alerta tipo="error">
          {mensajeDeApi(usar.error, 'No fue posible poner la plantilla en uso.')}
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
        <CampoTexto etiqueta="Asunto" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
      )}
      <AreaTexto
        etiqueta="Texto"
        rows={10}
        value={cuerpo}
        onChange={(e) => setCuerpo(e.target.value)}
        error={error ?? undefined}
        ayuda={`Marcadores disponibles: ${plantilla.variables.map((v) => `{{${v}}}`).join(' ')}`}
      />

      <section
        aria-labelledby="titulo-previa-plantilla"
        className="flex flex-col gap-2 rounded-lg border border-borde-fuerte bg-superficie-sutil p-4"
      >
        <h3 id="titulo-previa-plantilla" className="text-micro-11 uppercase text-texto-secundario">
          Vista previa con datos de ejemplo
        </h3>
        {tieneAsunto && <p className="text-cuerpo-15-enfasis">{rellenar(asunto, DATOS_EJEMPLO)}</p>}
        <p className="whitespace-pre-line text-cuerpo-15">{rellenar(cuerpo, DATOS_EJEMPLO)}</p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Boton onClick={guardar} cargando={mutacion.isPending}>
          Guardar plantilla
        </Boton>
        {plantilla.enUso ? (
          <span className="text-cuerpo-13 text-texto-secundario">En uso</span>
        ) : (
          <Boton
            variante="secundario"
            cargando={usar.isPending}
            onClick={() => usar.mutate(plantilla.id)}
          >
            Usar en los envíos
          </Boton>
        )}
      </div>
    </div>
  )
}
