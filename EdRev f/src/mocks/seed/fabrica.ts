/*
 * fabrica — builds a full journal seed from compact tuples. Mails and audit entries are derived
 * from the assignments so the three views (peers, mails, history) never disagree.
 * Each journal is built separately: nothing here ever mixes REEP and IRE.
 */
import type {
  Antiplagio,
  Articulo,
  EstadoArticulo,
  ResultadoComite,
  TipoArticulo,
} from '@/types/articulo'
import type { Autor } from '@/types/autor'
import type { CorreoEnviado, EntradaAuditoria, Observacion } from '@/types/historial'
import type {
  Asignacion,
  ConceptoPar,
  Constancia,
  EstadoAsignacion,
  MotivoBloqueo,
  ParEvaluador,
} from '@/types/par'
import type { Revista } from '@/types/revista'

export interface SeedRevista {
  autores: Autor[]
  pares: ParEvaluador[]
  articulos: Articulo[]
  asignaciones: Asignacion[]
  constancias: Constancia[]
  correos: CorreoEnviado[]
  observaciones: Observacion[]
  auditoria: EntradaAuditoria[]
}

/** [name, orcid, affiliation, country?] */
export type AutorSeed = [string, string, string, string?]

export interface ParSeed {
  nombre: string
  correo: string
  universidad: string
  area: string
  /** [reason, ISO date] when the peer is blocked. */
  bloqueo?: [MotivoBloqueo, string]
  autorizo?: string
}

export interface AsigSeed {
  /** Index in the peers list (0-based). */
  par: number
  e: EstadoAsignacion
  /** Invitation date (ISO date). */
  inv: string
  resp?: string
  ent?: string
  c?: ConceptoPar
  desempate?: boolean
  /** Constancia: 'e' = issued (system), 'm' = pending migrated, 's' = pending system. */
  k?: 'e' | 'm' | 's'
  /** Date the constancia was issued (ISO date). */
  emitida?: string
  intento?: number
}

export interface ArtSeed {
  n: string
  t: string
  tipo: TipoArticulo
  e: EstadoArticulo
  f: string
  pub?: string
  /** [coincidences %, AI %] */
  ap?: [number, number]
  ri?: ResultadoComite
  rf?: ResultadoComite
  /** 1-based indices in the authors list, in order. */
  au: number[]
  as?: AsigSeed[]
  /** [archive date, reason] */
  arch?: [string, string]
}

export interface ObsSeed {
  n: string
  f: string
  u: string
  t: string
}

export interface CorreoSeed {
  n: string
  tipo: CorreoEnviado['tipo']
  dest: string
  f: string
  e: CorreoEnviado['estado']
}

export interface EntradaSeed {
  revista: Revista
  autores: AutorSeed[]
  pares: ParSeed[]
  articulos: ArtSeed[]
  observaciones?: ObsSeed[]
  correosExtra?: CorreoSeed[]
}

const DOMINIOS: Record<string, string> = {
  'Universidad de Nariño': 'udenar.edu.co',
  'Universidad Mariana': 'umariana.edu.co',
  'Universidad CESMAG': 'unicesmag.edu.co',
  'Universidad del Cauca': 'unicauca.edu.co',
  'Universidad Javeriana': 'javeriana.edu.co',
  'Universidad Nacional': 'unal.edu.co',
  'Universidad del Valle': 'univalle.edu.co',
  'Universidad de Antioquia': 'udea.edu.co',
}

const ADMIN = 'Ma. Camila Mendoza'
const AUXILIAR = 'Andrea Villota'

function limpiar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '')
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

