/* ListaAuditoria — «Cambios»: todo cambio de estado, edición, correo y constancia del artículo, con su usuario y fecha. */
import { abreviarNombre, formatearFechaHora } from '@/lib/format'
import type { EntradaAuditoria } from '@/types/historial'

export interface ListaAuditoriaProps {
  entradas: EntradaAuditoria[]
}

export function ListaAuditoria({ entradas }: ListaAuditoriaProps) {
  return (
    <section
      aria-labelledby="titulo-auditoria"
      className="h-fit rounded-lg border border-borde-base bg-superficie-tarjeta p-5 shadow-tarjeta"
    >
      <h2 id="titulo-auditoria" className="mb-3 text-titulo-16">
        Cambios
      </h2>
      {entradas.length === 0 ? (
        <p className="text-cuerpo-13 text-texto-secundario">Aún no hay cambios registrados.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {entradas.map((e) => (
            <li key={e.id} className="flex flex-col">
              <span className="text-cuerpo-15 text-texto-principal">{e.accion}</span>
              <span className="text-cuerpo-13 text-texto-secundario">
                {formatearFechaHora(e.fecha)} ·{' '}
                {e.usuario === 'Sistema' ? 'Sistema' : abreviarNombre(e.usuario)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
