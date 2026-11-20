/*
 * ParModal — registra un par o edita uno (por ejemplo para corregir un correo rebotado). El área sugiere las ya
 * registradas para evitar nombres duplicados; si el correo ya existe, se avisa. No tiene diseño en Figma.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { esquemaPar } from '../config/esquemas'
import type { ParForm } from '../config/esquemas'
import { useAreas } from '../hooks/usePares'
import { useEditarPar, useRegistrarPar } from '../hooks/useMutacionesPar'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ParEvaluador } from '@/types/par'

export interface ParModalProps {
  abierto: boolean
  onCerrar: () => void
  /** El par que se edita; se omite para registrar uno nuevo. */
  par?: Pick<ParEvaluador, 'id' | 'nombre' | 'profesion' | 'correo' | 'universidad' | 'area'>
  onGuardado?: (id: string) => void
}

const FORMULARIO = 'formulario-par'

/**
 * El contenido se monta solo mientras el diálogo está abierto, así cada vez que se abre empieza con un formulario
 * limpio (y un estado de mutación limpio) en lugar de lo que se escribió la vez anterior.
 */
export function ParModal(props: ParModalProps) {
  return props.abierto ? <ContenidoParModal {...props} /> : null
}

function ContenidoParModal({ abierto, onCerrar, par, onGuardado }: ParModalProps) {
  const areas = useAreas()
  const registrar = useRegistrarPar()
  const editar = useEditarPar(par?.id ?? '')
  const mutacion = par ? editar : registrar

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ParForm>({
    resolver: zodResolver(esquemaPar),
    defaultValues: {
      nombre: par?.nombre ?? '',
      profesion: par?.profesion ?? '',
      correo: par?.correo ?? '',
      universidad: par?.universidad ?? '',
      area: par?.area ?? '',
    },
  })


  function enviar(v: ParForm) {
    if (par) {
      editar.mutate(
        {
          nombre: v.nombre,
          profesion: v.profesion,
          correo: v.correo,
          universidad: v.universidad,
          area: v.area,
        },
        {
          onSuccess: () => {
            onGuardado?.(par.id)
            onCerrar()
          },
        },
      )
    } else {
      registrar.mutate(v, {
        onSuccess: (creado) => {
          onGuardado?.(creado.id)
          onCerrar()
        },
      })
    }
  }

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={par ? 'Editar par evaluador' : 'Registrar par evaluador'}
      descripcion={
        par
          ? 'Corrija los datos del par. Si cambia el correo, podrá reenviar la invitación.'
          : 'El par queda en la base común y puede evaluar para las dos revistas.'
      }
      acciones={
        <>
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={FORMULARIO} cargando={mutacion.isPending}>
            {par ? 'Guardar cambios' : 'Registrar par'}
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
        {mutacion.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(
              mutacion.error,
              'No fue posible guardar. Intente de nuevo en unos minutos.',
            )}
          </Alerta>
        )}
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
          list="areas-sugeridas"
          autoComplete="off"
          ayuda="Escriba el área libremente; al hacerlo se sugerirán las áreas ya registradas."
          error={errors.area?.message}
          {...register('area')}
        />
        <datalist id="areas-sugeridas">
          {(areas.data ?? []).map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
      </form>
    </Modal>
  )
}
