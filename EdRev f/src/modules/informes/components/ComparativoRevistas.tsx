/*
 * ComparativoRevistas — indicators side by side for the two journals plus their total. Each
 * journal keeps its own column: numbers are compared, never merged into one list.
 * Covers: RF-38, HU-27.
 */
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { IndicadorRevista, Informe } from '@/types/panel'

interface FilaIndicador {
  nombre: string
  valores: IndicadorRevista
}

export interface ComparativoRevistasProps {
  informe: Informe
}

export function ComparativoRevistas({ informe }: ComparativoRevistasProps) {
  const filas: FilaIndicador[] = [
    { nombre: 'Artículos postulados', valores: informe.postulados },
    { nombre: 'Artículos aprobados', valores: informe.aprobados },
    { nombre: 'Artículos rechazados', valores: informe.rechazados },
    { nombre: 'Evaluaciones entregadas', valores: informe.evaluacionesEntregadas },
    { nombre: 'Constancias emitidas', valores: informe.constanciasEmitidas },
    { nombre: 'Días promedio de evaluación', valores: informe.diasPromedioEvaluacion },
  ]
  const columnas: Array<ColumnaTabla<FilaIndicador>> = [
    { clave: 'indicador', encabezado: 'Indicador', render: (f) => f.nombre },
    { clave: 'm1', encabezado: 'Módulo 1', render: (f) => f.valores.reep },
    { clave: 'm2', encabezado: 'Módulo 2', render: (f) => f.valores.ire },
    { clave: 'total', encabezado: 'Total', render: (f) => f.valores.total },
  ]
  return (
    <Tabla
      etiqueta="Comparativo por revista"
      columnas={columnas}
      filas={filas}
      obtenerClave={(f) => f.nombre}
    />
  )
}
