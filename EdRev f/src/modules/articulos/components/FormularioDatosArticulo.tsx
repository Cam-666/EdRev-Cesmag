/*
 * FormularioDatosArticulo — datos del artículo en el formulario de registro: número de OJS, fecha de
 * postulación, título, tipo y la revista (la fija la URL, se muestra solo de lectura). Advierte, sin bloquear,
 * cuando el número de OJS ya existe en esta revista.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { TIPOS_ARTICULO } from '../config/listas'
import { esquemaDatosArticulo } from '../config/esquemas'
import type { DatosArticuloForm } from '../config/esquemas'
import type { DatosBorrador } from '../hooks/useBorradorArticulo'
import { useExisteNumeroOjs } from '../hooks/useExisteNumeroOjs'
import { Alerta } from '@/components/common/Alerta'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { useRevista } from '@/lib/revista/useRevista'

export interface FormularioDatosArticuloProps {
  /** Id del <form>, para que el botón del encabezado («Guardar artículo») pueda enviarlo. */
  idFormulario: string
  valoresIniciales: DatosBorrador | null
  onContinuar: (datos: DatosBorrador) => void
}

function hoy(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

export function FormularioDatosArticulo({
  idFormulario,
  valoresIniciales,
  onContinuar,
}: FormularioDatosArticuloProps) {
  const { revista, datos } = useRevista()
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<DatosArticuloForm>({
    resolver: zodResolver(esquemaDatosArticulo),
    defaultValues: valoresIniciales ?? {
      numeroOjs: '',
      fechaPostulacion: hoy(),
      titulo: '',
      tipo: '',
    },
  })

  const numero = useWatch({ control, name: 'numeroOjs' })
  const existe = useExisteNumeroOjs(numero)
  const repetido = existe.data?.existe === true && numero.trim() !== ''

  return (
    <form
      id={idFormulario}
      onSubmit={handleSubmit((valores) => onContinuar(valores))}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <h2 className="text-titulo-16">Datos del artículo</h2>

      {repetido && (
        <Alerta
          tipo="advertencia"
          accion={
            existe.data?.id ? (
              <Link
                to={`/${revista}/articulos/${encodeURIComponent(existe.data.id)}`}
                className="text-etiqueta-13 text-texto-enlace"
              >
                Ver <span className="sr-only">el artículo {numero.trim()}</span>
              </Link>
            ) : undefined
          }
        >
          El número {numero.trim()} ya está registrado en esta revista. Puede corregirlo o
          continuar.
        </Alerta>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CampoTexto
          etiqueta="Número de OJS"
          placeholder="2026-035"
          autoComplete="off"
          ayuda={repetido ? `Ya existe en ${datos.nombreCorto}.` : undefined}
          error={errors.numeroOjs?.message}
          {...register('numeroOjs')}
        />
        <CampoTexto
          etiqueta="Fecha de postulación"
          type="date"
          error={errors.fechaPostulacion?.message}
          {...register('fechaPostulacion')}
        />
      </div>
      <CampoTexto etiqueta="Título" error={errors.titulo?.message} {...register('titulo')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          control={control}
          name="tipo"
          render={({ field }) => (
            <ListaDesplegable
              etiqueta="Tipo de artículo"
              opciones={TIPOS_ARTICULO}
              valor={field.value || undefined}
              onCambio={field.onChange}
              error={errors.tipo?.message}
            />
          )}
        />
        <CampoTexto etiqueta="Revista" value={datos.nombreCorto} readOnly disabled />
      </div>
    </form>
  )
}
