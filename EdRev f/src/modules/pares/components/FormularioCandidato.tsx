/*
 * FormularioCandidato — registra un candidato nuevo mientras se asignan pares: nombre, profesión, correo,
 * universidad y área temática (sugiere las ya registradas). Al guardar, el par queda en la base común de pares
 * y la invitación se envía de inmediato.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
    formState: { errors },
  } = useForm<CandidatoForm>({
    resolver: zodResolver(esquemaCandidato),
    defaultValues: { nombre: '', profesion: '', correo: '', universidad: '', area: '' },
  })

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
