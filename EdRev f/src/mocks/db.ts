/*
 * db — in-memory database of the mock API, one fully separate base per journal (RF-02).
 * `reiniciarDb` restores the seed (used between tests).
 */
import { SEED_IRE } from './seed/ire'
import { SEED_REEP } from './seed/reep'
import type { SeedRevista } from './seed/fabrica'
import type { Revista } from '@/types/revista'

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T
}

function crear(): Record<Revista, SeedRevista> {
  return { reep: clonar(SEED_REEP), ire: clonar(SEED_IRE) }
}

let bases = crear()

export function baseDe(revista: Revista): SeedRevista {
  return bases[revista]
}

export function reiniciarDb(): void {
  bases = crear()
}
