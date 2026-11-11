/*
 * PlantillasPage — Plantillas y cuentas de correo (/administracion/plantillas): the templates of
 * the invitation, the thank-you mail and the constancia, edited without touching code; new
 * templates can be created for any of those uses and one of them is chosen as the one in use.
 * Also the sender address of each journal. Administradora only.
 * Covers: RNF-19, RNF-07, RF-25, RF-30, HU-17. The thank-you and constancia editors have no Figma design.
 */
import { useState } from 'react'
import { CuentaRemitente } from '../components/CuentaRemitente'
import { FormularioPlantilla } from '../components/FormularioPlantilla'
import { NuevaPlantillaModal } from '../components/NuevaPlantillaModal'
import { usePlantillas } from '../hooks/useAdmin'
import { Boton } from '@/components/common/Boton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'

export function PlantillasPage() {
  const consulta = usePlantillas()
  const [elegida, setElegida] = useState('invitacion')
  const [creando, setCreando] = useState(false)
  const plantillas = consulta.data?.plantillas ?? []
  const plantilla = plantillas.find((p) => p.id === elegida) ?? plantillas[0]

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        nivel="h2"
        titulo="Plantillas y cuentas de correo"
        acciones={
          <Boton tamano="sm" onClick={() => setCreando(true)}>
            Nueva plantilla
          </Boton>
        }
      />

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
                opciones={plantillas.map((p) => ({
                  valor: p.id,
                  etiqueta: p.enUso ? `${p.nombre} (en uso)` : p.nombre,
                }))}
                valor={plantilla?.id}
                onCambio={setElegida}
              />
              {plantilla && <FormularioPlantilla key={plantilla.id} plantilla={plantilla} />}
            </div>

            <section aria-labelledby="titulo-cuentas" className="flex h-fit flex-col gap-4">
              <h3 id="titulo-cuentas" className="text-titulo-16">
                Cuenta remitente
              </h3>
              {consulta.data.cuentas.map((c) => (
                <CuentaRemitente key={c.revista} cuenta={c} />
              ))}
            </section>
          </div>
        )}
      </EstadoConsulta>

      <NuevaPlantillaModal
        abierto={creando}
        onCerrar={() => setCreando(false)}
        onCreada={(p) => {
          setCreando(false)
          setElegida(p.id)
        }}
      />
    </section>
  )
}
