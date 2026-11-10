/*
 * Hooks of Administración. Account, template and audit data is shared by the dependency (not
 * per journal), so the cache keys carry no journal. Covers: RF-40, RF-41, RNF-19.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  crearUsuario,
  editarUsuario,
  guardarCuenta,
  guardarPlantilla,
  listarAuditoria,
  listarUsuarios,
  obtenerPlantillas,
} from '../services/adminService'
import type { FiltrosAuditoria } from '../services/adminService'
import type { PlantillaId } from '@/types/plantilla'
import type { Revista } from '@/types/revista'
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
    mutationFn: ({
      id,
      asunto,
      cuerpo,
    }: {
      id: PlantillaId
      asunto: string | null
      cuerpo: string
    }) => guardarPlantilla(id, { asunto, cuerpo }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'plantillas'] }),
  })
}

export function useGuardarCuenta() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ revista, provisional }: { revista: Revista; provisional: string }) =>
      guardarCuenta(revista, provisional),
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
