/*
 * configuracion — valores que la Administradora ajusta desde la página (Administración › Configuración).
 * Por ahora: los días que tiene un par para responder una invitación. Gana el valor guardado; mientras no haya
 * uno, rige DIAS_ESPERA_RESPUESTA del servidor (valor inicial: 5 días).
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
