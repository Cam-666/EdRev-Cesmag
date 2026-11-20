/*
 * MarcaReep — marca de la Revista Electrónica en Educación y Pedagogía dentro de la barra superior: el logo real
 * de la revista, centrado sobre la parte clara del degradado (como en el encabezado propio de la revista).
 * Por debajo del punto de quiebre xl pasa al título blanco compacto sobre la zona izquierda oscura.
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
