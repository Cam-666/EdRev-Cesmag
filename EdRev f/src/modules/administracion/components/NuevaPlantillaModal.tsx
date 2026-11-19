/*
 * NuevaPlantillaModal — creates a new template of a journal: a free name and what it is for (the
 * invitation, the thank-you mail or the constancia). It starts as a copy of the template in use
 * for that purpose, so the person edits what already works instead of writing from scratch, and it
 * can be put in use at once. No Figma design for the dialog. Covers: RNF-19, RF-25, RF-30, RF-45.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { ETIQUETA_USO } from '../config/plantillas'
import { useCrearPlantilla } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { Casilla } from '@/components/common/Casilla'
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
  const [usarAhora, setUsarAhora] = useState(false)
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
    crear.mutate({ revista, nombre: datos.nombre, uso: datos.uso, usarAhora }, { onSuccess: onCreada })
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo="Nueva plantilla"
      descripcion={`Nueva plantilla de ${REVISTAS[revista].nombreCorto}. Se crea con el texto de la plantilla que se usa hoy para ese fin, para que usted solo cambie lo que necesite.`}
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
        <Casilla
          etiqueta="Usarla desde ahora en lugar de la actual"
          marcada={usarAhora}
          onCambio={setUsarAhora}
        />
      </form>
    </Modal>
  )
}
