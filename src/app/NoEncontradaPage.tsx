/*
 * NoEncontradaPage — 404 for unknown URLs.
 */
import { Link } from 'react-router-dom'

export function NoEncontradaPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-titulo-24">Página no encontrada</h1>
      <Link to="/inicio" className="text-texto-enlace">
        Volver al inicio general
      </Link>
    </main>
  )
}
