/*
 * DefinirContrasenaPage — the page the mail link opens (/acceso/contrasena?token=…): a new account
 * defines its password (RF-40) or a user who forgot it creates a new one (RF-46). The link lasts
 * 30 minutes and works once (RNF-04); an expired, used or wrong link says so and offers a new one.
 * Saving takes the user back to «Iniciar sesión» with the email filled in.
 * Covers: RF-40, RF-46, HU-28 (criterion 2), HU-29 (criterion 1), RNF-04, RNF-11.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { esquemaNuevaContrasena } from '../config/esquemas'
import type { DatosNuevaContrasena } from '../config/esquemas'
import { POLITICA_ACCESO } from '../config/politicaAcceso'
import { TarjetaAcceso } from '../components/TarjetaAcceso'
import { useDefinirContrasena, useEnlaceContrasena } from '../hooks/useEnlaceContrasena'
import { Alerta } from '@/components/common/Alerta'
import { Boton } from '@/components/common/Boton'
import { CampoContrasena } from '@/components/common/CampoContrasena'
import { ErrorApi } from '@/lib/api/cliente'
import { mensajeDeApi } from '@/lib/api/errores'
import { enmascararCorreo } from '@/lib/format'
import type { DetalleErrorEnlace } from '@/types/acceso'

const NO_VALIDO: Record<DetalleErrorEnlace['motivo'], { titulo: string; texto: string }> = {
  vencido: {
    titulo: 'El enlace venció',
    texto: `Los enlaces duran ${POLITICA_ACCESO.enlaceCaducaMinutos} minutos. Solicite uno nuevo.`,
  },
  usado: {
    titulo: 'El enlace ya se usó',
    texto: 'Cada enlace sirve una sola vez. Si necesita otra contraseña, solicite uno nuevo.',
  },
  invalido: {
    titulo: 'El enlace no es válido',
    texto: 'Revise que lo copió completo desde el correo, o solicite uno nuevo.',
  },
}

function motivoDeError(error: unknown): DetalleErrorEnlace['motivo'] | null {
  if (!(error instanceof ErrorApi)) return null
  const cuerpo = error.cuerpo as Partial<DetalleErrorEnlace> | undefined
  return cuerpo?.motivo ?? (error.estado === 404 ? 'invalido' : null)
}

export function DefinirContrasenaPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const enlace = useEnlaceContrasena(token)
  const definir = useDefinirContrasena(token)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DatosNuevaContrasena>({
    resolver: zodResolver(esquemaNuevaContrasena),
    defaultValues: { contrasena: '', confirmacion: '' },
  })

  const motivoNoValido = token === '' ? 'invalido' : motivoDeError(enlace.error ?? definir.error)
  if (motivoNoValido) {
    const { titulo, texto } = NO_VALIDO[motivoNoValido]
    return (
      <TarjetaAcceso titulo={titulo} subtitulo={texto}>
        <Link to="/acceso/recuperar" className="text-center text-etiqueta-13 text-texto-enlace">
          Solicitar un enlace nuevo
        </Link>
        <Link to="/acceso" className="text-center text-etiqueta-13 text-texto-enlace">
          Volver al inicio de sesión
        </Link>
      </TarjetaAcceso>
    )
  }

  if (enlace.isPending) {
    return (
      <TarjetaAcceso titulo="Definir contraseña" subtitulo="Verificando el enlace…">
        <p role="status" className="text-center text-cuerpo-13 text-texto-secundario">
          Cargando…
        </p>
      </TarjetaAcceso>
    )
  }

  if (!enlace.data) {
    return (
      <TarjetaAcceso titulo="Definir contraseña" subtitulo="No fue posible verificar el enlace">
        <Alerta tipo="error">Intente de nuevo en unos minutos.</Alerta>
        <Boton variante="secundario" className="w-full" onClick={() => void enlace.refetch()}>
          Reintentar
        </Boton>
      </TarjetaAcceso>
    )
  }

  const datos = enlace.data
  const activacion = datos.motivo === 'activacion'

  function guardar({ contrasena }: DatosNuevaContrasena) {
    definir.mutate(contrasena, {
      onSuccess: () =>
        navigate('/acceso', {
          replace: true,
          state: { correo: datos.correo, contrasenaDefinida: true },
        }),
    })
  }

  return (
    <TarjetaAcceso
      titulo={activacion ? 'Defina su contraseña' : 'Cree una contraseña nueva'}
      subtitulo={`${datos.nombre} · ${enmascararCorreo(datos.correo)}`}
    >
      <form onSubmit={handleSubmit(guardar)} noValidate className="flex flex-col gap-4">
        {definir.isError && (
          <Alerta tipo="error">
            {mensajeDeApi(definir.error, 'No fue posible guardar la contraseña.')}
          </Alerta>
        )}
        <CampoContrasena
          etiqueta="Nueva contraseña"
          autoComplete="new-password"
          ayuda={`Al menos ${POLITICA_ACCESO.contrasenaMinima} caracteres, con letras y números.`}
          error={errors.contrasena?.message}
          {...register('contrasena')}
        />
        <CampoContrasena
          etiqueta="Confirme la contraseña"
          autoComplete="new-password"
          error={errors.confirmacion?.message}
          {...register('confirmacion')}
        />
        <Boton type="submit" className="w-full" cargando={definir.isPending}>
          Guardar contraseña
        </Boton>
        <Link to="/acceso" className="text-center text-etiqueta-13 text-texto-enlace">
          Volver al inicio de sesión
        </Link>
      </form>
    </TarjetaAcceso>
  )
}
