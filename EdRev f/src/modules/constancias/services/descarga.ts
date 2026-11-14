/*
 * descarga — download of a constancia: the PDF of the backend, or (simulated API) a printable
 * HTML page with the same content: letterhead, the rendered text and the signature. Covers: RF-32 (download when the peer asks for it).
 */
import { solicitarArchivo } from '@/lib/api/cliente'
import { descargarArchivo, descargarTexto } from '@/lib/descarga'
import { obtenerVistaConstancia } from './constanciasService'
import type { Revista } from '@/types/revista'
import type { VistaConstancia } from '@/types/constancia'

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function htmlConstancia(vista: VistaConstancia): string {
  const parrafos = vista.cuerpo
    .split('\n\n')
    .map((p) => `<p>${escapar(p)}</p>`)
    .join('\n')
  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><title>Constancia de participación</title></head>
<body style="font-family: Georgia, serif; max-width: 640px; margin: 64px auto; text-align: center">
<h1>${escapar(vista.universidad)}</h1>
<h2>${escapar(vista.revista)}</h2>
${parrafos}
<p><strong>${escapar(vista.firma)}</strong></p>
${vista.fondo ? `<p><small>${escapar(vista.fondo)}</small></p>` : ''}
</body>
</html>
`
}

export function nombreArchivo(par: string): string {
  const limpio = par
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
  return `constancia-${limpio}.html`
}

/**
 * Downloads a constancia (RF-32): with the real API, the PDF it generates over the journal's
 * background; with the simulated API, a printable HTML page with the same content.
 */
export async function descargarConstancia(
  revista: Revista,
  id: string,
  par: string,
): Promise<void> {
  if (import.meta.env.VITE_USE_MOCKS === 'false') {
    const pdf = await solicitarArchivo(`/${revista}/constancias/${encodeURIComponent(id)}/pdf`)
    descargarArchivo(nombreArchivo(par).replace(/\.html$/, '.pdf'), pdf)
    return
  }
  const vista: VistaConstancia = await obtenerVistaConstancia(revista, id)
  descargarTexto(nombreArchivo(par), htmlConstancia(vista), 'text/html')
}
