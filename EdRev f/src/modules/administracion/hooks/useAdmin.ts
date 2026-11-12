/*
 * Hooks of Administración. Account, template and audit data is shared by the dependency (not
 * per journal), so the cache keys carry no journal. Covers: RF-40, RF-41, RNF-19.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  crearPlantilla,
  crearUsuario,
  editarUsuario,
  guardarPlantilla,
  listarAuditoria,
  listarUsuarios,
  obtenerPlantillas,
  subirFondo,
  usarPlantilla,
} from '../services/adminService'
import type { FiltrosAuditoria } from '../services/adminService'
import type { DatosNuevaPlantilla } from '@/types/plantilla'
import type { DatosUsuario, Usuario } from '@/types/usuario'

export function useUsuarios() {
  return useQuery({ queryKey: ['admin', 'usuarios'], queryFn: listarUsuarios })
}

export function useCrearUsuario() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosUsuario) => crearUsuario(datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  })
}

export function useEditarUsuario() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      cambios,
    }: {
      id: string
      cambios: Partial<DatosUsuario & Pick<Usuario, 'estado'>>
    }) => editarUsuario(id, cambios),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'usuarios'] }),
  })
}

export function usePlantillas() {
  return useQuery({ queryKey: ['admin', 'plantillas'], queryFn: obtenerPlantillas })
}

export function useGuardarPlantilla() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, asunto, cuerpo }: { id: string; asunto: string | null; cuerpo: string }) =>
      guardarPlantilla(id, { asunto, cuerpo }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'plantillas'] }),
  })
}

export function useCrearPlantilla() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: DatosNuevaPlantilla) => crearPlantilla(datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'plantillas'] }),
  })
}

export function useSubirFondo() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, archivo }: { id: string; archivo: File }) => subirFondo(id, archivo),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'plantillas'] }),
  })
}

export function useUsarPlantilla() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usarPlantilla(id),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'plantillas'] }),
  })
}

export function useAuditoria(filtros: FiltrosAuditoria) {
  return useQuery({
    queryKey: ['admin', 'auditoria', filtros],
    queryFn: () => listarAuditoria(filtros),
    placeholderData: keepPreviousData,
  })
}
