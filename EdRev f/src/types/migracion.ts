/*
 * Migración del Excel: los registros cuyo texto escrito a mano no encajó en las listas cerradas del sistema se
 * listan para corregirlos desde la interfaz.
 */

/** Qué dato de un registro migrado hay que corregir. */
export type CampoPorCorregir = 'tipo-articulo' | 'estado-articulo' | 'concepto' | 'correo-par'

export interface RegistroPorCorregir {
  id: string
  campo: CampoPorCorregir
  /** Lo que decía el Excel (vacío cuando el Excel no trajo el dato). */
  valorExcel: string
  /** El artículo, la evaluación o el par, tal como lo muestra la lista. */
  descripcion: string
  /** Dónde se abre el registro en la aplicación. */
  enlace: string
}
