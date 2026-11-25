/*
 * EnviarCorreoModal — «Enviar correo» desde la ficha de un par o de un autor, en tres pasos que se ven en la
 * misma ventana: 1) desde qué revista sale (de ahí vienen el remitente y las plantillas), 2) qué se envía: una
 * plantilla de mensaje o un mensaje escrito ahí mismo, y 3) cómo lo recibirá la persona (vista previa). Un mensaje
 * escrito al enviar no se guarda como plantilla: solo queda en el registro del correo enviado. Puede partir del
 * texto de una plantilla y ajustarlo para este envío. Un solo botón envía el correo. Si la persona no tiene correo,
 * se explica y no se puede enviar. Al terminar dice que el correo salió y dónde verlo.
 * (La invitación y el agradecimiento a los pares no se envían desde aquí: salen al asignar un par y al emitir una
 * constancia.)
 */
import { useState } from 'react'
import {
  useEnviarMensaje,
  usePlantillasDeMensaje,
  useVistaPreviaMensaje,
} from '../hooks/useMensajes'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import { DATOS_MENSAJE } from '@/lib/datosPlantilla'
import { useRetrasado } from '@/lib/useRetrasado'
import { EditorTexto } from '@/modules/administracion/components/EditorTexto'
import { REVISTAS } from '@/types/revista'
import type { ContenidoMensaje, DestinoMensaje } from '@/types/mensaje'
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

type Modo = 'plantilla' | 'escrito'

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
  const [modo, setModo] = useState<Modo>('plantilla')
  const [elegida, setElegida] = useState<string | null>(null)
  const [asunto, setAsunto] = useState('')
  const [cuerpo, setCuerpo] = useState('')
  const plantillas = usePlantillasDeMensaje(revista, true)
  const lista = plantillas.data ?? []
  // La plantilla elegida; mientras no se elija una (o si cambió la revista) se propone la primera de la lista.
  const plantilla = lista.find((p) => p.id === elegida) ?? lista[0] ?? null
  // El texto escrito se previsualiza cuando deja de cambiar, para no pedir una vista por cada tecla.
  const asuntoEscrito = useRetrasado(asunto, 500)
  const cuerpoEscrito = useRetrasado(cuerpo, 500)
  const contenido: ContenidoMensaje | null =
    modo === 'plantilla'
      ? plantilla
        ? { plantillaId: plantilla.id }
        : null
      : cuerpoEscrito.trim()
        ? { texto: { asunto: asuntoEscrito, cuerpo: cuerpoEscrito } }
        : null
  const vista = useVistaPreviaMensaje(revista, destino, contenido)
  const enviar = useEnviarMensaje(revista)
  const [enviado, setEnviado] = useState<string | null>(null)
  const sinCorreo = !correo || !correo.trim()
  const sinTexto = modo === 'escrito' && !cuerpo.trim()

  /** Pasa a escribir el mensaje; si todavía no hay nada escrito, parte del texto de la plantilla elegida. */
  function escribir() {
    if (!cuerpo.trim() && plantilla) {
      setAsunto(plantilla.asunto)
      setCuerpo(plantilla.cuerpo)
    }
    setModo('escrito')
  }

  function enviarCorreo() {
    // Se envía lo que está escrito en ese momento, aunque la vista previa aún no se haya puesto al día.
    const actual: ContenidoMensaje | null =
      modo === 'plantilla'
        ? plantilla
          ? { plantillaId: plantilla.id }
          : null
        : { texto: { asunto, cuerpo } }
    if (!actual) return
    enviar.mutate({ destino, contenido: actual }, { onSuccess: (r) => setEnviado(r.destinatario) })
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
      descripcion="Elija desde qué revista se envía, use una plantilla o escriba el mensaje, revise cómo queda y pulse «Enviar correo»."
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton
            onClick={enviarCorreo}
            cargando={enviar.isPending}
            disabled={
              sinCorreo || sinTexto || (modo === 'plantilla' && (!plantilla || vista.isError))
            }
          >
            Enviar correo
          </Boton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {sinCorreo && (
          <Alerta tipo="advertencia">
            {nombre} no tiene un correo registrado. Pulse «Editar» en su ficha, escriba el correo y
            vuelva a intentarlo.
          </Alerta>
        )}
        {enviar.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(enviar.error, 'No fue posible enviar el correo.')}
          </Alerta>
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

        <div className="flex flex-col gap-2">
          <p id="modo-mensaje" className="text-etiqueta-13">
            2. ¿Qué mensaje quiere enviar?
          </p>
          <div role="group" aria-labelledby="modo-mensaje" className="flex flex-wrap gap-2">
            <Boton
              tamano="sm"
              variante={modo === 'plantilla' ? 'secundario' : 'neutro'}
              aria-pressed={modo === 'plantilla'}
              onClick={() => setModo('plantilla')}
            >
              Usar una plantilla
            </Boton>
            <Boton
              tamano="sm"
              variante={modo === 'escrito' ? 'secundario' : 'neutro'}
              aria-pressed={modo === 'escrito'}
              onClick={escribir}
            >
              Escribir el mensaje
            </Boton>
          </div>
        </div>

        {modo === 'plantilla' ? (
          plantillas.isError ? (
            <Alerta tipo="error">No fue posible cargar las plantillas. Intente de nuevo.</Alerta>
          ) : lista.length === 0 && plantillas.data ? (
            <Alerta tipo="informacion">
              Esta revista todavía no tiene plantillas de mensaje. Pulse «Escribir el mensaje» para
              redactarlo aquí mismo, o cree una plantilla en Administración › Plantillas.
            </Alerta>
          ) : (
            <div className="flex flex-col gap-2">
              <ListaDesplegable
                etiqueta="Plantilla"
                opciones={lista.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
                valor={plantilla?.id}
                onCambio={setElegida}
              />
              {plantilla && (
                <p className="text-cuerpo-13 text-texto-secundario">
                  ¿Quiere cambiar algo solo para este envío? Pulse «Escribir el mensaje»: se copia
                  el texto de la plantilla y puede editarlo sin modificar la plantilla.
                </p>
              )}
            </div>
          )
        ) : (
          <div className="flex flex-col gap-2">
            <Alerta tipo="informacion">
              Este mensaje se envía solo esta vez: no se guarda como plantilla. Los datos entre
              corchetes se reemplazan por los de {nombre}.
            </Alerta>
            <EditorTexto
              valor={cuerpo}
              onCambio={setCuerpo}
              asunto={asunto}
              onAsunto={setAsunto}
              datos={[...DATOS_MENSAJE]}
            />
          </div>
        )}

        {contenido && (
          <section aria-labelledby="titulo-previa-mensaje" className="flex flex-col gap-2">
            <h3 id="titulo-previa-mensaje" className="text-etiqueta-13">
              3. Así lo recibirá la persona
            </h3>
            {vista.isError ? (
              <Alerta tipo="error">
                {mensajeDeApi(vista.error, 'No fue posible mostrar el correo.')}
              </Alerta>
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
                  className="bg-white h-[65vh] min-h-[480px] w-full rounded-lg border border-borde-base"
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
