/*
 * UsuarioModal — create or edit an account of the dependency (name, institutional email, profile)
 * and enable / disable it. A disabled account cannot log in but keeps its history of actions.
 * The Administradora never sets passwords: a new account receives a link to define its own, which
 * can be sent again while the account has not entered (RF-40).
 * No Figma design for the dialog. Covers: RF-40, HU-29, RNF-05.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { PERFILES } from '../config/perfiles'
import { useCrearUsuario, useEditarUsuario, useReenviarEnlace } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoTexto } from '@/components/common/CampoTexto'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { Modal } from '@/components/common/Modal'
import { mensajeDeApi } from '@/lib/api/errores'
import type { Perfil, Usuario } from '@/types/usuario'

const esquema = z.object({
  nombre: z.string().trim().min(1, 'Escriba el nombre.'),
  correo: z
    .string()
    .trim()
    .min(1, 'Escriba el correo institucional.')
    .regex(
      /^[^\s@]+@unicesmag\.edu\.co$/i,
      'Use un correo institucional, por ejemplo nombre.apellido@unicesmag.edu.co.',
    ),
  perfil: z.enum(['administrador', 'auxiliar']),
})
type Datos = z.infer<typeof esquema>

export interface UsuarioModalProps {
  abierto: boolean
  onCerrar: () => void
  /** The account being edited; omit to create one. */
  usuario?: Usuario
  /** Reports that a password link was sent (`enlaceDemo` only comes from the mock API). */
  onEnlaceEnviado?: (correo: string, enlaceDemo?: string) => void
}

const FORMULARIO = 'formulario-usuario'

/** Mounted only while open so every opening starts from the saved data. */
export function UsuarioModal(props: UsuarioModalProps) {
  return props.abierto ? <Contenido {...props} /> : null
}

function Contenido({ onCerrar, usuario, onEnlaceEnviado }: UsuarioModalProps) {
  const crear = useCrearUsuario()
  const editar = useEditarUsuario()
  const reenviar = useReenviarEnlace()
  const mutacion = usuario ? editar : crear
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Datos>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: usuario?.nombre ?? '',
      correo: usuario?.correo ?? '',
      perfil: usuario?.perfil ?? 'auxiliar',
    },
  })

  function enviar(datos: Datos) {
    if (usuario) editar.mutate({ id: usuario.id, cambios: datos }, { onSuccess: onCerrar })
    else
      crear.mutate(datos, {
        onSuccess: (creado) => {
          onEnlaceEnviado?.(creado.correo, creado.enlaceDemo)
          onCerrar()
        },
      })
  }

  function cambiarEstado() {
    if (!usuario) return
    editar.mutate(
      {
        id: usuario.id,
        cambios: { estado: usuario.estado === 'activo' ? 'inhabilitado' : 'activo' },
      },
      { onSuccess: onCerrar },
    )
  }

  return (
    <Modal
      abierto
      onCerrar={onCerrar}
      titulo={usuario ? 'Editar usuario' : 'Crear usuario'}
      descripcion={
        usuario
          ? 'Cambie los datos o el perfil. Una cuenta inhabilitada conserva su historial.'
          : 'El usuario recibirá en su correo un enlace para definir su contraseña.'
      }
      acciones={
        <>
          {usuario && usuario.estado === 'activo' && !usuario.ultimoIngreso && (
            <Boton
              variante="secundario"
              cargando={reenviar.isPending}
              onClick={() =>
                reenviar.mutate(usuario.id, {
                  onSuccess: (r) => {
                    onEnlaceEnviado?.(usuario.correo, r.enlaceDemo)
                    onCerrar()
                  },
                })
              }
            >
              Reenviar enlace
            </Boton>
          )}
          {usuario && (
            <Boton
              variante={usuario.estado === 'activo' ? 'peligro' : 'secundario'}
              onClick={cambiarEstado}
              disabled={mutacion.isPending}
            >
              {usuario.estado === 'activo' ? 'Inhabilitar' : 'Habilitar'}
            </Boton>
          )}
          <Boton variante="neutro" onClick={onCerrar}>
            Cancelar
          </Boton>
          <Boton type="submit" form={FORMULARIO} cargando={mutacion.isPending}>
            {usuario ? 'Guardar cambios' : 'Crear usuario'}
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
        {reenviar.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(reenviar.error, 'No fue posible reenviar el enlace.')}
          </Alerta>
        )}
        {mutacion.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(mutacion.error, 'No fue posible guardar la cuenta.')}
          </Alerta>
        )}
        <CampoTexto
          etiqueta="Nombre"
          autoComplete="off"
          error={errors.nombre?.message}
          {...register('nombre')}
        />
        <CampoTexto
          etiqueta="Correo institucional"
          type="email"
          autoComplete="off"
          error={errors.correo?.message}
          {...register('correo')}
        />
        <Controller
          control={control}
          name="perfil"
          render={({ field }) => (
            <ListaDesplegable
              etiqueta="Perfil"
              opciones={PERFILES}
              valor={field.value}
              onCambio={(v) => field.onChange(v as Perfil)}
            />
          )}
        />
      </form>
    </Modal>
  )
}
