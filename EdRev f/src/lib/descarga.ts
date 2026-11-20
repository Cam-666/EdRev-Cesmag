/*
 * descarga — inicia la descarga en el navegador de un archivo armado en el cliente (los CSV del informe y de la
 * auditoría). Una sola implementación para todos los módulos.
 */
export function descargarTexto(nombre: string, texto: string, tipo: string): void {
  descargarArchivo(nombre, new Blob([texto], { type: `${tipo};charset=utf-8` }))
}

/** Inicia la descarga en el navegador de un archivo (un Blob de la API o armado aquí). */
export function descargarArchivo(nombre: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

const BOM = String.fromCharCode(0xfeff)

/** Una celda de CSV: se entrecomilla cuando tiene un separador, una comilla o un salto de línea. */
export function celdaCsv(valor: string | number): string {
  const texto = String(valor)
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** CSV separado por punto y coma y con BOM, para que Excel en español abra bien las tildes. */
export function csv(filas: Array<Array<string | number>>): string {
  return BOM + filas.map((f) => f.map(celdaCsv).join(';')).join('\r\n')
}
