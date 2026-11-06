/*
 * AccesoLayout — shell for the three access screens (no side panel).
 * Phase 3 replaces the plain background with FondoAcceso and adds the 440 px card.
 * Covers: HU-28 (access).
 */
import { Outlet } from 'react-router-dom'

export function AccesoLayout() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-superficie-fondo p-6">
      <Outlet />
    </main>
  )
}
