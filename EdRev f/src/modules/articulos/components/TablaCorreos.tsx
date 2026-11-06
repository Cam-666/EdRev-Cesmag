/*
 * TablaCorreos — mails sent for this article: type, recipient, date and result (symbol + text).
 * Covers: RF-26, RF-27, HU-18, HU-20 (the log tells invitations, resends, reminders and
 * thank-you mails apart).
 */
import { ETIQUETA_TIPO_CORREO } from '@/modules/correos/config/listas'
import { FilaCorreoEnviado } from '@/components/common/FilaCorreoEnviado'
import { Tabla } from '@/components/common/Tabla'
import type { CorreoEnviado } from '@/types/historial'

export interface TablaCorreosProps {
  correos: CorreoEnviado[]
}

export function TablaCorreos({ correos }: TablaCorreosProps) {
  return (
    <Tabla
      etiqueta="Correos enviados por este artículo"
      columnas={[
        { clave: 'tipo', encabezado: 'Tipo', render: () => null },
        { clave: 'destinatario', encabezado: 'Destinatario', render: () => null },
        { clave: 'fecha', encabezado: 'Fecha', render: () => null },
        { clave: 'resultado', encabezado: 'Resultado', render: () => null },
      ]}
      filas={correos}
      obtenerClave={(c) => c.id}
      vacio="Aún no se han enviado correos por este artículo."
      renderFila={(c) => (
        <FilaCorreoEnviado
          key={c.id}
          tipo={ETIQUETA_TIPO_CORREO[c.tipo]}
          destinatario={c.destinatario}
          fechaEnvio={c.fechaEnvio}
          resultado={c.estado}
        />
      )}
    />
  )
}
