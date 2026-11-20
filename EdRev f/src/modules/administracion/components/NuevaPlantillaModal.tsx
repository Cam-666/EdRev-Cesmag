/*
 * NuevaPlantillaModal — crea una plantilla nueva de una revista: un nombre libre y para qué sirve (la invitación,
 * el correo de agradecimiento o la constancia). Se crea en blanco: la persona la escribe y, cuando tiene texto,
 * la elige en Configuración. No tiene diseño en Figma.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ETIQUETA_USO } from '../config/plantillas'
import { useCrearPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'
import type { Plantilla, UsoPlantilla } from '@/types/plantilla'

const USOS: UsoPlantilla[] = ['invitacion', 'agradecimiento', 'constancia']

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre de la plantilla.'),
  uso: z.enum(['invitacion', 'agradecimiento', 'constancia']),
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
    control,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: '', uso: 'invitacion' },
  })

  function enviar(datos: Datos) {
    crear.mutate({ revista, nombre: datos.nombre, uso: datos.uso }, { onSuccess: onCreada })
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Nueva plantilla"
      descripcion={`Nueva plantilla de ${REVISTAS[revista].nombreCorto}. Se crea en blanco: usted escribe el texto y, cuando lo tenga, la elige en Configuración.`}
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
        <Controller
          control={control}
          name="uso"
          render={({ field }) => (
            <ListaDesplegable
              etiqueta="¿Para qué se usará?"
              opciones={USOS.map((u) => ({ valor: u, etiqueta: ETIQUETA_USO[u] }))}
              valor={field.value}
              onCambio={(v) => field.onChange(v as UsoPlantilla)}
            />
          )}
        />
      </form>
    </Modal>
  )
}
