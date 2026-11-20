/*
 * ArticuloAutoresPage — pestaña Autores (/:revista/articulos/:id/autores): los autores del artículo en orden,
 * «3 de 7», agregar y editar.
 */
import { useState } from 'react'
import { AgregarAutorModal } from '../components/AgregarAutorModal'
import { TablaAutoresArticulo } from '../components/TablaAutoresArticulo'
import { MAX_AUTORES } from '../config/listas'
import { useArticuloActual } from '../hooks/useArticuloActual'
import { EditarAutorModal } from '@/modules/autores/components/EditarAutorModal'
import { usePermiso } from '@/modules/acceso/hooks/usePermiso'
import { Boton } from '@/components/common/Boton'
import { EncabezadoPagina } from '@/components/common/EncabezadoPagina'
import type { Autor } from '@/types/autor'

export function ArticuloAutoresPage() {
  const articulo = useArticuloActual()
  const puedeRegistrar = usePermiso('registrar-datos')
  const [agregando, setAgregando] = useState(false)
  const [editando, setEditando] = useState<Autor | null>(null)

  return (
    <section className="flex flex-col gap-4">
      <EncabezadoPagina
        nivel="h2"
        titulo="Autores del artículo"
        acciones={
          puedeRegistrar && (
            <Boton tamano="sm" onClick={() => setAgregando(true)}>
              Agregar autor
            </Boton>
          )
        }
      >
        <p className="text-etiqueta-13 text-texto-secundario">
          {articulo.autores.length} de {MAX_AUTORES}
        </p>
      </EncabezadoPagina>
      <TablaAutoresArticulo
        autores={articulo.autores}
        onEditar={puedeRegistrar ? (a) => setEditando(a) : undefined}
      />
      <AgregarAutorModal
        articulo={articulo}
        abierto={agregando}
        onCerrar={() => setAgregando(false)}
      />
      <EditarAutorModal autor={editando} onCerrar={() => setEditando(null)} />
    </section>
  )
}
