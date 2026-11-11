/*
 * PlantillasPage — Plantillas (/administracion/plantillas): the templates of the invitation, the
 * thank-you mail and the constancia, edited without touching code; new templates can be created
 * for any of those uses and one of them is chosen as the one in use. Administradora only.
 * Covers: RNF-19, RF-25, RF-30. The thank-you and constancia editors have no Figma design.
 */
import { useState } from 'react'
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
        titulo="Plantillas"
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
          <div className="flex max-w-3xl flex-col gap-4">
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
