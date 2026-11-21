/*
 * NuevaPlantillaModal — crea una plantilla nueva. Pide tres cosas, con palabras sencillas: para qué revista es, cómo se
 * llama y para qué sirve (invitar a un par, agradecerle o un mensaje libre). Para qué sirve no se cambia después: así,
 * al asignar un par solo se ofrecen invitaciones y al emitir una constancia solo agradecimientos. Nace en blanco. La
 * constancia de cada revista ya existe y es única, por eso no se puede crear otra. No tiene diseño en Figma.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCrearPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'
import type { DatosNuevaPlantilla, Plantilla } from '@/types/plantilla'

type Fin = DatosNuevaPlantilla['fin']

const OPCIONES_FIN: Array<{ valor: Fin; etiqueta: string }> = [
  { valor: 'invitacion', etiqueta: 'Invitar a un par evaluador' },
  { valor: 'agradecimiento', etiqueta: 'Agradecer a un par evaluador' },
  { valor: 'mensaje', etiqueta: 'Mensaje libre para un par o un autor' },
]

const OPCIONES_REVISTA = (Object.keys(REVISTAS) as Revista[]).map((r) => ({
  valor: r,
  etiqueta: REVISTAS[r].nombre,
}))

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre de la plantilla.'),
})
type Datos = z.infer<typeof esquema>

export interface NuevaPlantillaModalProps {
  /** La revista que aparece elegida al abrir. */
  revista: Revista
  abierto: boolean
  onCerrar: () => void
  /** Recibe la plantilla creada para que la pantalla la abra y se pueda editar. */
  onCreada: (plantilla: Plantilla) => void
}

const FORMULARIO = 'formulario-nueva-plantilla'

/** Se monta solo mientras está abierto, así cada vez que se abre empieza vacío. */
export function NuevaPlantillaModal(props: NuevaPlantillaModalProps) {
  return props.abierto ? <Contenido {...props} /> : null
}

function Contenido({ revista: inicial, onCerrar, onCreada }: NuevaPlantillaModalProps) {
  const crear = useCrearPlantilla()
  const [revista, setRevista] = useState<Revista>(inicial)
  const [fin, setFin] = useState<Fin>('invitacion')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: '' },
  })

  function enviar(datos: Datos) {
    crear.mutate({ revista, nombre: datos.nombre, fin }, { onSuccess: onCreada })
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Nueva plantilla"
      descripcion="Elija la revista, póngale un nombre y diga para qué sirve. Se crea en blanco: después escriba el texto."
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={FORMULARIO} cargando={crear.isPending}>
            Crear plantilla
          </Boton>
        </>
      }
    >
      <form id={FORMULARIO} onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-3">
        {crear.isError && (
          <Alerta tipo="error">{mensajeDeApi(crear.error, 'No fue posible crear la plantilla.')}</Alerta>
        )}
        <ListaDesplegable
          etiqueta="Revista"
          opciones={OPCIONES_REVISTA}
          valor={revista}
          onCambio={(v) => setRevista(v as Revista)}
        />
        <CampoTexto etiqueta="Nombre" autoComplete="off" error={errors.nombre?.message} {...register('nombre')} />
        <ListaDesplegable
          etiqueta="¿Para qué es?"
          opciones={OPCIONES_FIN}
          valor={fin}
          onCambio={(v) => setFin(v as Fin)}
        />
      </form>
    </Modal>
  )
}
