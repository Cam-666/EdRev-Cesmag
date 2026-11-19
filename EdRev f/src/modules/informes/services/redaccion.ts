/*
 * redaccion — writes the executive summary of the management report from its figures, in formal
 * Spanish, so the page reads like a report and not like a list of numbers.
 * Covers: RF-38, HU-27.
 */
import type { Informe } from '@/types/panel'
import { REVISTAS } from '@/types/revista'

function cantidad(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`
}

/** "Primer semestre de 2026" -> "el primer semestre de 2026". */
function periodoEnFrase(etiqueta: string): string {
  return `el ${etiqueta.charAt(0).toLowerCase()}${etiqueta.slice(1)}`
}

const CONCEPTOS = [
  { clave: 'publicable', nombre: 'Publicable' },
  { clave: 'conModificaciones', nombre: 'Publicable con modificaciones' },
  { clave: 'noPublicable', nombre: 'No publicable' },
  { clave: 'pendienteFormato', nombre: 'Pendiente formato de evaluación' },
] as const

export function redactarResumen(informe: Informe): string[] {
  const periodo = periodoEnFrase(informe.etiquetaPeriodo)
  const unica = informe.revista === 'ambas' ? null : REVISTAS[informe.revista]
  const sujeto = unica ? `la ${unica.nombre}` : 'las dos revistas de la Universidad CESMAG'
  const verbo = unica ? 'registró' : 'registraron'
  const entregadas = informe.evaluacionesEntregadas.total
  const postulados = informe.postulados.total

  if (postulados === 0 && entregadas === 0 && informe.constanciasEmitidas.total === 0) {
    return [`Durante ${periodo} no hay actividad registrada para ${sujeto}.`]
  }

  const parrafos: string[] = []
  parrafos.push(
    `Durante ${periodo}, ${sujeto} ${verbo} ${cantidad(postulados, 'artículo postulado', 'artículos postulados')}, ` +
      `de los cuales ${cantidad(informe.aprobados.total, 'fue aprobado', 'fueron aprobados')} y ` +
      `${cantidad(informe.rechazados.total, 'fue rechazado', 'fueron rechazados')}.`,
  )

  if (entregadas === 0) {
    parrafos.push(
      `No se registraron evaluaciones entregadas por los pares en el periodo, y se emitieron ` +
        `${cantidad(informe.constanciasEmitidas.total, 'constancia', 'constancias')}.`,
    )
    return parrafos
  }

  parrafos.push(
    `Los pares evaluadores entregaron ${cantidad(entregadas, 'evaluación', 'evaluaciones')} y se emitieron ` +
      `${cantidad(informe.constanciasEmitidas.total, 'constancia', 'constancias')}. ` +
      `El tiempo promedio de evaluación fue de ${cantidad(informe.diasPromedioEvaluacion.total, 'día', 'días')}.`,
  )

  const total = CONCEPTOS.reduce((suma, c) => suma + informe.conceptos[c.clave], 0)
  if (total > 0) {
    const principal = CONCEPTOS.reduce((mayor, c) =>
      informe.conceptos[c.clave] > informe.conceptos[mayor.clave] ? c : mayor,
    )
    const n = informe.conceptos[principal.clave]
    parrafos.push(
      `El concepto más frecuente fue «${principal.nombre}», con ${n} de ${total} ` +
        `(${Math.round((n / total) * 100)} %).`,
    )
  }
  return parrafos
}
