/*
 * TablaAutoresArticulo — authors of the article in the order they were registered; the first one
 * is the main author. Covers: RF-09, HU-06 (up to seven authors, order kept).
 */
import { Boton } from '@/components/common/Boton'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { AutorDeArticulo } from '@/types/autor'

export interface TablaAutoresArticuloProps {
  autores: AutorDeArticulo[]
  /** When provided, each row shows an "Editar" button. */
  onEditar?: (autor: AutorDeArticulo) => void
}

export function TablaAutoresArticulo({ autores, onEditar }: TablaAutoresArticuloProps) {
  const columnas: Array<ColumnaTabla<AutorDeArticulo>> = [
    { clave: 'orden', encabezado: '#', render: (a) => a.orden },
    { clave: 'autor', encabezado: 'Autor', render: (a) => a.nombre },
    { clave: 'orcid', encabezado: 'ORCID', render: (a) => a.orcid || '—', className: 'whitespace-nowrap' },
    { clave: 'filiacion', encabezado: 'Filiación', render: (a) => a.filiacion },
    { clave: 'pais', encabezado: 'País', render: (a) => a.pais },
    { clave: 'rol', encabezado: 'Rol', render: (a) => (a.orden === 1 ? 'Principal' : '--') },
  ]
  if (onEditar) {
    columnas.push({
      clave: 'acciones',
      encabezado: 'Acciones',
      render: (a) => (
        <Boton variante="texto" tamano="sm" onClick={() => onEditar(a)}>
          Editar <span className="sr-only">a {a.nombre}</span>
        </Boton>
      ),
    })
  }
  return (
    <Tabla
      etiqueta="Autores del artículo"
      columnas={columnas}
      filas={autores}
      obtenerClave={(a) => a.id}
      vacio="Este artículo aún no tiene autores."
    />
  )
}
