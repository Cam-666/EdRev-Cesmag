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
import type { CuentaRemitente, Plantilla, UsoPlantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'
import type { Usuario } from '@/types/usuario'

function clonar<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T
}

interface Base {
  revistas: Record<Revista, SeedRevista>
  plantillas: Plantilla[]
  cuentas: CuentaRemitente[]
  usuarios: Usuario[]
}

function crear(): Base {
  return {
    revistas: { reep: clonar(SEED_REEP), ire: clonar(SEED_IRE) },
    plantillas: clonar(PLANTILLAS_INICIALES),
    cuentas: clonar(CUENTAS_INICIALES),
    usuarios: clonar(USUARIOS_SEED),
  }
}

let base = crear()

export function baseDe(revista: Revista): SeedRevista {
  return base.revistas[revista]
}

export function plantillas(): Plantilla[] {
  return base.plantillas
}

/** The template the system sends for a use (there is always exactly one in use). */
export function plantillaEnUso(uso: UsoPlantilla): Plantilla {
  const p = base.plantillas.find((x) => x.uso === uso && x.enUso)
  if (!p) throw new Error(`No template in use for ${uso}`)
  return p
}

export function cuentas(): CuentaRemitente[] {
  return base.cuentas
}

export function usuarios(): Usuario[] {
  return base.usuarios
}

export function reiniciarDb(): void {
  base = crear()
}
