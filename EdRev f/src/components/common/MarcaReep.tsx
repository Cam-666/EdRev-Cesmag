/*
 * MarcaReep — brand of Revista Electrónica en Educación y Pedagogía inside the top bar: the real
 * journal logo, centred over the light part of the gradient (as in the journal's own header).
 * Below the xl breakpoint it falls back to the compact white title on the dark left zone.
 */
import logo from '@/assets/logo-reep.webp'
import { REVISTAS } from '@/types/revista'

export function MarcaReep() {
  const datos = REVISTAS.reep
  return (
    <>
      <p className="relative min-w-0 max-w-titulo truncate text-titulo-16 xl:hidden">
        {datos.tituloBarra}
      </p>
      <img
        src={logo}
        alt={datos.nombre}
        className="pointer-events-none absolute left-1/2 top-1/2 hidden h-12 -translate-x-1/2 -translate-y-1/2 xl:block"
      />
    </>
  )
}
