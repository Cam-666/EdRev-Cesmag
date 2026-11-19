/*
 * configuracion (servicio) — what the Administradora adjusts from the page: the days a peer has to
 * answer (RF-29) and, for each journal, the ISSN and the indexations that go in the constancia
 * ({{issn}}, {{indexaciones}}).
 */
import { enTransaccion, pool } from '../../db.js'
import { auditar } from '../../lib/auditoria.js'
import { siglaDe } from '../../lib/http.js'
import { diasEspera, guardarDiasEspera } from '../configuracion.js'

export async function datosRevistas() {
  const { rows } = await pool.query<{ id_revista: number; issn: string | null; indexaciones: string | null }>(
    'SELECT id_revista, issn, indexaciones FROM revista ORDER BY id_revista',
  )
  return Object.fromEntries(
    rows.map((r) => [siglaDe(r.id_revista), { issn: r.issn ?? '', indexaciones: r.indexaciones ?? '' }]),
  )
}

export async function obtenerConfiguracion() {
  return { diasEspera: await diasEspera(pool), revistas: await datosRevistas() }
}

export async function cambiarDiasEspera(dias: number, actor: number) {
  await enTransaccion(async (c) => {
    const antes = await diasEspera(c)
    await guardarDiasEspera(c, dias)
    await auditar(c, {
      usuario: actor,
      tabla: 'configuracion',
      idRegistro: 'dias_espera_respuesta',
      accion: 'edicion',
      texto: `Cambió los días de espera de la respuesta del par de ${antes} a ${dias}`,
    })
  })
  return { diasEspera: dias, revistas: await datosRevistas() }
}

export async function cambiarDatosRevista(
  idRevista: number,
  datos: { issn: string; indexaciones: string },
  actor: number,
) {
  await enTransaccion(async (c) => {
    await c.query('UPDATE revista SET issn = $2, indexaciones = $3 WHERE id_revista = $1', [
      idRevista,
      datos.issn ? datos.issn.toUpperCase() : null,
      datos.indexaciones || null,
    ])
    await auditar(c, {
      usuario: actor,
      tabla: 'configuracion',
      idRegistro: `revista_${idRevista}`,
      accion: 'edicion',
      texto: `Cambió el ISSN y las indexaciones de ${siglaDe(idRevista).toUpperCase()}`,
    })
  })
  return (await datosRevistas())[siglaDe(idRevista)]
}
