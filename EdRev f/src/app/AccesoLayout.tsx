/*
 * AccesoLayout — marco de las tres pantallas de acceso (sin panel lateral): fondo compuesto, encabezado
 * institucional arriba y la línea de las revistas abajo. La tarjeta la dibuja cada página.
 */
import { Outlet } from 'react-router-dom'
import { Escudo } from '@/components/common/Escudo'
import { FondoAcceso } from '@/modules/acceso/components/FondoAcceso'

export function AccesoLayout() {
  return (
    <div className="relative isolate flex min-h-screen flex-col text-texto-inverso">
      <FondoAcceso />
      <header className="flex items-center gap-3 px-6 py-5">
        <Escudo tamano="md" />
        <div>
          <p className="text-titulo-16">UNIVERSIDAD CESMAG</p>
          <p className="text-cuerpo-13">Vicerrectoría de Investigaciones · Editorial</p>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-8 text-texto-principal">
        <Outlet />
      </main>
      <footer className="px-6 py-5 text-center text-cuerpo-13">
        Revista Electrónica en Educación y Pedagogía · Revista Investigium IRE Ciencias Sociales y
        Humanas
      </footer>
    </div>
  )
}
