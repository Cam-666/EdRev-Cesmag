/*
 * routes — full route table. One implementation per view; the journal is the :revista segment
 * (18 views per journal, identical for reep and ire). Cross-journal modules sit outside it.
 * Covers: RF-02.
 */
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AccesoLayout } from './AccesoLayout'
import { AppLayout } from './AppLayout'
import { MuestraDiseno } from './MuestraDiseno'
import { NoEncontradaPage } from './NoEncontradaPage'
import { RevistaRoute } from './RevistaRoute'
import { AccesoPage } from '@/modules/acceso/pages/AccesoPage'
import { RecuperarEnviadoPage } from '@/modules/acceso/pages/RecuperarEnviadoPage'
import { RecuperarPage } from '@/modules/acceso/pages/RecuperarPage'
import { AdministracionLayout } from '@/modules/administracion/components/AdministracionLayout'
import { AuditoriaPage } from '@/modules/administracion/pages/AuditoriaPage'
import { PlantillasPage } from '@/modules/administracion/pages/PlantillasPage'
import { UsuariosPage } from '@/modules/administracion/pages/UsuariosPage'
import { FichaArticuloLayout } from '@/modules/articulos/components/FichaArticuloLayout'
import { ArticuloAntiplagioPage } from '@/modules/articulos/pages/ArticuloAntiplagioPage'
import { ArticuloAutoresPage } from '@/modules/articulos/pages/ArticuloAutoresPage'
import { ArticuloHistorialPage } from '@/modules/articulos/pages/ArticuloHistorialPage'
import { ArticuloNuevoAutoresPage } from '@/modules/articulos/pages/ArticuloNuevoAutoresPage'
import { ArticuloNuevoPage } from '@/modules/articulos/pages/ArticuloNuevoPage'
import { ArticuloObservacionesPage } from '@/modules/articulos/pages/ArticuloObservacionesPage'
import { ArticuloParesPage } from '@/modules/articulos/pages/ArticuloParesPage'
import { ArticuloReabrirPage } from '@/modules/articulos/pages/ArticuloReabrirPage'
import { ArticuloResumenPage } from '@/modules/articulos/pages/ArticuloResumenPage'
import { ArticulosPage } from '@/modules/articulos/pages/ArticulosPage'
import { AutoresPage } from '@/modules/autores/pages/AutoresPage'
import { ConstanciasPage } from '@/modules/constancias/pages/ConstanciasPage'
import { CorreosPage } from '@/modules/correos/pages/CorreosPage'
import { InicioGeneralPage } from '@/modules/inicio/pages/InicioGeneralPage'
import { TableroPage } from '@/modules/inicio/pages/TableroPage'
import { InformesPage } from '@/modules/informes/pages/InformesPage'
import { ParDetallePage } from '@/modules/pares/pages/ParDetallePage'
import { ParesAsignarPage } from '@/modules/pares/pages/ParesAsignarPage'
import { ParesBloqueadosPage } from '@/modules/pares/pages/ParesBloqueadosPage'
import { ParesPage } from '@/modules/pares/pages/ParesPage'

export const rutas: RouteObject[] = [
  { path: '/', element: <Navigate to="/inicio" replace /> },
  ...(import.meta.env.DEV ? [{ path: '/design-system', element: <MuestraDiseno /> }] : []),
  {
    element: <AccesoLayout />,
    children: [
      { path: '/acceso', element: <AccesoPage /> },
      { path: '/acceso/recuperar', element: <RecuperarPage /> },
      { path: '/acceso/recuperar/enviado', element: <RecuperarEnviadoPage /> },
    ],
  },
  {
    // Cross-journal modules: the only screens allowed to show both journals.
    element: <AppLayout />,
    children: [
      { path: '/inicio', element: <InicioGeneralPage /> },
      { path: '/informes', element: <InformesPage /> },
      { path: '/administracion', element: <Navigate to="/administracion/usuarios" replace /> },
      {
        element: <AdministracionLayout />,
        children: [
          { path: '/administracion/usuarios', element: <UsuariosPage /> },
          { path: '/administracion/plantillas', element: <PlantillasPage /> },
          { path: '/administracion/auditoria', element: <AuditoriaPage /> },
        ],
      },
    ],
  },
  {
    // Journal modules: reep | ire.
    path: '/:revista',
    element: <RevistaRoute />,
    children: [
      { index: true, element: <Navigate to="tablero" replace /> },
      {
        element: <AppLayout />,
        children: [
          { path: 'tablero', element: <TableroPage /> },
          { path: 'articulos', element: <ArticulosPage /> },
          { path: 'articulos/nuevo', element: <ArticuloNuevoPage /> },
          { path: 'articulos/nuevo/autores', element: <ArticuloNuevoAutoresPage /> },
          { path: 'articulos/:id/antiplagio', element: <ArticuloAntiplagioPage /> },
          {
            path: 'articulos/:id',
            element: <FichaArticuloLayout />,
            children: [
              { index: true, element: <ArticuloResumenPage /> },
              { path: 'autores', element: <ArticuloAutoresPage /> },
              { path: 'pares', element: <ArticuloParesPage /> },
              { path: 'observaciones', element: <ArticuloObservacionesPage /> },
              { path: 'historial', element: <ArticuloHistorialPage /> },
              { path: 'reabrir', element: <ArticuloReabrirPage /> },
            ],
          },
          { path: 'autores', element: <AutoresPage /> },
          { path: 'pares', element: <ParesPage /> },
          { path: 'pares/bloqueados', element: <ParesBloqueadosPage /> },
          { path: 'pares/asignar', element: <ParesAsignarPage /> },
          { path: 'pares/:id', element: <ParDetallePage /> },
          { path: 'constancias', element: <ConstanciasPage /> },
          { path: 'correos', element: <CorreosPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NoEncontradaPage /> },
]
