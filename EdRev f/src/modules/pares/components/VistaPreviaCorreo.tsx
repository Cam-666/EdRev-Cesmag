/*
 * VistaPreviaCorreo — the invitation exactly as it will be sent, shown before confirming the
 * assignment: sender account of the journal, recipient, subject, body and the no-attachments note.
 * Covers: RF-24, RF-25, HU-17.
 */
import type { VistaPreviaInvitacion } from '@/types/par'

export interface VistaPreviaCorreoProps {
  vista: VistaPreviaInvitacion
}

export function VistaPreviaCorreo({ vista }: VistaPreviaCorreoProps) {
  return (
    <section
      aria-labelledby="titulo-vista-previa"
      className="flex flex-col gap-3 rounded-lg border border-borde-fuerte bg-superficie-sutil p-4"
    >
      <h2 id="titulo-vista-previa" className="text-micro-11 uppercase text-texto-secundario">
        Vista previa
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-cuerpo-13">
        <dt className="text-texto-secundario">De</dt>
        <dd className="text-texto-principal">{vista.de}</dd>
        <dt className="text-texto-secundario">Para</dt>
        <dd className="text-texto-principal">{vista.para}</dd>
        <dt className="text-texto-secundario">Asunto</dt>
        <dd className="text-texto-principal">{vista.asunto}</dd>
      </dl>
      <p className="whitespace-pre-line rounded-md bg-superficie-tarjeta p-3 text-cuerpo-15 text-texto-principal">
        {vista.cuerpo}
      </p>
      <p className="text-cuerpo-13 text-texto-secundario">{vista.adjuntos}</p>
    </section>
  )
}
