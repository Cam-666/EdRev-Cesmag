/*
 * ArticuloAutoresPage — Autores tab (/:revista/articulos/:id/autores): the article's authors in
 * order, "3 de 7", add and edit. Covers: RF-09, RF-36, HU-06.
 */
import { useState } from 'react'
import { AgregarAutorModal } from '../components/AgregarAutorModal'
import { TablaAutoresArticulo } from '../components/TablaAutoresArticulo'
import { MAX_AUTORES } from '../config/listas'
import { useArticuloActual } from '../hooks/useArticuloActual'
import { EditarAutorModal } from '@/modules/autores/components/EditarAutorModal'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { AccionesEncabezado } from '@/lib/encabezado/AccionesEncabezado'
import type { Autor } from '@/types/autor'

export function ArticuloAutoresPage() {
  const articulo = useArticuloActual()
  const puedeRegistrar = usePermiso('registrar-datos')
  const [agregando, setAgregando] = useState(false)
  const [editando, setEditando] = useState<Autor | null>(null)

  return (
    <section className="flex flex-col gap-4">
      {puedeRegistrar && (
        <AccionesEncabezado>
          <Boton tamano="sm" onClick={() => setAgregando(true)}>
            Agregar autor
          </Boton>
        </AccionesEncabezado>
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-titulo-16">Autores del artículo</h2>
        <p className="text-etiqueta-13 text-texto-secundario">
          {articulo.autores.length} de {MAX_AUTORES}
        </p>
      </div>
      <TablaAutoresArticulo
        autores={articulo.autores}
        onEditar={puedeRegistrar ? (a) => setEditando(a) : undefined}
      />
      <p className="text-cuerpo-13 text-texto-secundario">
        El orden identifica al autor principal y se conserva tal como se registró.
      </p>
      <AgregarAutorModal
        articulo={articulo}
        abierto={agregando}
        onCerrar={() => setAgregando(false)}
      />
      <EditarAutorModal autor={editando} onCerrar={() => setEditando(null)} />
    </section>
  )
}
