/*
 * App — root. Phase 1 only mounts the design-system showcase; the full router arrives in phase 2.
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MuestraDiseno } from '@/app/MuestraDiseno'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/design-system" element={<MuestraDiseno />} />
        <Route path="*" element={<Navigate to="/design-system" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
