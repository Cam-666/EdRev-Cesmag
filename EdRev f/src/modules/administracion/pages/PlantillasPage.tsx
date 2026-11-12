/*
 * PlantillasPage — Plantillas (/administracion/plantillas): each journal's templates of the
 * invitation, the thank-you mail and the constancia (with its PDF background), edited without
 * touching code. New templates can be created for any use, and one per use and journal is chosen
 * as the one in use. Administradora only.
 * Covers: RF-25, RF-30, RF-31, RF-45, RNF-12, HU-30.
 */
import { useState } from 'react'
import { FormularioPlantilla } from '../components/FormularioPlantilla'
import { NuevaPlantillaModal } from '../components/NuevaPlantillaModal'
import { usePlantillas } from '../hooks/useAdmin'
import { Boton } from '@/components/common/Boton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { REVISTAS } from '@/types/revista'
import type { Revista } from '@/types/revista'

const OPCIONES_REVISTA = (Object.keys(REVISTAS) as Revista[]).map((r) => ({
  valor: r,
  etiqueta: REVISTAS[r].nombreCorto,
}))

export function PlantillasPage() {
  const consulta = usePlantillas()
  const [revista, setRevista] = useState<Revista>('reep')
  const [elegida, setElegida] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const plantillas = (consulta.data?.plantillas ?? []).filter((p) => p.revista === revista)
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ListaDesplegable
                etiqueta="Revista"
                opciones={OPCIONES_REVISTA}
                valor={revista}
                onCambio={(v) => {
                  setRevista(v as Revista)
                  setElegida(null)
                }}
              />
              <ListaDesplegable
                etiqueta="Plantilla"
                opciones={plantillas.map((p) => ({
                  valor: p.id,
                  etiqueta: p.enUso ? `${p.nombre} (en uso)` : p.nombre,
                }))}
                valor={plantilla?.id}
                onCambio={setElegida}
              />
            </div>
            {plantilla && <FormularioPlantilla key={plantilla.id} plantilla={plantilla} />}
          </div>
        )}
      </EstadoConsulta>

      <NuevaPlantillaModal
        revista={revista}
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
