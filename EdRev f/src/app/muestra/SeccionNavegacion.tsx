/* SeccionNavegacion — parte del muestrario del sistema de diseño (solo desarrollo). */
import { useState } from 'react'
import { Seccion } from './Seccion'
import { DistintivoEstado } from '@/components/common/DistintivoEstado'
import type { EstadoDistintivo } from '@/components/common/DistintivoEstado'
import { Paginacion } from '@/components/common/Paginacion'
import { Pestanas } from '@/components/common/Pestanas'
import { Tabla } from '@/components/common/Tabla'

interface FilaDemo {
  ojs: string
  titulo: string
  estado: EstadoDistintivo
}

const FILAS: FilaDemo[] = [
  {
    ojs: '2026-034',
    titulo: 'Alfabetización mediática en la formación de maestros',
    estado: 'en-evaluacion',
  },
  { ojs: '2026-024', titulo: 'Convivencia escolar en contextos rurales', estado: 'aprobado' },
  { ojs: '2026-007', titulo: 'Formación ciudadana y memoria histórica', estado: 'archivado' },
]

export function SeccionNavegacion() {
  const [pagina, setPagina] = useState(1)
  return (
    <>
      <Seccion titulo="Pestanas (flechas, Inicio y Fin)">
        <Pestanas
          etiqueta="Secciones del artículo"
          pestanas={[
            {
              valor: 'resumen',
              etiqueta: 'Resumen',
              contenido: <p>Datos del artículo, antiplagio y comité.</p>,
            },
            { valor: 'autores', etiqueta: 'Autores', contenido: <p>Lista de autores.</p> },
            {
              valor: 'pares',
              etiqueta: 'Pares y evaluación',
              contenido: <p>Asignaciones y resultados.</p>,
            },
            { valor: 'historial', etiqueta: 'Historial', contenido: <p>Correos y auditoría.</p> },
          ]}
        />
      </Seccion>

      <Seccion titulo="Tabla, Paginacion (normal, cargando, vacía)">
        <Tabla
          etiqueta="Artículos de ejemplo"
          filas={FILAS}
          obtenerClave={(f) => f.ojs}
          hrefFila={(f) => `/design-system#${f.ojs}`}
          etiquetaEnlace={(f) => `Abrir artículo ${f.ojs}`}
          columnas={[
            { clave: 'ojs', encabezado: 'Nº OJS', render: (f) => f.ojs },
            { clave: 'titulo', encabezado: 'Título', render: (f) => f.titulo },
            {
              clave: 'estado',
              encabezado: 'Estado',
              render: (f) => <DistintivoEstado estado={f.estado} />,
            },
          ]}
        />
        <Paginacion pagina={pagina} porPagina={6} total={142} onCambiar={setPagina} />
        <div className="grid grid-cols-2 gap-4">
          <Tabla
            etiqueta="Tabla cargando"
            filas={[]}
            cargando
            obtenerClave={() => ''}
            columnas={[
              { clave: 'a', encabezado: 'Nº OJS', render: () => null },
              { clave: 'b', encabezado: 'Título', render: () => null },
            ]}
          />
          <Tabla
            etiqueta="Tabla vacía"
            filas={[]}
            obtenerClave={() => ''}
            vacio="Aún no hay artículos registrados."
            columnas={[
              { clave: 'a', encabezado: 'Nº OJS', render: () => null },
              { clave: 'b', encabezado: 'Título', render: () => null },
            ]}
          />
        </div>
      </Seccion>
    </>
  )
}
