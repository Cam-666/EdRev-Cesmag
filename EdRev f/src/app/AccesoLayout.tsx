/*
 * AccesoLayout — shell for the three access screens (no side panel): composite background,
 * institutional heading at the top and the journals line at the bottom. The card itself is
 * rendered by each page. Covers: HU-28.
 */
import { Outlet } from 'react-router-dom'
import { FondoAcceso } from '@/modules/acceso/components/FondoAcceso'

export function AccesoLayout() {
  return (
    <div className="relative isolate flex min-h-screen flex-col text-texto-inverso">
      <FondoAcceso />
      <header className="px-6 py-5">
        <p className="text-titulo-16">UNIVERSIDAD CESMAG</p>
        <p className="text-cuerpo-13">Vicerrectoría de Investigaciones · Editorial</p>
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
