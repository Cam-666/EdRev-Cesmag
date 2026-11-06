/*
 * Private routes — everything behind <RutaPrivada> (session required). Administration is
 * further protected by <RutaPorPermiso> (RNF-05). One implementation per view; the journal is
 * the :revista segment (18 views per journal, identical for reep and ire).
 * Covers: RF-02, RNF-05.
 */
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AppLayout } from '../AppLayout'
import { RevistaRoute } from '../RevistaRoute'
import { RutaPorPermiso } from '@/modules/acceso/components/RutaPorPermiso'
import { RutaPrivada } from '@/modules/acceso/components/RutaPrivada'
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

export const rutasPrivadas: RouteObject[] = [
  {
    element: <RutaPrivada />,
    children: [
      {
        // Cross-journal modules: the only screens allowed to show both journals.
        element: <AppLayout />,
        children: [
          { path: '/inicio', element: <InicioGeneralPage /> },
          { path: '/informes', element: <InformesPage /> },
          { path: '/administracion', element: <Navigate to="/administracion/usuarios" replace /> },
          {
            element: <RutaPorPermiso accion="administrar" />,
            children: [
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
              {
                element: <RutaPorPermiso accion="registrar-datos" />,
                children: [
                  { path: 'articulos/nuevo', element: <ArticuloNuevoPage /> },
                  { path: 'articulos/nuevo/autores', element: <ArticuloNuevoAutoresPage /> },
                ],
              },
              {
                element: <RutaPorPermiso accion="registrar-revision" />,
                children: [
                  { path: 'articulos/:id/antiplagio', element: <ArticuloAntiplagioPage /> },
                ],
              },
              {
                path: 'articulos/:id',
                element: <FichaArticuloLayout />,
                children: [
                  { index: true, element: <ArticuloResumenPage /> },
                  { path: 'autores', element: <ArticuloAutoresPage /> },
                  { path: 'pares', element: <ArticuloParesPage /> },
                  { path: 'observaciones', element: <ArticuloObservacionesPage /> },
                  { path: 'historial', element: <ArticuloHistorialPage /> },
                  {
                    element: <RutaPorPermiso accion="reabrir-articulo" encabezado="h2" />,
                    children: [{ path: 'reabrir', element: <ArticuloReabrirPage /> }],
                  },
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
    ],
  },
]
