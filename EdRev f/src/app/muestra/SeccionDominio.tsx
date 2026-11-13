/*
 * SeccionDominio — part of the design-system showcase (development only).
 * Covers: RNF-11, RNF-12.
 */
import { Seccion } from './Seccion'
import { Boton } from '@/components/common/Boton'
import { ChipAreaTematica } from '@/components/common/ChipAreaTematica'
import { EncabezadoRevista } from '@/components/common/EncabezadoRevista'
import { FilaCorreoEnviado } from '@/components/common/FilaCorreoEnviado'
import { FilaParAsignado } from '@/components/common/FilaParAsignado'
import { Tabla } from '@/components/common/Tabla'
import { TarjetaMetrica } from '@/components/common/TarjetaMetrica'

export function SeccionDominio() {
  return (
    <>
      <Seccion titulo="TarjetaMetrica y ChipAreaTematica">
        <div className="grid grid-cols-4 gap-4">
          <TarjetaMetrica valor={7} etiqueta="Pares sin responder" alerta href="/design-system" />
          <TarjetaMetrica
            valor={12}
            etiqueta="Constancias pendientes"
            alerta
            href="/design-system"
          />
          <TarjetaMetrica valor={31} etiqueta="En evaluación" />
          <TarjetaMetrica valor={23} etiqueta="Aprobados" />
        </div>
        <div className="flex flex-wrap gap-2">
          <ChipAreaTematica area="Educación inclusiva" />
          <ChipAreaTematica area="Didáctica de las ciencias" onQuitar={() => undefined} />
        </div>
      </Seccion>

      <Seccion titulo="FilaParAsignado y FilaCorreoEnviado">
        <ul className="flex flex-col gap-3">
          <FilaParAsignado
            orden={1}
            nombre="Luz Marina Burbano"
            universidad="Universidad de Nariño"
            estado="entrego"
            concepto="Publicable"
            fechaEntrega="2026-10-26"
            constanciaEmitida
          />
          <FilaParAsignado
            orden={3}
            nombre="Hernán Delgado"
            universidad="Universidad del Cauca"
            estado="acepto"
            esDesempate
            acciones={
              <Boton variante="secundario" tamano="sm">
                Reenviar invitación
              </Boton>
            }
          />
        </ul>
        <Tabla
          etiqueta="Correos de ejemplo"
          filas={['a', 'b', 'c']}
          obtenerClave={(f) => f}
          columnas={[
            { clave: 'tipo', encabezado: 'Tipo', render: () => null },
            { clave: 'dest', encabezado: 'Destinatario', render: () => null },
            { clave: 'fecha', encabezado: 'Fecha', render: () => null },
            { clave: 'res', encabezado: 'Resultado', render: () => null },
            { clave: 'acc', encabezado: 'Acción', render: () => null },
          ]}
          renderFila={(f) =>
            f === 'a' ? (
              <FilaCorreoEnviado
                key={f}
                tipo="Agradecimiento con constancia"
                destinatario="lm.burbano@udenar.edu.co"
                fechaEnvio="2026-10-26T16:02:00"
                resultado="enviado"
              />
            ) : f === 'b' ? (
              <FilaCorreoEnviado
                key={f}
                tipo="Reenvío de invitación"
                destinatario="j.rosero@umariana.edu.co"
                fechaEnvio="2026-10-14T09:41:00"
                resultado="rebotado"
                accion={
                  <Boton variante="texto" tamano="sm">
                    Corregir
                  </Boton>
                }
              />
            ) : (
              <FilaCorreoEnviado
                key={f}
                tipo="Recordatorio al par"
                destinatario="h.delgado@unicesmag.edu.co"
                fechaEnvio="2026-10-27T09:30:00"
                resultado="en-cola"
              />
            )
          }
        />
      </Seccion>

      <Seccion titulo="EncabezadoRevista (60 px, solo la barra cambia entre revistas)">
        <div className="flex flex-col gap-3">
          <EncabezadoRevista revista="reep" />
          <EncabezadoRevista revista="ire" />
        </div>
      </Seccion>
    </>
  )
}
