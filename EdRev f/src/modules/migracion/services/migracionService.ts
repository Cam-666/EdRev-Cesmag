/*
 * migracionService — HTTP calls of the migrated records to correct (RF-44, HU-32).
 */
import { solicitar } from '@/lib/api/cliente'
import type { RegistroPorCorregir } from '@/types/migracion'
import type { Revista } from '@/types/revista'

export function listarPorCorregir(revista: Revista): Promise<RegistroPorCorregir[]> {
  return solicitar<RegistroPorCorregir[]>(`/${revista}/por-corregir`)
}

export async function corregirRegistro(revista: Revista, id: string, valor: string): Promise<void> {
  await solicitar<unknown>(`/${revista}/por-corregir/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ valor }),
  })
}
