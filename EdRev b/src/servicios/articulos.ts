/*
 * articulos — la ficha del artículo tal como la muestra la página: datos y antiplagio, rondas del comité,
 * autores en orden y los pares con su estado, concepto, constancia y último correo.
 */
import type { Cliente } from '../db.js'
import { ErrorHttp, siglaDe } from '../lib/http.js'
import { conceptoApi, iso, publicacionApi } from '../lib/mapeo.js'
import { resultadoDeLosPares } from './resultadoPares.js'

interface FilaArticulo {
  id_articulo: number
  id_revista: number
  numero_ojs: string
  titulo: string
  tipo: string
  fecha_postulacion: string | null
  porcentaje_coincidencias: number | null
  porcentaje_ia: number | null
  estado: string
  volumen: number | null
  numero: number | null
}

export async function articuloDeRevista(
  c: Cliente,
  idRevista: number,
  idArticulo: number,
): Promise<FilaArticulo> {
  const { rows } = await c.query<FilaArticulo>(
    'SELECT * FROM articulo WHERE id_articulo = $1 AND id_revista = $2',
    [idArticulo, idRevista],
  )
  const fila = rows[0]
  if (!fila) throw new ErrorHttp(404, 'Artículo no encontrado')
  return fila
}

export async function autoresDe(c: Cliente, idArticulo: number) {
  const { rows } = await c.query<{
    id_autor: number
    nombre: string
    orcid: string | null
    correo: string | null
    orden: number
    filiacion: string | null
    pais: string | null
  }>(
    `SELECT au.id_autor, au.nombre, au.orcid, au.correo, aa.orden, aa.filiacion, aa.pais
       FROM articulo_autor aa JOIN autor au ON au.id_autor = aa.id_autor
      WHERE aa.id_articulo = $1 ORDER BY aa.orden`,
    [idArticulo],
  )
  return rows
}

/** Evaluaciones de un artículo con el estado que muestra la página («2.º intento» se deduce de los correos). */
export async function evaluacionesDe(c: Cliente, idArticulo: number) {
  const { rows } = await c.query<{
    id_evaluacion: number
    id_par: number
    estado_par: string
    concepto: string | null
    es_desempate: boolean
    fecha_asignacion: Date
    fecha_evaluacion: string | null
    constancia_emitida: boolean
    nombre: string
    correo: string | null
    universidad: string | null
    invitaciones: number
    ultimo_resultado: string | null
  }>(
    `SELECT e.*, p.nombre, p.correo, p.universidad,
            (SELECT count(*)::int FROM correo c
              WHERE c.id_evaluacion = e.id_evaluacion AND c.tipo = 'invitacion') AS invitaciones,
            (SELECT c.resultado FROM correo c
              WHERE c.id_evaluacion = e.id_evaluacion AND c.tipo = 'invitacion'
              ORDER BY c.fecha_envio DESC LIMIT 1) AS ultimo_resultado
       FROM evaluacion e JOIN par_evaluador p ON p.id_par = e.id_par
      WHERE e.id_articulo = $1 ORDER BY e.fecha_asignacion, e.id_evaluacion`,
    [idArticulo],
  )
  return rows.map((e, i) => {
    const estado =
      e.estado_par === 'invitado' && e.invitaciones >= 2 ? 'segundo-intento' : e.estado_par
    return {
      id: String(e.id_evaluacion),
      articuloId: String(idArticulo),
      parId: String(e.id_par),
      orden: i + 1,
      esDesempate: e.es_desempate,
      estado,
      fechaInvitacion: iso(e.fecha_asignacion),
      fechaRespuesta: null,
      fechaEntrega: e.fecha_evaluacion,
      intento: Math.max(1, e.invitaciones),
      concepto: conceptoApi(e.concepto),
      par: {
        id: String(e.id_par),
        nombre: e.nombre,
        correo: e.correo ?? '',
        universidad: e.universidad ?? '',
      },
      constanciaEmitida: e.constancia_emitida,
      constanciaId: e.estado_par === 'entrego' ? String(e.id_evaluacion) : null,
      ultimoCorreo: e.ultimo_resultado
        ? {
            tipo: e.invitaciones >= 2 ? 'segundo-intento' : 'invitacion',
            estado: e.ultimo_resultado,
            atendido: false,
          }
        : null,
    }
  })
}

export async function detalleArticulo(c: Cliente, idRevista: number, idArticulo: number) {
  const a = await articuloDeRevista(c, idRevista, idArticulo)
  const [autores, asignaciones, rondas, migrado] = await Promise.all([
    autoresDe(c, idArticulo),
    evaluacionesDe(c, idArticulo),
    c.query<{
      id_revision: number
      resultado: string
      observacion: string | null
      fecha: Date
      usuario: string
    }>(
      `SELECT r.id_revision, r.resultado, r.observacion, r.fecha, u.nombre AS usuario
         FROM revision_inicial_comite r JOIN usuario u ON u.id_usuario = r.id_usuario
        WHERE r.id_articulo = $1 ORDER BY r.fecha, r.id_revision`,
      [idArticulo],
    ),
    c.query<{ migrado: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM auditoria WHERE tabla_afectada = 'articulo'
                         AND id_registro = $1 AND accion = 'migracion') AS migrado`,
      [String(idArticulo)],
    ),
  ])
  return {
    id: String(a.id_articulo),
    revista: siglaDe(a.id_revista),
    numeroOjs: a.numero_ojs,
    titulo: a.titulo,
    tipo: a.tipo,
    estado: a.estado,
    fechaPostulacion: a.fecha_postulacion ?? '',
    publicacion: publicacionApi(a.volumen, a.numero),
    coincidencias: a.porcentaje_coincidencias,
    atribuidoIa: a.porcentaje_ia,
    rondasComite: rondas.rows.map((r, i) => ({
      id: String(r.id_revision),
      numero: i + 1,
      resultado: r.resultado,
      observacion: r.observacion ?? '',
      fecha: iso(r.fecha),
      usuario: r.usuario,
    })),
    archivadoEn: null,
    motivoArchivo: null,
    autores: autores.map((x) => ({
      id: String(x.id_autor),
      revista: siglaDe(a.id_revista),
      nombre: x.nombre,
      correo: x.correo ?? '',
      orcid: x.orcid ?? '',
      filiacion: x.filiacion ?? '',
      pais: x.pais ?? '',
      orden: x.orden,
    })),
    asignaciones,
    /** Lo que deciden los conceptos de los pares, cuando todos entregaron; null mientras esté abierto. */
    resultadoPares: conceptoApi(await resultadoDeLosPares(c, idArticulo)),
    migrado: migrado.rows[0]?.migrado ?? false,
  }
}

/** Decide la ronda más reciente del comité: solo después de «aprobado» se pueden asignar pares. */
export async function ultimaRonda(c: Cliente, idArticulo: number): Promise<string | null> {
  const { rows } = await c.query<{ resultado: string }>(
    `SELECT resultado FROM revision_inicial_comite WHERE id_articulo = $1
      ORDER BY fecha DESC, id_revision DESC LIMIT 1`,
    [idArticulo],
  )
  return rows[0]?.resultado ?? null
}
