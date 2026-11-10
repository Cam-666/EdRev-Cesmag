/*
 * PlantillasPage — Plantillas y cuentas de correo (/administracion/plantillas): the templates of
 * the invitation, the thank-you mail and the constancia, edited without touching code, and the
 * sender account of each journal. The mails still leave from provisional accounts; the credentials
 * are stored encrypted and outside the code. Administradora only.
 * Covers: RNF-19, RNF-07, RF-25, RF-30, HU-17. The thank-you and constancia editors have no Figma design.
 */
import { useState } from 'react'
import { CuentaRemitente } from '../components/CuentaRemitente'
import { FormularioPlantilla } from '../components/FormularioPlantilla'
import { usePlantillas } from '../hooks/useAdmin'
import { Alerta } from '@/components/common/Alerta'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import type { PlantillaId } from '@/types/plantilla'

export function PlantillasPage() {
  const consulta = usePlantillas()
  const [elegida, setElegida] = useState<PlantillaId>('invitacion')
  const plantilla = consulta.data?.plantillas.find((p) => p.id === elegida)

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-titulo-16">Plantillas y cuentas de correo</h2>
      <Alerta tipo="advertencia">
        Los correos aún salen de cuentas provisionales, no de las institucionales de cada revista.
      </Alerta>

      <EstadoConsulta
        cargando={consulta.isPending}
        error={consulta.isError}
        onReintentar={() => void consulta.refetch()}
        descripcion="las plantillas"
      >
        {consulta.data && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
            <div className="flex flex-col gap-4">
              <ListaDesplegable
                etiqueta="Plantilla"
                opciones={consulta.data.plantillas.map((p) => ({
                  valor: p.id,
                  etiqueta: p.nombre,
                }))}
                valor={elegida}
                onCambio={(v) => setElegida(v as PlantillaId)}
              />
              {plantilla && <FormularioPlantilla key={plantilla.id} plantilla={plantilla} />}
            </div>

            <section aria-labelledby="titulo-cuentas" className="flex h-fit flex-col gap-3">
              <h3 id="titulo-cuentas" className="text-titulo-16">
                Cuenta remitente por revista
              </h3>
              {consulta.data.cuentas.map((c) => (
                <CuentaRemitente key={c.revista} cuenta={c} />
              ))}
              <p className="text-cuerpo-13 text-texto-secundario">
                Las credenciales se guardan cifradas y fuera del código.
              </p>
            </section>
          </div>
        )}
      </EstadoConsulta>
    </section>
  )
}
