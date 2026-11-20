/*
 * TablaCorreosRevista — el registro de correos enviados de la revista: tipo, destinatario, artículo, fecha y
 * resultado (símbolo y texto, nunca solo color). Un correo rebotado ofrece «Corregir» (corregir la dirección y
 * reenviar), uno fallido o en cola «Reintentar», los demás «Ver».
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
  /** Si el usuario puede corregir y reintentar (Administradora y Auxiliar). */
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
          numeroOjs={c.tipo === 'mensaje' ? '—' : c.numeroOjs}
          fechaEnvio={c.fechaEnvio}
          resultado={c.estado}
          atendido={c.atendido}
          accion={
            c.estado === 'rebotado' && !c.atendido && puedeReintentar && c.tipo !== 'mensaje' ? (
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
