/*
 * Seed users — the three accounts of the dependency shown in the design (Administración).
 * Covers: RF-40, HU-29. Used by the mock login and the user selector.
 */
import type { Usuario } from '@/types/usuario'

export const ADMINISTRADORA: Usuario = {
  id: 'u-1',
  nombre: 'Ma. Camila Mendoza',
  correo: 'maria.mendoza@unicesmag.edu.co',
  perfil: 'administrador',
  estado: 'activo',
  ultimoIngreso: '2026-11-03T07:42:00',
}

export const AUXILIAR: Usuario = {
  id: 'u-2',
  nombre: 'Andrea Villota',
  correo: 'andrea.villota@unicesmag.edu.co',
  perfil: 'auxiliar',
  estado: 'activo',
  ultimoIngreso: '2026-11-02T16:08:00',
}

export const AUXILIAR_INHABILITADA: Usuario = {
  id: 'u-3',
  nombre: 'Daniela Ortiz',
  correo: 'daniela.ortiz@unicesmag.edu.co',
  perfil: 'auxiliar',
  estado: 'inhabilitado',
  ultimoIngreso: '2026-07-18T11:25:00',
}

export const USUARIOS_SEED: Usuario[] = [ADMINISTRADORA, AUXILIAR, AUXILIAR_INHABILITADA]
