/*
 * ParModal — register a peer, or edit one (e.g. to correct a bounced email). New peers carry the
 * data-treatment authorization checkbox; its date is stored. Area suggests the registered ones to
 * avoid duplicated names. No Figma design for the dialog.
 * Covers: RF-12, RF-13, RF-27 (correct the email), RNF-06 (Ley 1581 de 2012).
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { esquemaPar } from '../config/esquemas'
import type { ParForm } from '../config/esquemas'
import { useAreas } from '../hooks/usePares'
import { useEditarPar, useRegistrarPar } from '../hooks/useMutacionesPar'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { Casilla } from '@/components/common/Casilla'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import type { ParEvaluador } from '@/types/par'

export interface ParModalProps {
  abierto: boolean
  onCerrar: () => void
  /** The peer being edited; omit to register a new one. */
  par?: Pick<ParEvaluador, 'id' | 'nombre' | 'correo' | 'universidad' | 'area'>
  onGuardado?: (id: string) => void
}

const FORMULARIO = 'formulario-par'

/**
 * The content is mounted only while the dialog is open, so every opening starts with a clean form
 * (and a clean mutation state) instead of what was typed the previous time.
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
    control,
    formState: { errors },
  } = useForm<ParForm>({
    resolver: zodResolver(esquemaPar),
    defaultValues: {
      nombre: par?.nombre ?? '',
      correo: par?.correo ?? '',
      universidad: par?.universidad ?? '',
      area: par?.area ?? '',
      autorizoDatos: false,
    },
  })

  function enviar(v: ParForm) {
    if (par) {
      editar.mutate(
        { nombre: v.nombre, correo: v.correo, universidad: v.universidad, area: v.area },
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
          : 'El par se registra en la base de esta revista; no aparece en la otra.'
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
          ayuda="Texto libre: al escribir se sugieren las áreas ya registradas."
          error={errors.area?.message}
          {...register('area')}
        />
        <datalist id="areas-sugeridas">
          {(areas.data ?? []).map((a) => (
            <option key={a} value={a} />
          ))}
        </datalist>
        {!par && (
          <Controller
            control={control}
            name="autorizoDatos"
            render={({ field }) => (
              <Casilla
                etiqueta="El par autoriza el tratamiento de sus datos personales (Ley 1581 de 2012)"
                marcada={field.value}
                onCambio={field.onChange}
              />
            )}
          />
        )}
      </form>
    </Modal>
  )
}
