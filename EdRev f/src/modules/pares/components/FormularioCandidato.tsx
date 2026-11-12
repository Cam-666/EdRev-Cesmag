/*
 * FormularioCandidato — registers a brand-new candidate while assigning peers: name, profession,
 * email, university and thematic area (suggesting the ones already registered). Saving stores the peer in
 * the journal's base and sends the invitation right away. Covers: RF-12, RF-13, RF-19, RF-24.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { AvisoOtraRevista } from './AvisoOtraRevista'
import { esquemaCandidato } from '../config/esquemas'
import type { CandidatoForm } from '../config/esquemas'
import { useAreas } from '../hooks/usePares'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'

export interface FormularioCandidatoProps {
  enviando: boolean
  onEnviar: (datos: CandidatoForm, limpiar: () => void) => void
}

export function FormularioCandidato({ enviando, onEnviar }: FormularioCandidatoProps) {
  const areas = useAreas()
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<CandidatoForm>({
    resolver: zodResolver(esquemaCandidato),
    defaultValues: { nombre: '', profesion: '', correo: '', universidad: '', area: '' },
  })
  const correo = useWatch({ control, name: 'correo' })

  return (
    <form
      onSubmit={handleSubmit((datos) => onEnviar(datos, () => reset()))}
      noValidate
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
    >
      <CampoTexto
        etiqueta="Nombre"
        autoComplete="off"
        error={errors.nombre?.message}
        {...register('nombre')}
      />
      <CampoTexto
        etiqueta="Profesión o título"
        autoComplete="off"
        error={errors.profesion?.message}
        {...register('profesion')}
      />
      <CampoTexto
        etiqueta="Correo electrónico"
        type="email"
        autoComplete="off"
        error={errors.correo?.message}
        {...register('correo')}
      />
      <div className="md:col-span-2">
        <AvisoOtraRevista
          correo={correo}
          onCopiar={(otro) => {
            setValue('nombre', otro.nombre, { shouldValidate: true })
            setValue('profesion', otro.profesion, { shouldValidate: true })
            setValue('universidad', otro.universidad, { shouldValidate: true })
            setValue('area', otro.area, { shouldValidate: true })
          }}
        />
      </div>
      <CampoTexto
        etiqueta="Universidad"
        autoComplete="off"
        error={errors.universidad?.message}
        {...register('universidad')}
      />
      <CampoTexto
        etiqueta="Área temática"
        list="areas-candidato"
        autoComplete="off"
        error={errors.area?.message}
        {...register('area')}
      />
      <datalist id="areas-candidato">
        {(areas.data ?? []).map((a) => (
          <option key={a} value={a} />
        ))}
      </datalist>
      <div className="md:col-span-2">
        <Boton type="submit" cargando={enviando}>
          Registrar y enviar invitación
        </Boton>
      </div>
    </form>
  )
}
