/*
 * segundoIntento — si un par no responde dentro de los días de espera, la invitación se envía de nuevo sola como
 * segundo intento; si el segundo tampoco se responde, la evaluación pasa a «Sin respuesta» y el par queda
 * bloqueado con ese motivo. Solo cuentan como intento las invitaciones que de verdad se enviaron (un reenvío
 * tras corregir la dirección no suma un intento, porque reemplaza uno fallido). Se ejecuta cada minuto.
 * Los días de espera salen de Administración › Configuración (se aceptan decimales: 0.002 ≈ 3 minutos, para
 * mostrarlo en una demostración a través de la API).
 */
import { config } from '../config.js'
import { diasEspera } from './configuracion.js'
import { enTransaccion, pool } from '../db.js'
import { auditar } from '../lib/auditoria.js'
import { encolar } from './correos.js'

interface Vencida {
  id_evaluacion: number
  id_articulo: number
  id_revista: number
  id_par: number
  nombre: string
  correo: string | null
  enviados: number
}

async function revisar(): Promise<void> {
  const dias = await diasEspera(pool)
  const { rows } = await pool.query<Vencida>(
    `SELECT e.id_evaluacion, e.id_articulo, a.id_revista, p.id_par, p.nombre, p.correo,
            count(c.*) FILTER (WHERE c.resultado = 'enviado')::int AS enviados
       FROM evaluacion e
       JOIN articulo a ON a.id_articulo = e.id_articulo
       JOIN par_evaluador p ON p.id_par = e.id_par
       JOIN correo c ON c.id_evaluacion = e.id_evaluacion AND c.tipo = 'invitacion'
      WHERE e.estado_par = 'invitado'
      GROUP BY e.id_evaluacion, a.id_revista, p.id_par
     HAVING count(*) FILTER (WHERE c.resultado IN ('en-cola','rebotado','fallido')) = 0
        AND max(c.fecha_envio) < now() - make_interval(secs => $1)`,
    [dias * 86_400],
  )
  for (const v of rows) {
    await enTransaccion(async (c) => {
      if (v.enviados < config.intentosAntesBloqueo && v.correo) {
        await encolar(c, v.id_evaluacion, 'invitacion', v.correo)
        await auditar(c, {
          usuario: null,
          tabla: 'evaluacion',
          idRegistro: v.id_evaluacion,
          accion: 'envio',
          texto: `Envió el ${v.enviados + 1}.º intento de la invitación a ${v.nombre}`,
          revista: v.id_revista,
          articulo: v.id_articulo,
        })
      } else if (v.enviados >= config.intentosAntesBloqueo) {
        await c.query("UPDATE evaluacion SET estado_par = 'sin-respuesta' WHERE id_evaluacion = $1", [
          v.id_evaluacion,
        ])
        await c.query(
          `UPDATE par_evaluador SET motivo_bloqueo = 'sin-respuesta', fecha_bloqueo = CURRENT_DATE
            WHERE id_par = $1 AND motivo_bloqueo IS NULL`,
          [v.id_par],
        )
        await auditar(c, {
          usuario: null,
          tabla: 'evaluacion',
          idRegistro: v.id_evaluacion,
          accion: 'bloqueo',
          texto: `Bloqueó a ${v.nombre}: no respondió tras el ${v.enviados}.º intento`,
          revista: v.id_revista,
          articulo: v.id_articulo,
        })
      }
    })
  }
}

export function iniciarSegundoIntento(): void {
  let ocupado = false
  setInterval(() => {
    if (ocupado) return
    ocupado = true
    revisar()
      .catch((e: unknown) => console.error('Segundo intento:', (e as Error).message))
      .finally(() => {
        ocupado = false
      })
  }, 60_000)
}
