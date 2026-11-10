/*
 * MatrizPermisos — "Qué puede hacer cada perfil": Sí / No with symbol and text (never color
 * alone), computed from the permissions table the system enforces. Covers: RNF-05, HU-29.
 */
import { FILAS_MATRIZ, PERFILES } from '../config/perfiles'
import { puede } from '@/modules/acceso/config/permisos'
import { Tabla } from '@/components/common/Tabla'
import type { ColumnaTabla } from '@/components/common/Tabla'

type Fila = (typeof FILAS_MATRIZ)[number]

export function MatrizPermisos() {
  const columnas: Array<ColumnaTabla<Fila>> = [
    { clave: 'accion', encabezado: 'Acción', render: (f) => f.etiqueta },
    ...PERFILES.map((p) => ({
      clave: p.valor,
      encabezado: p.etiqueta,
      render: (f: Fila) =>
        puede(p.valor, f.accion) ? (
          <span>
            <span aria-hidden="true">✓ </span>Sí
          </span>
        ) : (
          <span className="text-texto-secundario">
            <span aria-hidden="true">— </span>No
          </span>
        ),
    })),
  ]
  return (
    <section aria-labelledby="titulo-matriz" className="flex flex-col gap-3">
      <h2 id="titulo-matriz" className="text-titulo-16">
        Qué puede hacer cada perfil
      </h2>
      <Tabla
        etiqueta="Permisos por perfil"
        columnas={columnas}
        filas={FILAS_MATRIZ}
        obtenerClave={(f) => f.accion}
      />
    </section>
  )
}
