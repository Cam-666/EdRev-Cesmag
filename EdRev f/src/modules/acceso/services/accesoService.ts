/* accesoService — llamadas HTTP del módulo de acceso. Los componentes nunca llaman a fetch directamente. */
import { solicitar } from '@/lib/api/cliente'
import type {
  CredencialesIngreso,
  EnlaceContrasena,
  RespuestaEnvioEnlace,
  RespuestaIngreso,
} from '@/types/acceso'

export function iniciarSesionApi(credenciales: CredencialesIngreso): Promise<RespuestaIngreso> {
  return solicitar<RespuestaIngreso>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credenciales),
  })
}

export function solicitarRecuperacionApi(correo: string): Promise<RespuestaEnvioEnlace> {
  return solicitar<RespuestaEnvioEnlace>('/auth/recuperar', {
    method: 'POST',
    body: JSON.stringify({ correo }),
  })
}

/** Para qué sirve el enlace y de quién es la cuenta; falla con 410 / 404 cuando no se puede usar. */
export function consultarEnlaceApi(token: string): Promise<EnlaceContrasena> {
  return solicitar<EnlaceContrasena>(`/auth/enlaces/${encodeURIComponent(token)}`)
}

export async function definirContrasenaApi(token: string, contrasena: string): Promise<void> {
  await solicitar<unknown>(`/auth/enlaces/${encodeURIComponent(token)}`, {
    method: 'POST',
    body: JSON.stringify({ contrasena }),
  })
}
