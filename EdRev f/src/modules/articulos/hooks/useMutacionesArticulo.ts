/*
 * Mutations over an article. Each one refreshes the cached article queries of the journal.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  agregarAutorAArticulo,
  crearArticulo,
  editarArticulo,
  reabrirArticulo,
  registrarRonda,
  trasladarArticulo,
} from '../services/articulosService'
import { useInvalidarArticulos } from './useInvalidarArticulos'
import { useRevista } from '@/lib/revista/useRevista'
import type { EdicionArticulo, EstadoArticulo, NuevaRonda, NuevoArticulo } from '@/types/articulo'
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

/** The article leaves this journal: every article query of both journals is refreshed. */
export function useTrasladarArticulo(id: string) {
  const { revista } = useRevista()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: () => trasladarArticulo(revista, id),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['articulos'] }),
  })
}

export function useReabrirArticulo(id: string) {
  const { revista } = useRevista()
  const invalidar = useInvalidarArticulos()
  return useMutation({
    mutationFn: (datos: {
      motivo: string
      estado: Extract<EstadoArticulo, 'en-revision' | 'postulado'>
    }) => reabrirArticulo(revista, id, datos),
    onSuccess: invalidar,
  })
}
