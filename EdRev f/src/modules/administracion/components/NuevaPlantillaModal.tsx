/*
 * NuevaPlantillaModal — crea una plantilla nueva de una revista: solo pide el nombre. Nace en blanco como «correo
 * libre»; el uso (invitación, agradecimiento o libre) se elige después, en la propia plantilla. La constancia de cada
 * revista ya existe y es única, por eso no se puede crear otra. No tiene diseño en Figma.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { useCrearPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'
import type { Plantilla } from '@/types/plantilla'


const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre de la plantilla.'),
})
type Datos = z.infer<typeof esquema>

export interface NuevaPlantillaModalProps {
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

function Contenido({ revista, onCerrar, onCreada }: NuevaPlantillaModalProps) {
  const crear = useCrearPlantilla()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: '' },
  })

  function enviar(datos: Datos) {
    crear.mutate({ revista, nombre: datos.nombre }, { onSuccess: onCreada })
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Nueva plantilla"
      descripcion={`Nueva plantilla de ${REVISTAS[revista].nombreCorto}. Se crea en blanco: después elige para qué se usa y escribe el texto.`}
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
      <form
        id={FORMULARIO}
        onSubmit={handleSubmit(enviar)}
        noValidate
        className="flex flex-col gap-3"
      >
        {crear.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(crear.error, 'No fue posible crear la plantilla.')}
          </Alerta>
        )}
        <CampoTexto
          etiqueta="Nombre"
          autoComplete="off"
          error={errors.nombre?.message}
          {...register('nombre')}
        />
      </form>
    </Modal>
  )
}