function fechaHora(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00`
}

export function construirSeed(entrada: EntradaSeed): SeedRevista {
  const { revista } = entrada
  const p = revista

  const autores: Autor[] = entrada.autores.map(([nombre, orcid, filiacion, pais], i) => {
    const partes = nombre.split(' ')
    const dominio = DOMINIOS[filiacion] ?? 'example.edu.co'
    return {
      id: `${p}-au-${i + 1}`,
      revista,
      nombre,
      correo: `${limpiar(partes[0] ?? '')}.${limpiar(partes[partes.length - 1] ?? '')}@${dominio}`,
      orcid,
      filiacion,
      pais: pais ?? 'Colombia',
    }
  })

  const pares: ParEvaluador[] = entrada.pares.map((s, i) => ({
    id: `${p}-par-${i + 1}`,
    revista,
    nombre: s.nombre,
    correo: s.correo,
    universidad: s.universidad,
    area: s.area,
    bloqueo: s.bloqueo ? { motivo: s.bloqueo[0], fecha: s.bloqueo[1] } : null,
    autorizoDatosEn: s.autorizo ?? '2024-03-14',
  }))

  const articulos: Articulo[] = []
  const asignaciones: Asignacion[] = []
  const constancias: Constancia[] = []
  const correos: CorreoEnviado[] = []
  const auditoria: EntradaAuditoria[] = []
  let seq = 0
  const nid = () => String(++seq).padStart(4, '0')

  for (const s of entrada.articulos) {
    const fechaAp = sumarDias(s.f, 3)
    const antiplagio: Antiplagio | null = s.ap
      ? {
          coincidencias: s.ap[0],
          atribuidoIa: s.ap[1],
          observacion: `Antiplagio: ${s.ap[0]} % y ${s.ap[1]} %.`,
          fecha: fechaHora(fechaAp, '08:52'),
          usuario: AUXILIAR,
        }
      : null

    articulos.push({
      id: s.n,
      revista,
      numeroOjs: s.n,
      titulo: s.t,
      tipo: s.tipo,
      estado: s.e,
      fechaPostulacion: s.f,
      numeroPublicacion: s.pub ?? null,
      antiplagio,
      revisionInicial: s.ri
        ? {
            resultado: s.ri,
            observacion: '',
            fecha: fechaHora(sumarDias(s.f, 9), '10:24'),
            usuario: ADMIN,
          }
        : null,
      revisionFinal: s.rf
        ? {
            resultado: s.rf,
            observacion: '',
            fecha: fechaHora(sumarDias(s.f, 12), '10:30'),
            usuario: ADMIN,
          }
        : null,
      autoresIds: s.au.map((i) => `${p}-au-${i}`),
      archivadoEn: s.arch ? s.arch[0] : null,
      motivoArchivo: s.arch ? s.arch[1] : null,
    })

    auditoria.push({
      id: `${p}-aud-${nid()}`,
      revista,
      articuloId: s.n,
      tipo: 'registro',
      accion: `Registró el artículo ${s.n}`,
      fecha: fechaHora(s.f, '09:15'),
      usuario: AUXILIAR,
    })
    if (antiplagio) {
      auditoria.push({
        id: `${p}-aud-${nid()}`,
        revista,
        articuloId: s.n,
        tipo: 'revision',
        accion: 'Registró el porcentaje de antiplagio',
        fecha: antiplagio.fecha,
        usuario: AUXILIAR,
      })
    }

    ;(s.as ?? []).forEach((a, idx) => {
      const orden = idx + 1
      const par = pares[a.par]
      if (!par) throw new Error(`Seed ${revista}: unknown peer ${a.par} in ${s.n}`)
      const asigId = `${s.n}-p${orden}`
      const intento = a.intento ?? (a.e === 'segundo-intento' ? 2 : 1)
      asignaciones.push({
        id: asigId,
        articuloId: s.n,
        parId: par.id,
        orden,
        esDesempate: a.desempate ?? false,
        estado: a.e,
        fechaInvitacion: fechaHora(a.inv, '08:17'),
        fechaRespuesta: a.resp ? fechaHora(a.resp, '11:00') : null,
        fechaEntrega: a.ent ? fechaHora(a.ent, '14:30') : null,
        intento,
        concepto: a.c ?? null,
      })

      auditoria.push({
        id: `${p}-aud-${nid()}`,
        revista,
        articuloId: s.n,
        tipo: 'asignacion',
        accion: a.desempate ? `Asignó el par ${orden} como desempate` : `Asignó el par ${orden}`,
        fecha: fechaHora(a.inv, '08:17'),
        usuario: a.desempate ? ADMIN : AUXILIAR,
      })
      correos.push({
        id: `${p}-cor-${nid()}`,
        revista,
        articuloId: s.n,
        tipo: 'invitacion',
        destinatario: par.correo,
        asunto: `Invitación a evaluar un artículo · ${revista === 'reep' ? 'Educación y Pedagogía' : 'Investigium IRE'}`,
        fechaEnvio: fechaHora(a.inv, '08:17'),
        estado: 'entregado',
      })
      if (intento >= 2) {
        correos.push({
          id: `${p}-cor-${nid()}`,
          revista,
          articuloId: s.n,
          tipo: 'reenvio',
          destinatario: par.correo,
          asunto: 'Reenvío de la invitación a evaluar',
          fechaEnvio: fechaHora(sumarDias(a.inv, 7), '08:02'),
          estado: 'entregado',
        })
      }
      if (a.ent) {
        auditoria.push({
          id: `${p}-aud-${nid()}`,
          revista,
          articuloId: s.n,
          tipo: 'entrega',
          accion: `Marcó la entrega del par ${orden}`,
          fecha: fechaHora(a.ent, '14:31'),
          usuario: ADMIN,
        })
      }
      if (a.k) {
        const emitida = a.k === 'e'
        constancias.push({
          id: `${asigId}-k`,
          asignacionId: asigId,
          estado: emitida ? 'emitida' : 'pendiente',
          fechaEmision: emitida ? fechaHora(a.emitida ?? a.ent ?? a.inv, '16:02') : null,
          origen: a.k === 'm' ? 'migrado' : 'sistema',
        })
        if (emitida) {
          const f = fechaHora(a.emitida ?? a.ent ?? a.inv, '16:02')
          auditoria.push({
            id: `${p}-aud-${nid()}`,
            revista,
            articuloId: s.n,
            tipo: 'constancia',
            accion: `Envió la constancia al par ${orden}`,
            fecha: f,
            usuario: 'Sistema',
          })
          correos.push({
            id: `${p}-cor-${nid()}`,
            revista,
            articuloId: s.n,
            tipo: 'agradecimiento',
            destinatario: par.correo,
            asunto: 'Gracias por su evaluación · constancia adjunta',
            fechaEnvio: f,
            estado: 'entregado',
          })
        }
      }
    })

    if (s.arch) {
      auditoria.push({
        id: `${p}-aud-${nid()}`,
        revista,
        articuloId: s.n,
        tipo: 'edicion',
        accion: 'Archivó el artículo',
        fecha: fechaHora(s.arch[0], '10:00'),
        usuario: ADMIN,
      })
    }
  }

  for (const c of entrada.correosExtra ?? []) {
    correos.push({
      id: `${p}-cor-${nid()}`,
      revista,
      articuloId: c.n,
      tipo: c.tipo,
      destinatario: c.dest,
      asunto:
        c.tipo === 'recordatorio'
          ? 'Recordatorio: invitación a evaluar un artículo'
          : 'Reenvío de la invitación a evaluar',
      fechaEnvio: c.f,
      estado: c.e,
    })
    if (c.e === 'rebotado') {
      auditoria.push({
        id: `${p}-aud-${nid()}`,
        revista,
        articuloId: c.n,
        tipo: 'fallo',
        accion: 'Envío fallido: la dirección rebotó',
        fecha: c.f,
        usuario: 'Sistema',
      })
    }
  }

  const observaciones: Observacion[] = (entrada.observaciones ?? []).map((o) => ({
    id: `${p}-obs-${nid()}`,
    articuloId: o.n,
    texto: o.t,
    fecha: o.f,
    usuario: o.u,
  }))

  const porFecha = (a: { fecha: string }, b: { fecha: string }) => (a.fecha < b.fecha ? 1 : -1)
  return {
    autores,
    pares,
    articulos,
    asignaciones,
    constancias,
    correos: correos.sort((a, b) => (a.fechaEnvio < b.fechaEnvio ? 1 : -1)),
    observaciones: observaciones.sort(porFecha),
    auditoria: auditoria.sort(porFecha),
  }
}

export { ADMIN as USUARIO_ADMIN, AUXILIAR as USUARIO_AUXILIAR }
