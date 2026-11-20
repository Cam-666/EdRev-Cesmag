/*
 * EnviarCorreoModal — «Enviar correo» desde la ficha de un par o de un autor, en tres pasos que se ven en la
 * misma ventana: 1) desde qué revista sale (de ahí vienen el remitente y las plantillas), 2) qué plantilla de
 * mensaje se envía y 3) cómo lo recibirá la persona (vista previa). Un solo botón envía el correo. Si la persona no
 * tiene correo, se explica y no se puede enviar. Al terminar dice que el correo salió y dónde verlo.
 */
import { useState } from 'react'
import { useEnviarMensaje, usePlantillasDeMensaje, useVistaPreviaMensaje } from '../hooks/useMensajes'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
import type { DestinoMensaje } from '@/types/mensaje'
import type { Revista } from '@/types/revista'

export interface EnviarCorreoModalProps {
  abierto: boolean
  onCerrar: () => void
  destino: DestinoMensaje
  /** Nombre de la persona, para el título. */
  nombre: string
  /** Correo registrado de la persona (puede faltar en un autor). */
  correo: string | null
}

const OPCIONES_REVISTA = (Object.keys(REVISTAS) as Revista[]).map((r) => ({
  valor: r,
  etiqueta: REVISTAS[r].nombre,
}))

/** Se monta solo mientras está abierto, así cada vez que se abre empieza desde el primer paso. */
export function EnviarCorreoModal(props: EnviarCorreoModalProps) {
  return props.abierto ? <Contenido {...props} /> : null
}

function Contenido({ onCerrar, destino, nombre, correo }: EnviarCorreoModalProps) {
  const [revista, setRevista] = useState<Revista>('reep')
  const [elegida, setElegida] = useState<string | null>(null)
  const plantillas = usePlantillasDeMensaje(revista, true)
  const lista = plantillas.data ?? []
  // La plantilla elegida; mientras no se elija una (o si cambió la revista) se propone la primera de la lista.
  const plantilla = lista.find((p) => p.id === elegida)?.id ?? lista[0]?.id ?? null
  const vista = useVistaPreviaMensaje(revista, destino, plantilla)
  const enviar = useEnviarMensaje(revista)
  const [enviado, setEnviado] = useState<string | null>(null)
  const sinCorreo = !correo || !correo.trim()

  function enviarCorreo() {
    if (!plantilla) return
    enviar.mutate({ destino, plantillaId: plantilla }, { onSuccess: (r) => setEnviado(r.destinatario) })
  }

  if (enviado) {
    return (
      <Modal
        abierto
        onCerrar={onCerrar}
        titulo="Correo enviado"
        descripcion={`Se envió el correo a ${nombre} (${enviado}).`}
        acciones={<Boton onClick={onCerrar}>Listo</Boton>}
      >
        <Alerta tipo="exito">
          Puede ver este mensaje en «Correos enviados» de {REVISTAS[revista].nombreCorto}.
        </Alerta>
      </Modal>
    )
  }

  return (
    <Modal
      abierto
      ancho="amplio"
      onCerrar={onCerrar}
      titulo={`Enviar correo a ${nombre}`}
      descripcion="Elija desde qué revista y con qué plantilla, revise cómo queda y pulse «Enviar correo»."
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            onClick={enviarCorreo}
            cargando={enviar.isPending}
            disabled={sinCorreo || !plantilla || vista.isError}
          >
            Enviar correo
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {sinCorreo && (
          <Alerta tipo="advertencia">
            {nombre} no tiene un correo registrado. Pulse «Editar» en su ficha, escriba el correo y vuelva a
            intentarlo.
          </Alerta>
        )}
        {enviar.isError && (
          <Alerta tipo="error">{mensajeDeApi(enviar.error, 'No fue posible enviar el correo.')}</Alerta>
        )}

        <ListaDesplegable
          etiqueta="1. ¿Desde qué revista se envía?"
          opciones={OPCIONES_REVISTA}
          valor={revista}
          onCambio={(v) => {
            setRevista(v as Revista)
            setElegida(null)
          }}
        />

        {plantillas.isError ? (
          <Alerta tipo="error">No fue posible cargar las plantillas. Intente de nuevo.</Alerta>
        ) : lista.length === 0 && plantillas.data ? (
          <Alerta tipo="informacion">
            Esta revista todavía no tiene plantillas de mensaje. Pídale a la Administradora que cree una en
            Administración › Plantillas.
          </Alerta>
        ) : (
          <ListaDesplegable
            etiqueta="2. ¿Qué plantilla quiere enviar?"
            opciones={lista.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
            valor={plantilla ?? undefined}
            onCambio={setElegida}
          />
        )}

        {plantilla && (
          <section aria-labelledby="titulo-previa-mensaje" className="flex flex-col gap-2">
            <h3 id="titulo-previa-mensaje" className="text-etiqueta-13">
              3. Así lo recibirá la persona
            </h3>
            {vista.isError ? (
              <Alerta tipo="error">{mensajeDeApi(vista.error, 'No fue posible mostrar el correo.')}</Alerta>
            ) : vista.data ? (
              <>
                <p className="text-cuerpo-13">
                  <strong>Para:</strong> {vista.data.para.nombre}
                  {vista.data.para.correo ? ` (${vista.data.para.correo})` : ''}
                  <br />
                  <strong>Asunto:</strong> {vista.data.asunto}
                </p>
                <iframe
                  title="Vista previa del correo"
                  srcDoc={vista.data.html}
                  sandbox=""
                  className="h-[65vh] min-h-[480px] w-full rounded-lg border border-borde-base bg-white"
                />
              </>
            ) : (
              <p className="text-cuerpo-13 text-texto-secundario">Preparando la vista previa…</p>
            )}
          </section>
        )}
      </div>
    </Modal>
  )
}
