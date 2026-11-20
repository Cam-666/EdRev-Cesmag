/*
 * MensajeError — error de un campo: símbolo y texto, anunciado con role="alert" y enlazado a su campo mediante
 * aria-describedby. Lo comparten todos los controles de formulario.
 */
export interface MensajeErrorProps {
  /** Debe coincidir con el aria-describedby del campo. */
  id: string
  children: string
}

export function MensajeError({ id, children }: MensajeErrorProps) {
  return (
    <p id={id} role="alert" className="flex gap-1 text-cuerpo-13 text-estado-error">
      <span aria-hidden="true">!</span>
      <span>{children}</span>
    </p>
  )
}
