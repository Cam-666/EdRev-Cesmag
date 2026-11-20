/*
 * exportar — convierte un informe en un archivo CSV que abre Excel (separado por punto y coma, UTF-8 con BOM para
 * que las tildes sobrevivan). El diseño muestra «.xlsx»; un libro de Excel real necesita una librería de hojas de
 * cálculo, así que esta versión exporta CSV.
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
