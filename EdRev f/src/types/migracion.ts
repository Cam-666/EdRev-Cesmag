/*
 * Migration of the Excel (RF-42..RF-44, HU-32): the records whose hand-written text did not fit
 * the closed lists of the system are listed to be corrected from the interface.
 */

/** Which datum of a migrated record has to be corrected. */
export type CampoPorCorregir = 'tipo-articulo' | 'estado-articulo' | 'concepto' | 'correo-par'

export interface RegistroPorCorregir {
  id: string
  campo: CampoPorCorregir
  /** What the Excel said (empty when the Excel did not bring the datum). */
  valorExcel: string
  /** The article, evaluation or peer, as the list shows it. */
  descripcion: string
  /** Where the record opens in the app. */
  enlace: string
}
