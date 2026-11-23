/*
 * HojasPdf — muestra un PDF como hojas completas dentro de la página (cada página dibujada al ancho del recuadro),
 * sin depender del visor de PDF del navegador. Ese visor abre a veces la hoja ampliada y deja fuera de la vista el
 * pie de página o la firma; en los celulares, además, muchas veces no muestra nada. La biblioteca pdf.js se carga
 * solo cuando hace falta. Si no se puede dibujar (navegador sin lienzo o error al leer el archivo), se usa el visor
 * del navegador como respaldo.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

export interface HojasPdfProps {
  /** El PDF que se muestra; null mientras se prepara. */
  archivo: Blob | null
  /** Nombre accesible de la vista (por ejemplo «Vista previa de la constancia en PDF»). */
  titulo: string
  /** Clases del visor de respaldo (alto del recuadro). */
  claseRespaldo?: string
  className?: string
}

/** En las pruebas (jsdom) no hay lienzo: se usa directamente el visor de respaldo. */
const sinLienzo = () => typeof navigator === 'undefined' || /jsdom/i.test(navigator.userAgent)

export function HojasPdf({ archivo, titulo, claseRespaldo, className }: HojasPdfProps) {
  const contenedor = useRef<HTMLDivElement>(null)
  const [ancho, setAncho] = useState(0)
  const [respaldo, setRespaldo] = useState(sinLienzo)
  const [paginas, setPaginas] = useState(0)

  // El ancho disponible: las hojas se vuelven a dibujar si cambia (ventana más angosta, panel que se abre…).
  useEffect(() => {
    const el = contenedor.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(([entrada]) => {
      const w = Math.floor(entrada?.contentRect.width ?? 0)
      setAncho((anterior) => (Math.abs(anterior - w) > 4 ? w : anterior))
    })
    observador.observe(el)
    return () => observador.disconnect()
  }, [respaldo])

  useEffect(() => {
    if (respaldo || !archivo || ancho < 50) return
    let cancelado = false
    let tarea: { destroy: () => Promise<void> } | null = null
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        const { default: trabajador } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
        pdfjs.GlobalWorkerOptions.workerSrc = trabajador
        const carga = pdfjs.getDocument({ data: new Uint8Array(await archivo.arrayBuffer()) })
        tarea = carga
        const doc = await carga.promise
        if (cancelado) return
        setPaginas(doc.numPages)
        const densidad = Math.min(window.devicePixelRatio || 1, 2)
        for (let n = 1; n <= doc.numPages; n++) {
          const pagina = await doc.getPage(n)
          const base = pagina.getViewport({ scale: 1 })
          const vista = pagina.getViewport({ scale: (ancho / base.width) * densidad })
          // Se espera a que React haya puesto el lienzo de esta página.
          await new Promise((r) => requestAnimationFrame(r))
          const lienzo = contenedor.current?.querySelector<HTMLCanvasElement>(
            `canvas[data-pagina="${n}"]`,
          )
          if (cancelado || !lienzo) return
          lienzo.width = Math.floor(vista.width)
          lienzo.height = Math.floor(vista.height)
          lienzo.style.width = `${ancho}px`
          lienzo.style.height = `${Math.floor(vista.height / densidad)}px`
          await pagina.render({ canvas: lienzo, viewport: vista }).promise
        }
        await tarea?.destroy()
      } catch {
        if (!cancelado) setRespaldo(true)
      }
    })()
    return () => {
      cancelado = true
      void tarea?.destroy()
    }
  }, [archivo, ancho, respaldo])

  const direccion = useMemo(
    () =>
      respaldo && archivo && typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(archivo)
        : null,
    [respaldo, archivo],
  )
  useEffect(() => () => (direccion ? URL.revokeObjectURL(direccion) : undefined), [direccion])

  if (respaldo) {
    return direccion ? (
      <iframe
        title={titulo}
        src={`${direccion}#view=Fit`}
        className={cn(
          'bg-white w-full rounded-lg border border-borde-base',
          claseRespaldo,
          className,
        )}
      />
    ) : null
  }
  return (
    <div
      ref={contenedor}
      role="img"
      aria-label={titulo}
      className={cn('flex w-full flex-col gap-3 rounded-lg bg-superficie-sutil p-3', className)}
    >
      {Array.from({ length: paginas }, (_, i) => (
        <canvas
          key={i}
          data-pagina={i + 1}
          aria-hidden="true"
          className="rounded bg-white shadow-sm block w-full ring-1 ring-borde-base"
        />
      ))}
    </div>
  )
}
