/*
 * TablaCorreosRevista — the journal's sent-mail log: type, recipient, article, date and result
 * (symbol + text, never color alone). A bounced mail offers "Corregir" (fix the address and
 * resend), a failed or queued one "Reintentar", the rest "Ver". Covers: RF-26, RF-27, RF-28, HU-18, HU-20, RNF-12.
 */
import { ETIQUETA_TIPO_CORREO } from '../config/listas'
import type { CorreoConArticulo } from '../services/correosService'
import { Boton } from '@/components/common/Boton'
import { FilaCorreoEnviado } from '@/components/common/FilaCorreoEnviado'
import { Tabla } from '@/components/common/Tabla'

export interface TablaCorreosRevistaProps {
  correos: CorreoConArticulo[]
  cargando: boolean
  vacio: string
  /** Whether the user may fix and retry (Administradora and Auxiliar). */
  puedeReintentar: boolean
  onVer: (correo: CorreoConArticulo) => void
  onCorregir: (correo: CorreoConArticulo) => void
  onReintentar: (correo: CorreoConArticulo) => void
}

export function TablaCorreosRevista({
  correos,
  cargando,
  vacio,
  puedeReintentar,
  onVer,
  onCorregir,
  onReintentar,
}: TablaCorreosRevistaProps) {
  return (
    <Tabla
      etiqueta="Registro de envíos de la revista"
      columnas={[
        { clave: 'tipo', encabezado: 'Tipo', render: () => null },
        { clave: 'destinatario', encabezado: 'Destinatario', render: () => null },
        { clave: 'articulo', encabezado: 'Artículo', render: () => null },
        { clave: 'fecha', encabezado: 'Fecha', render: () => null },
        { clave: 'resultado', encabezado: 'Resultado', render: () => null },
        { clave: 'accion', encabezado: 'Acción', render: () => null },
      ]}
      filas={correos}
      obtenerClave={(c) => c.id}
      cargando={cargando}
      vacio={vacio}
      renderFila={(c) => (
        <FilaCorreoEnviado
          key={c.id}
          tipo={ETIQUETA_TIPO_CORREO[c.tipo]}
          destinatario={c.destinatario}
          numeroOjs={c.numeroOjs}
          fechaEnvio={c.fechaEnvio}
          resultado={c.estado}
          atendido={c.atendido}
          accion={
            c.estado === 'rebotado' && !c.atendido && puedeReintentar ? (
              <Boton variante="secundario" tamano="sm" onClick={() => onCorregir(c)}>
                Corregir <span className="sr-only">el correo a {c.destinatario}</span>
              </Boton>
            ) : (c.estado === 'en-cola' || (c.estado === 'fallido' && !c.atendido)) &&
              puedeReintentar ? (
              <Boton variante="secundario" tamano="sm" onClick={() => onReintentar(c)}>
                Reintentar <span className="sr-only">el correo a {c.destinatario}</span>
              </Boton>
            ) : (
              <Boton variante="texto" tamano="sm" onClick={() => onVer(c)}>
                Ver <span className="sr-only">el correo a {c.destinatario}</span>
              </Boton>
            )
          }
        />
      )}
    />
  )
}
