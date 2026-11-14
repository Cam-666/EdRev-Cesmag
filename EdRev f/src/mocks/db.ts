/*
 * db — in-memory database of the mock API. Journal data is fully separate per journal (RF-02);
 * the templates, sender accounts and user accounts are shared by the dependency.
 * `reiniciarDb` restores the seed (used between tests).
 */
import { CUENTAS_INICIALES, PLANTILLAS_INICIALES } from './plantillas'
import { SEED_IRE } from './seed/ire'
import { SEED_REEP } from './seed/reep'
import type { SeedRevista } from './seed/fabrica'
import { USUARIOS_SEED } from './seed/usuarios'
import type { Autor, DatosAutor } from '@/types/autor'
import type { Asignacion } from '@/types/par'
import type { CuentaRemitente, Plantilla, UsoPlantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'
import type { Configuracion } from '@/types/configuracion'
import type { Usuario } from '@/types/usuario'

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T
}

interface Base {
  revistas: Record<Revista, SeedRevista>
  plantillas: Plantilla[]
  cuentas: CuentaRemitente[]
  usuarios: Usuario[]
  configuracion: Configuracion
}

function crear(): Base {
  const reep = clonar(SEED_REEP)
  const ire = clonar(SEED_IRE)
  // The base of peers is common to both journals: both point at the same list.
  const compartidos = [...reep.pares, ...ire.pares]
  reep.pares = compartidos
  ire.pares = compartidos
  return {
    revistas: { reep, ire },
    plantillas: clonar(PLANTILLAS_INICIALES),
    cuentas: clonar(CUENTAS_INICIALES),
    usuarios: clonar(USUARIOS_SEED),
    configuracion: { diasEspera: 5 },
  }
}

let base = crear()

export function baseDe(revista: Revista): SeedRevista {
  return base.revistas[revista]
}

/**
 * Common author directory (RF-10): each author is stored in the journal where it was registered,
 * but it is searched, reused and shown as one directory for both journals.
 */
export function autores(): Autor[] {
  return [...base.revistas.reep.autores, ...base.revistas.ire.autores]
}

export function autorPorId(id: string): Autor | undefined {
  return autores().find((a) => a.id === id)
}

/** Registers an author in the directory (stored with the journal where it was first used). */
export function registrarAutor(revista: Revista, datos: DatosAutor): Autor {
  const nuevo: Autor = { id: `au-n${autores().length + 1}`, revista, ...datos }
  base.revistas[revista].autores.push(nuevo)
  return nuevo
}

export function plantillas(): Plantilla[] {
  return base.plantillas
}

/** The template a journal sends for a use (there is always exactly one in use, RF-45). */
export function plantillaEnUso(revista: Revista, uso: UsoPlantilla): Plantilla {
  const p = base.plantillas.find((x) => x.revista === revista && x.uso === uso && x.enUso)
  if (!p) throw new Error(`No template in use for ${revista} ${uso}`)
  return p
}

export function cuentas(): CuentaRemitente[] {
  return base.cuentas
}

/** Evaluations of both journals (a peer can work in either). */
export function todasLasAsignaciones(): Asignacion[] {
  return [...base.revistas.reep.asignaciones, ...base.revistas.ire.asignaciones]
}

export function configuracion(): Configuracion {
  return base.configuracion
}

export function usuarios(): Usuario[] {
  return base.usuarios
}

export function reiniciarDb(): void {
  base = crear()
}
