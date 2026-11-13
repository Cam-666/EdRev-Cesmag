/*
 * exportar — turns a report into a CSV file that Excel opens (semicolon separated, UTF-8 with BOM
 * so the accents survive). The design shows ".xlsx"; a real workbook needs a spreadsheet library,
 * so this version exports CSV. Covers: RF-38, HU-27 (data in an exportable format).
 */
import { csv } from '@/lib/descarga'
import type { IndicadorRevista, Informe } from '@/types/panel'

export function csvInforme(informe: Informe): string {
  const fila = (nombre: string, i: IndicadorRevista) => [nombre, i.reep, i.ire, i.total]
  const filas: Array<Array<string | number>> = [
    ['Informe de gestión', informe.etiquetaPeriodo],
    [],
    ['Indicador', 'Educación y Pedagogía', 'Investigium IRE', 'Total'],
    fila('Artículos postulados', informe.postulados),
    fila('Artículos aprobados', informe.aprobados),
    fila('Artículos rechazados', informe.rechazados),
    fila('Evaluaciones entregadas', informe.evaluacionesEntregadas),
    fila('Constancias emitidas', informe.constanciasEmitidas),
    fila('Días promedio de evaluación', informe.diasPromedioEvaluacion),
    [],
    ['Conceptos del periodo', 'Cantidad'],
    ['Publicable', informe.conceptos.publicable],
    ['Con modificaciones', informe.conceptos.conModificaciones],
    ['No publicable', informe.conceptos.noPublicable],
    ['Pendiente formato de evaluación', informe.conceptos.pendienteFormato],
  ]
  return csv(filas)
}

export function nombreArchivoInforme(informe: Informe): string {
  return `informe-gestion-${informe.periodo}-${informe.revista}.csv`
}
