/* Mutaciones sobre la base de pares: registrar, editar, bloquear y desbloquear. */
import { useMutation } from '@tanstack/react-query'
import { bloquearPar, desbloquearPar, editarPar, registrarPar } from '../services/paresService'
import { useInvalidarPares } from './useInvalidarPares'
import { useRevistaDatos } from '@/lib/revista/useRevista'
import type { MotivoBloqueo, NuevoPar, ParEvaluador } from '@/types/par'

export function useRegistrarPar() {
  const revista = useRevistaDatos()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: (datos: NuevoPar) => registrarPar(revista, datos),
    onSuccess: invalidar,
  })
}

export function useEditarPar(id: string) {
  const revista = useRevistaDatos()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: (
      cambios: Partial<
        Pick<ParEvaluador, 'nombre' | 'profesion' | 'correo' | 'universidad' | 'area'>
      >,
    ) => editarPar(revista, id, cambios),
    onSuccess: invalidar,
  })
}

export function useBloquearPar(id: string) {
  const revista = useRevistaDatos()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: (motivo: MotivoBloqueo) => bloquearPar(revista, id, motivo),
    onSuccess: invalidar,
  })
}

export function useDesbloquearPar() {
  const revista = useRevistaDatos()
  const invalidar = useInvalidarPares()
  return useMutation({
    mutationFn: ({ id, motivo }: { id: string; motivo: string }) =>
      desbloquearPar(revista, id, motivo),
    onSuccess: invalidar,
  })
}
