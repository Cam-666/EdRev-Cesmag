/*
 * TablaCorreos — los correos enviados de este artículo: tipo, destinatario, fecha y resultado (símbolo y texto).
 * El registro distingue las invitaciones, los reenvíos, los segundos intentos y los correos de agradecimiento.
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
