/*
 * NotasDelInforme — how each figure of the report is counted, so whoever reads it (or the
 * committee it is delivered to) knows what it means. Covers: RF-38, HU-27.
 */
export function NotasDelInforme() {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-cuerpo-13 text-texto-secundario print:gap-3 print:text-[15px] print:leading-7">
      <li>
        Los artículos postulados, aprobados y rechazados se cuentan por su fecha de postulación
        dentro del semestre y según su estado actual.
      </li>
      <li>Las evaluaciones entregadas y los conceptos se cuentan por la fecha de entrega.</li>
      <li>Las constancias emitidas se cuentan por la fecha de su primer envío.</li>
      <li>
        Los días promedio de evaluación van desde la asignación del par hasta la entrega de su
        evaluación; para ambas revistas, el promedio se pondera por el número de evaluaciones.
      </li>
    </ul>
  )
}
