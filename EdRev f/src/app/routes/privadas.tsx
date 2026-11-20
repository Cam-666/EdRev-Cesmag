/*
 * Rutas privadas — todo lo que está detrás de <RutaPrivada> (exige sesión). Administración tiene además la
 * protección de <RutaPorPermiso> (solo la Administradora). Hay una sola implementación por pantalla; la revista
 * es el segmento :revista (las mismas pantallas para reep e ire).
 */
import { Navigate } from 'react-router-dom'
import type { RouteObject } from 'react-router-dom'
import { AppLayout } from '../AppLayout'
import { RevistaRoute } from '../RevistaRoute'
import { RutaPorPermiso } from '@/modules/acceso/components/RutaPorPermiso'
import { RutaPrivada } from '@/modules/acceso/components/RutaPrivada'
import { AdministracionLayout } from '@/modules/administracion/components/AdministracionLayout'
import { ConfiguracionPage } from '@/modules/administracion/pages/ConfiguracionPage'
import { AuditoriaPage } from '@/modules/administracion/pages/AuditoriaPage'
import { PlantillasPage } from '@/modules/administracion/pages/PlantillasPage'
import { UsuariosPage } from '@/modules/administracion/pages/UsuariosPage'
import { FichaArticuloLayout } from '@/modules/articulos/components/FichaArticuloLayout'
import { ArticuloAutoresPage } from '@/modules/articulos/pages/ArticuloAutoresPage'
import { ArticuloComitePage } from '@/modules/articulos/pages/ArticuloComitePage'
import { ArticuloHistorialPage } from '@/modules/articulos/pages/ArticuloHistorialPage'
import { ArticuloNuevoPage } from '@/modules/articulos/pages/ArticuloNuevoPage'
import { ArticuloParesPage } from '@/modules/articulos/pages/ArticuloParesPage'
import { ArticuloReabrirPage } from '@/modules/articulos/pages/ArticuloReabrirPage'
import { ArticuloResumenPage } from '@/modules/articulos/pages/ArticuloResumenPage'
import { ArticulosPage } from '@/modules/articulos/pages/ArticulosPage'
import { AutorDetallePage } from '@/modules/autores/pages/AutorDetallePage'
import { AutoresPage } from '@/modules/autores/pages/AutoresPage'
import { ConstanciasPage } from '@/modules/constancias/pages/ConstanciasPage'
import { CorreosPage } from '@/modules/correos/pages/CorreosPage'
import { InicioGeneralPage } from '@/modules/inicio/pages/InicioGeneralPage'
import { TableroPage } from '@/modules/inicio/pages/TableroPage'
import { InformesPage } from '@/modules/informes/pages/InformesPage'
import { PorCorregirPage } from '@/modules/migracion/pages/PorCorregirPage'
import { ParDetallePage } from '@/modules/pares/pages/ParDetallePage'
import { ParesBloqueadosPage } from '@/modules/pares/pages/ParesBloqueadosPage'
import { ParesPage } from '@/modules/pares/pages/ParesPage'

export const rutasPrivadas: RouteObject[] = [
  {
    element: <RutaPrivada />,
    children: [
      {
        // Módulos de las dos revistas: las únicas pantallas que pueden mostrar ambas revistas a la vez.
        element: <AppLayout />,
        children: [
          { path: '/inicio', element: <InicioGeneralPage /> },
          { path: '/informes', element: <InformesPage /> },
          // Autores y pares son un solo directorio compartido por las dos revistas.
          { path: '/autores', element: <AutoresPage /> },
          { path: '/autores/:id', element: <AutorDetallePage /> },
          { path: '/pares', element: <ParesPage /> },
          { path: '/pares/bloqueados', element: <ParesBloqueadosPage /> },
          { path: '/pares/:id', element: <ParDetallePage /> },
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
                  { path: '/administracion/configuracion', element: <ConfiguracionPage /> },
                ],
              },
            ],
          },
        ],
      },
      {
        // Módulos de cada revista: reep | ire.
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
                children: [{ path: 'articulos/nuevo', element: <ArticuloNuevoPage /> }],
              },
              {
                path: 'articulos/:id',
                element: <FichaArticuloLayout />,
                children: [
                  { index: true, element: <ArticuloResumenPage /> },
                  { path: 'comite', element: <ArticuloComitePage /> },
                  { path: 'autores', element: <ArticuloAutoresPage /> },
                  { path: 'pares', element: <ArticuloParesPage /> },
                  { path: 'historial', element: <ArticuloHistorialPage /> },
                  {
                    element: <RutaPorPermiso accion="reabrir-articulo" encabezado="h2" />,
                    children: [{ path: 'reabrir', element: <ArticuloReabrirPage /> }],
                  },
                ],
              },
              { path: 'constancias', element: <ConstanciasPage /> },
              { path: 'correos', element: <CorreosPage /> },
              { path: 'por-corregir', element: <PorCorregirPage /> },
            ],
          },
        ],
      },
    ],
  },
]
