/*
 * MensajeError — field error: symbol + text, announced with role="alert" and linked to its field
 * through aria-describedby. Shared by every form control. Covers: RNF-11, RNF-12.
 */
export interface MensajeErrorProps {
  /** Must match the aria-describedby of the field. */
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
