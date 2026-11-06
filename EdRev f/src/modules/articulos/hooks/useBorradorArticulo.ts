/*
 * useBorradorArticulo — the two-step registration keeps its draft (step 1 data and the authors
 * chosen so far) in sessionStorage, per journal, so a reload or going back does not lose it.
 * Nothing is sent to the API until step 2 is saved. Covers: RF-01, RF-09, HU-01, HU-06.
 */
import { useCallback, useState } from 'react'
import { useRevista } from '@/lib/revista/useRevista'
import type { DatosAutor } from '@/types/autor'
import type { Revista } from '@/types/revista'

export interface DatosBorrador {
  numeroOjs: string
  fechaPostulacion: string
  titulo: string
  tipo: string
}

export interface AutorBorrador {
  /** Existing record to reuse, or null for a new author. */
  autorId: string | null
  datos: DatosAutor
}

export interface Borrador {
  datos: DatosBorrador | null
  autores: AutorBorrador[]
}

const VACIO: Borrador = { datos: null, autores: [] }

const clave = (revista: Revista) => `edrev.borrador-articulo.${revista}`

function leer(revista: Revista): Borrador {
  try {
    const crudo = window.sessionStorage.getItem(clave(revista))
    return crudo ? (JSON.parse(crudo) as Borrador) : VACIO
  } catch {
    return VACIO
  }
}

function guardar(revista: Revista, borrador: Borrador): void {
  try {
    window.sessionStorage.setItem(clave(revista), JSON.stringify(borrador))
  } catch {
    /* storage unavailable: the draft just lives in memory */
  }
}

export function useBorradorArticulo() {
  const { revista } = useRevista()
  const [borrador, setBorrador] = useState<Borrador>(() => leer(revista))

  const actualizar = useCallback(
    (cambio: (previo: Borrador) => Borrador) => {
      setBorrador((previo) => {
        const siguiente = cambio(previo)
        guardar(revista, siguiente)
        return siguiente
      })
    },
    [revista],
  )

  return {
    borrador,
    guardarDatos: (datos: DatosBorrador) => actualizar((b) => ({ ...b, datos })),
    agregarAutor: (autor: AutorBorrador) =>
      actualizar((b) => ({ ...b, autores: [...b.autores, autor] })),
    quitarAutor: (indice: number) =>
      actualizar((b) => ({ ...b, autores: b.autores.filter((_, i) => i !== indice) })),
    limpiar: () => actualizar(() => VACIO),
    /** Removes the stored draft without re-rendering (used right before leaving step 2). */
    descartar: () => {
      try {
        window.sessionStorage.removeItem(clave(revista))
      } catch {
        /* nothing to remove */
      }
    },
  }
}
