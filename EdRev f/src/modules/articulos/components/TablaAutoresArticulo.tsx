/* TablaAutoresArticulo — los autores del artículo en el orden en que se registraron; el primero es el autor principal. */
import { Boton } from '@/components/common/Boton'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'
import type { AutorDeArticulo } from '@/types/autor'

export interface TablaAutoresArticuloProps {
  autores: AutorDeArticulo[]
  /** Cuando se da, cada fila muestra un botón «Editar». */
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
