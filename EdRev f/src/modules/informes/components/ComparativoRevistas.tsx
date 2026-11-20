/*
 * ComparativoRevistas — los indicadores de las dos revistas lado a lado más su total. Cada revista conserva su
 * propia columna: los números se comparan, nunca se mezclan en una sola lista.
 */
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { IndicadorRevista, Informe } from '@/types/panel'
import { REVISTAS } from '@/types/revista'

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
    { clave: 'm1', encabezado: REVISTAS.reep.nombreCorto, render: (f) => f.valores.reep },
    { clave: 'm2', encabezado: REVISTAS.ire.nombreCorto, render: (f) => f.valores.ire },
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
