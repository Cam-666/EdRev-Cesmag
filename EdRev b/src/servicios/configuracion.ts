/*
 * configuracion — values the Administradora adjusts from the page (Administración › Configuración).
 * For now: the days a peer has to answer an invitation (RF-29, RF-15). The saved value wins; while
 * none is saved, the server's DIAS_ESPERA_RESPUESTA applies (initial value: 5 days).
 */
import { config } from '../config.js'
import type { Cliente } from '../db.js'

const CLAVE_DIAS = 'dias_espera_respuesta'

export async function diasEspera(c: Cliente): Promise<number> {
  const { rows } = await c.query<{ valor: string }>('SELECT valor FROM configuracion WHERE clave = $1', [CLAVE_DIAS])
  const guardado = Number(rows[0]?.valor)
  return Number.isFinite(guardado) && guardado > 0 ? guardado : config.diasEspera
}

export async function guardarDiasEspera(c: Cliente, dias: number): Promise<void> {
  await c.query(
    `INSERT INTO configuracion (clave, valor) VALUES ($1, $2)
     ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
    [CLAVE_DIAS, String(dias)],
  )
}
