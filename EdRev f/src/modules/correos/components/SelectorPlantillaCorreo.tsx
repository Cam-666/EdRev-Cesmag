/*
 * SelectorPlantillaCorreo — lo que se ve al enviar una invitación o un agradecimiento. De entrada solo una frase con
 * el correo que se va a enviar (la plantilla en uso de la revista sale elegida), para que normalmente baste con
 * pulsar «Enviar». El enlace «Ver o cambiar el correo» abre la vista previa y, si la revista tiene varias plantillas,
 * el menú para escoger otra. Funciona con el estado de useEleccionCorreo, que guarda la elección para enviarla.
 */
import { useState } from 'react'
import type { EleccionDeCorreo } from '../hooks/useEleccionCorreo'
import { useVistaCorreoDeEnvio } from '../hooks/useMensajes'
import { DATOS_EJEMPLO } from '@/modules/administracion/config/plantillas'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { mensajeDeApi } from '@/lib/api/errores'
import { rellenar } from '@/lib/plantillas'
import { useRetrasado } from '@/lib/useRetrasado'
import { REVISTAS } from '@/types/revista'

export interface SelectorPlantillaCorreoProps {
  estado: EleccionDeCorreo
  /** Clases del alto de la vista previa. */
  alto?: string
}

const TEXTOS = {
  invitacion: { frase: 'la invitación', etiqueta: 'Plantilla de invitación', sin: 'invitación' },
  agradecimiento: { frase: 'el correo de agradecimiento', etiqueta: 'Plantilla de agradecimiento', sin: 'agradecimiento' },
} as const

export function SelectorPlantillaCorreo({ estado, alto = 'h-[45vh] min-h-[320px]' }: SelectorPlantillaCorreoProps) {
  const { revista, fin, consulta, lista, plantilla } = estado
  const [abierto, setAbierto] = useState(false)
  const t = TEXTOS[fin]

  if (consulta.isError) return <Alerta tipo="error">No fue posible cargar las plantillas. Intente de nuevo.</Alerta>
  if (consulta.data && !plantilla) {
    return (
      <Alerta tipo="advertencia">
        {REVISTAS[revista].nombreCorto} todavía no tiene una plantilla de {t.sin} con texto. Pídale a la Administradora que la
        escriba en Administración › Plantillas.
      </Alerta>
    )
  }
  if (!plantilla) return <p className="text-cuerpo-13 text-texto-secundario">Cargando las plantillas…</p>

  return (
    <div className="flex flex-col gap-3">
      <p className="text-cuerpo-14">
        Se enviará {t.frase} de {REVISTAS[revista].nombre}.
      </p>
      <div>
        <Boton variante="neutro" tamano="sm" onClick={() => setAbierto(!abierto)}>
          {abierto ? 'Ocultar el correo' : 'Ver o cambiar el correo'}
        </Boton>
      </div>

      {abierto && (
        <div className="flex flex-col gap-3">
          {lista.length > 1 && (
            <ListaDesplegable
              etiqueta={t.etiqueta}
              opciones={lista.map((p) => ({ valor: p.id, etiqueta: p.predeterminada ? `${p.nombre} (en uso)` : p.nombre }))}
              valor={plantilla.id}
              onCambio={estado.elegir}
            />
          )}
          <VistaDelCorreo estado={estado} alto={alto} />
        </div>
      )}
    </div>
  )
}

/** La vista previa; solo se pide al servidor cuando se abre. */
function VistaDelCorreo({ estado, alto }: { estado: EleccionDeCorreo; alto: string }) {
  const { revista, fin, asunto, cuerpo } = estado
  const texto = useRetrasado(cuerpo)
  const vista = useVistaCorreoDeEnvio(revista, fin, texto)
  return (
    <section aria-label="Así lo recibirá la persona" className="flex flex-col gap-2">
      <h3 className="text-etiqueta-13">Así lo recibirá la persona (con datos de ejemplo)</h3>
      <p className="text-cuerpo-13">
        <strong>Asunto:</strong> {rellenar(asunto, { ...DATOS_EJEMPLO, revista: REVISTAS[revista].nombre })}
      </p>
      {vista.isError ? (
        <Alerta tipo="error">{mensajeDeApi(vista.error, 'No fue posible mostrar el correo.')}</Alerta>
      ) : vista.data ? (
        <iframe
          title="Vista previa del correo"
          srcDoc={vista.data.html}
          sandbox=""
          className={`${alto} w-full rounded-lg border border-borde-base bg-white`}
        />
      ) : (
        <p className="text-cuerpo-13 text-texto-secundario">Preparando la vista previa…</p>
      )}
    </section>
  )
}
