/*
 * useBorradorArticulo — el formulario de registro guarda su borrador (los datos y los autores elegidos hasta
 * ahora) en sessionStorage, por revista, para que una recarga no lo pierda. No se envía nada a la API hasta que
 * se guarda el artículo.
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
  /** Registro existente que se reutiliza, o null para un autor nuevo. */
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
    /* almacenamiento no disponible: el borrador solo vive en memoria */
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
    /** Quita el borrador guardado sin volver a dibujar (se usa justo antes de salir del formulario). */
    descartar: () => {
      try {
        window.sessionStorage.removeItem(clave(revista))
      } catch {
        /* no hay nada que quitar */
      }
    },
  }
}
