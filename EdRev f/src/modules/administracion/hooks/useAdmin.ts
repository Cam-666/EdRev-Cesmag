/*
 * Hooks de Administración. Los datos de cuentas, plantillas y auditoría son de la dependencia (no de una
 * revista), por eso las claves de la caché no llevan revista.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  crearPlantilla,
  guardarConfiguracion,
  guardarDatosRevista,
  obtenerConfiguracion,
  quitarImagen,
  vistaPreviaPlantilla,
  crearUsuario,
  reenviarEnlaceUsuario,
  editarUsuario,
  guardarPlantilla,
  listarAuditoria,
  listarUsuarios,
  obtenerPlantillas,
  subirImagen,
  eliminarPlantilla,
  eliminarUsuario,
  marcarPredeterminada,
} from '../services/adminService'
import type { FiltrosAuditoria } from '../services/adminService'
import type { Configuracion, DatosRevista } from '@/types/configuracion'
import type { DatosNuevaPlantilla, ParteImagen } from '@/types/plantilla'
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

export function useReenviarEnlace() {
  return useMutation({ mutationFn: (id: string) => reenviarEnlaceUsuario(id) })
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

export function useEliminarUsuario() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eliminarUsuario(id),
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
      ...datos
    }: {
      id: string
      asunto: string | null
      cuerpo: string
    }) => guardarPlantilla(id, datos),
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

export function useSubirImagen() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, parte, archivo }: { id: string; parte: ParteImagen; archivo: File }) =>
      subirImagen(id, parte, archivo),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'plantillas'] }),
  })
}

export function useQuitarImagen() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ id, parte }: { id: string; parte: ParteImagen }) => quitarImagen(id, parte),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'plantillas'] }),
  })
}

/** Arma el PDF de la constancia de la plantilla con datos de ejemplo y lo abre en una pestaña nueva. */
export function useVistaPreviaPlantilla() {
  return useMutation({
    mutationFn: async (id: string) => {
      const blob = await vistaPreviaPlantilla(id)
      window.open(URL.createObjectURL(blob), '_blank', 'noopener')
    },
  })
}

export function useMarcarPredeterminada() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => marcarPredeterminada(id),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'plantillas'] }),
  })
}

export function useEliminarPlantilla() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => eliminarPlantilla(id),
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

export function useConfiguracion() {
  return useQuery({ queryKey: ['admin', 'configuracion'], queryFn: obtenerConfiguracion })
}

export function useGuardarConfiguracion() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (datos: Pick<Configuracion, 'diasEspera'>) => guardarConfiguracion(datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'configuracion'] }),
  })
}

export function useGuardarDatosRevista() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: ({ revista, datos }: { revista: Revista; datos: DatosRevista }) =>
      guardarDatosRevista(revista, datos),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['admin', 'configuracion'] }),
  })
}
