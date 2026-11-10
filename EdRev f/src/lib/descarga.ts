/*
 * descarga — starts the browser download of a text file built on the client (the simulated
 * constancia, the report and audit exports). One implementation for every module.
 */
export function descargarTexto(nombre: string, texto: string, tipo: string): void {
  const blob = new Blob([texto], { type: `${tipo};charset=utf-8` })
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

/** One CSV cell: quoted when it holds a separator, a quote or a line break. */
export function celdaCsv(valor: string | number): string {
  const texto = String(valor)
  return /[;"\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Semicolon-separated CSV with a BOM, so Excel (Spanish locale) opens accents correctly. */
export function csv(filas: Array<Array<string | number>>): string {
  return BOM + filas.map((f) => f.map(celdaCsv).join(';')).join('\r\n')
}
