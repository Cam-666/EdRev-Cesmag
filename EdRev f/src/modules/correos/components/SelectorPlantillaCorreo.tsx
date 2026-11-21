/*
 * SelectorPlantillaCorreo — lo que se ve al enviar una invitación o un agradecimiento: la plantilla de la revista
 * (la predeterminada sale elegida), un botón para cambiar el texto solo de este correo y cómo lo recibirá la
 * persona. Funciona con el estado de useEleccionCorreo, que guarda la elección para enviarla.
 */
import type { EleccionDeCorreo } from '../hooks/useEleccionCorreo'
import { useVistaCorreoDeEnvio } from '../hooks/useMensajes'
import { EditorTexto } from '@/modules/administracion/components/EditorTexto'
import { DATOS_EJEMPLO } from '@/modules/administracion/config/plantillas'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { mensajeDeApi } from '@/lib/api/errores'
import { aGuardado, aVisible } from '@/lib/datosPlantilla'
import { rellenar } from '@/lib/plantillas'
import { useRetrasado } from '@/lib/useRetrasado'
import { REVISTAS } from '@/types/revista'

export interface SelectorPlantillaCorreoProps {
  estado: EleccionDeCorreo
  /** Cómo se llama el correo en las frases: «la invitación» o «el agradecimiento». */
  nombre: string
  /** Clases del alto de la vista previa. */
  alto?: string
}

export function SelectorPlantillaCorreo({ estado, nombre, alto = 'h-[45vh] min-h-[320px]' }: SelectorPlantillaCorreoProps) {
  const { revista, fin, consulta, lista, plantilla, asunto, cuerpo, editando } = estado
  const texto = useRetrasado(cuerpo)
  const vista = useVistaCorreoDeEnvio(revista, fin, texto)

  if (consulta.isError) return <Alerta tipo="error">No fue posible cargar las plantillas. Intente de nuevo.</Alerta>
  if (consulta.data && !plantilla) {
    return (
      <Alerta tipo="advertencia">
        {REVISTAS[revista].nombreCorto} todavía no tiene una plantilla de {fin === 'invitacion' ? 'invitación' : 'agradecimiento'} con
        texto. Pídale a la Administradora que la escriba en Administración › Plantillas.
      </Alerta>
    )
  }
  if (!plantilla) return <p className="text-cuerpo-13 text-texto-secundario">Cargando las plantillas…</p>

  return (
    <div className="flex flex-col gap-3">
      <ListaDesplegable
        etiqueta={`Plantilla de ${nombre}`}
        opciones={lista.map((p) => ({ valor: p.id, etiqueta: p.predeterminada ? `${p.nombre} (la habitual)` : p.nombre }))}
        valor={plantilla.id}
        onCambio={estado.elegir}
      />

      {editando ? (
        <div className="flex flex-col gap-3 rounded-lg border border-borde-fuerte bg-superficie-sutil p-3">
          <p className="text-cuerpo-13 text-texto-secundario">
            Los cambios son solo para este correo: la plantilla no se modifica.
          </p>
          <CampoTexto
            etiqueta="Asunto"
            value={aVisible(asunto)}
            onChange={(e) => estado.cambiarAsunto(aGuardado(e.target.value))}
          />
          <EditorTexto valor={cuerpo ?? ''} onCambio={estado.cambiarCuerpo} datos={plantilla.variables} />
          <div>
            <Boton variante="neutro" tamano="sm" onClick={estado.volverALaPlantilla}>
              Volver al texto de la plantilla
            </Boton>
          </div>
        </div>
      ) : (
        <div>
          <Boton variante="secundario" tamano="sm" onClick={estado.empezarAEditar}>
            Cambiar el texto de este correo
          </Boton>
        </div>
      )}

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
    </div>
  )
}
