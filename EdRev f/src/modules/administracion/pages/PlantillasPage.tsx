/*
 * PlantillasPage — Plantillas (/administracion/plantillas): las plantillas de correo y de archivo de cada revista,
 * que se editan sin tocar el código. Las plantillas nuevas se crean con un nombre libre y un fin (invitación,
 * agradecimiento o constancia), nacen en blanco y se pueden eliminar mientras no estén en uso; para qué se usa
 * cada una se elige en Configuración. Solo para la Administradora.
 */
import { useState } from 'react'
import { FormularioPlantilla } from '../components/FormularioPlantilla'
import { NuevaPlantillaModal } from '../components/NuevaPlantillaModal'
import { usePlantillas } from '../hooks/useAdmin'
import { Boton } from '@/components/common/Boton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import { EstadoConsulta } from '@/components/common/EstadoConsulta'
import { ListaDesplegable } from '@/components/common/ListaDesplegable'
import { ETIQUETA_USO } from '../config/plantillas'
import { REVISTAS } from '@/types/revista'
import type { Plantilla, UsoPlantilla } from '@/types/plantilla'
import type { Revista } from '@/types/revista'

const OPCIONES_REVISTA = (Object.keys(REVISTAS) as Revista[]).map((r) => ({
  valor: r,
  etiqueta: REVISTAS[r].nombreCorto,
}))

const PALABRA_DEL_FIN: Record<UsoPlantilla, string> = {
  invitacion: 'invit',
  agradecimiento: 'agradec',
  constancia: 'constan',
}

/** El nombre, para qué sirve (salvo que el nombre ya lo diga) y si está en uso. */
function etiquetaDeLaPlantilla(p: Plantilla): string {
  const dice = p.nombre.toLowerCase().includes(PALABRA_DEL_FIN[p.fin])
  return `${p.nombre}${dice ? '' : ` · ${ETIQUETA_USO[p.fin]}`}${p.uso ? ' · en uso' : ''}`
}

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
                  etiqueta: etiquetaDeLaPlantilla(p),
                }))}
                valor={plantilla?.id}
                onCambio={setElegida}
              />
            </div>
            {plantilla && (
              <FormularioPlantilla
                key={plantilla.id}
                plantilla={plantilla}
                onEliminada={() => setElegida(null)}
              />
            )}
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
