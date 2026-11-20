/*
 * db — base de datos en memoria de la API simulada. Los datos de cada revista están completamente separados;
 * las plantillas, las cuentas remitentes y las cuentas de usuario las comparte la dependencia.
 * `reiniciarDb` restaura los datos de ejemplo (se usa entre pruebas).
 */
import { CUENTAS_INICIALES, DATOS_REVISTA_INICIALES, PLANTILLAS_INICIALES } from './plantillas'
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
  // La base de pares es común a las dos revistas: las dos apuntan a la misma lista.
  const compartidos = [...reep.pares, ...ire.pares]
  reep.pares = compartidos
  ire.pares = compartidos
  return {
    revistas: { reep, ire },
    plantillas: clonar(PLANTILLAS_INICIALES),
    cuentas: clonar(CUENTAS_INICIALES),
    usuarios: clonar(USUARIOS_SEED),
    configuracion: {
      diasEspera: 5,
      revistas: {
        reep: clonar(DATOS_REVISTA_INICIALES).reep,
        ire: clonar(DATOS_REVISTA_INICIALES).ire,
      },
    },
  }
}

let base = crear()

export function baseDe(revista: Revista): SeedRevista {
  return base.revistas[revista]
}

/**
 * Directorio común de autores: cada autor se guarda en la revista donde se registró, pero se busca, se
 * reutiliza y se muestra como un solo directorio para las dos revistas.
 */
export function autores(): Autor[] {
  return [...base.revistas.reep.autores, ...base.revistas.ire.autores]
}

export function autorPorId(id: string): Autor | undefined {
  return autores().find((a) => a.id === id)
}

/** Registra un autor en el directorio (se guarda con la revista donde se usó por primera vez). */
export function registrarAutor(revista: Revista, datos: DatosAutor): Autor {
  const nuevo: Autor = { id: `au-n${autores().length + 1}`, revista, ...datos }
  base.revistas[revista].autores.push(nuevo)
  return nuevo
}

export function plantillas(): Plantilla[] {
  return base.plantillas
}

/** La plantilla que una revista envía para un uso (siempre hay exactamente una en uso). */
export function plantillaEnUso(revista: Revista, uso: UsoPlantilla): Plantilla {
  const p = base.plantillas.find((x) => x.revista === revista && x.uso === uso && x.enUso)
  if (!p) throw new Error(`No template in use for ${revista} ${uso}`)
  return p
}

export function cuentas(): CuentaRemitente[] {
  return base.cuentas
}

/** Evaluaciones de las dos revistas (un par puede trabajar en cualquiera). */
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
