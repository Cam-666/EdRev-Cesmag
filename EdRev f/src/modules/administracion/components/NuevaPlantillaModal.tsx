/*
 * NuevaPlantillaModal — creates a new template of a journal for one use (invitation, thank-you
 * mail or constancia). It starts from the text (and PDF background) of that journal's template in
 * use and is then edited like any other; it is not sent until it is chosen with «Usar en los
 * envíos». No Figma design for the dialog.
 * Covers: RNF-19, RF-25, RF-30.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { USOS_PLANTILLA } from '../config/plantillas'
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

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre de la plantilla.'),
  uso: z.enum(['invitacion', 'agradecimiento', 'constancia']),
})
type Datos = z.infer<typeof esquema>

export interface NuevaPlantillaModalProps {
  revista: Revista
  abierto: boolean
  onCerrar: () => void
  /** Receives the created template so the screen can open it for editing. */
  onCreada: (plantilla: Plantilla) => void
}

const FORMULARIO = 'formulario-nueva-plantilla'

/** Mounted only while open so every opening starts empty. */
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
    crear.mutate({ ...datos, revista }, { onSuccess: onCreada })
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Nueva plantilla"
      descripcion={`${REVISTAS[revista].nombreCorto}: parte del texto de la plantilla en uso.`}
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
              etiqueta="Uso"
              opciones={USOS_PLANTILLA}
              valor={field.value}
              onCambio={(v) => field.onChange(v as UsoPlantilla)}
            />
          )}
        />
      </form>
    </Modal>
  )
}
