/* Mutaciones sobre un artículo. Cada una refresca las consultas de artículos en caché de la revista. */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  agregarAutorAArticulo,
  cerrarArticulo,
  crearArticulo,
  editarArticulo,
  decidirNoPublicable,
  reabrirArticulo,
  registrarRonda,
  trasladarArticulo,
} from '../services/articulosService'
import { useInvalidarArticulos } from './useInvalidarArticulos'
import { useRevista } from '@/lib/revista/useRevista'
import type { CierreArticulo, EdicionArticulo, NuevaRonda, NuevoArticulo } from '@/types/articulo'
import type { DatosAutor } from '@/types/autor'

export function useCrearArticulo() {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (datos: NuevoArticulo) => crearArticulo(revista, datos),
    onSuccess: invalidar,
  })
}

export function useEditarArticulo(id: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (cambios: EdicionArticulo) => editarArticulo(revista, id, cambios),
    onSuccess: invalidar,
  })
}

export function useAgregarAutor(id: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (autor: { autorId: string } | { nuevo: DatosAutor }) =>
      agregarAutorAArticulo(revista, id, autor),
    onSuccess: invalidar,
  })
}

export function useRegistrarRonda(id: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (ronda: NuevaRonda) => registrarRonda(revista, id, ronda),
    onSuccess: invalidar,
  })
}

/** El artículo sale de esta revista: se refrescan todas las consultas de artículos de las dos revistas. */
export function useTrasladarArticulo(id: string) {
  const { revista } = useRevista()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: () => trasladarArticulo(revista, id),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['articulos'] }),
  })
}

export function useCerrarArticulo(id: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (cierre: CierreArticulo) => cerrarArticulo(revista, id, cierre),
    onSuccess: invalidar,
  })
}

export function useDecidirNoPublicable(id: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (abrirRonda: boolean) => decidirNoPublicable(revista, id, abrirRonda),
    onSuccess: invalidar,
  })
}

export function useReabrirArticulo(id: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (datos: { motivo: string }) => reabrirArticulo(revista, id, datos),
    onSuccess: invalidar,
  })
}
