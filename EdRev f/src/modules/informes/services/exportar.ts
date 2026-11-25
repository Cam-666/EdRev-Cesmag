/*
 * exportar — convierte un informe en un archivo CSV que abre Excel (separado por punto y coma, UTF-8 con BOM para
 * que las tildes sobrevivan). Tiene dos tablas:
 * 1. Los artículos postulados en el semestre: revista, número de OJS, nombre del artículo, autores y, si se aprobó,
 *    su volumen y número.
 * 2. Por revista, cuántos de esos artículos se publicaron, no se publicaron (siguen en proceso o se archivaron) y
 *    se rechazaron, con el total cuando el informe es de las dos revistas.
 */
import { csv } from '@/lib/descarga'
import { REVISTAS } from '@/types/revista'
import type { Informe } from '@/types/panel'

export function csvInforme(informe: Informe): string {
  const filas: Array<Array<string | number>> = [
    ['Informe de gestión', informe.etiquetaPeriodo],
    [],
    ['Artículos postulados en el periodo'],
    ['Revista', 'Número OJS', 'Nombre del artículo', 'Autor', 'Volumen y número'],
    ...informe.articulos.map((a) => [
      REVISTAS[a.revista].nombreCorto,
      a.numeroOjs,
      a.titulo,
      a.autores,
      a.publicacion ? `Vol. ${a.publicacion.volumen} n.º ${a.publicacion.numero}` : '',
    ]),
  ]
  if (informe.articulos.length === 0) filas.push(['No hay artículos postulados en este periodo.'])

  filas.push(
    [],
    ['Resultado de los artículos por revista'],
    ['Revista', 'Publicados', 'No publicados', 'Rechazados', 'Total'],
    ...informe.resultados.map((r) => [
      r.nombre,
      r.publicados,
      r.noPublicados,
      r.rechazados,
      r.publicados + r.noPublicados + r.rechazados,
    ]),
  )
  if (informe.resultados.length > 1) {
    const suma = (c: 'publicados' | 'noPublicados' | 'rechazados') =>
      informe.resultados.reduce((s, r) => s + r[c], 0)
    filas.push([
      'Total',
      suma('publicados'),
      suma('noPublicados'),
      suma('rechazados'),
      suma('publicados') + suma('noPublicados') + suma('rechazados'),
    ])
  }
  filas.push(
    [],
    [
      'Publicados: aprobados con volumen y número. No publicados: siguen en proceso o se archivaron.',
    ],
  )
  return csv(filas)
}

export function nombreArchivoInforme(informe: Informe): string {
  return `informe-gestion-${informe.periodo}-${informe.revista}.csv`
}
