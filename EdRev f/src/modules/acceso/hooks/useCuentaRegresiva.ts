import { useCallback, useEffect, useState } from 'react'

/** Counts down once per second from `inicial`; `reiniciar` restarts it. */
export function useCuentaRegresiva(inicial: number) {
  const [segundos, setSegundos] = useState(Math.max(0, Math.ceil(inicial)))
  const activa = segundos > 0

  useEffect(() => {
    if (!activa) return
    const id = window.setInterval(() => setSegundos((s) => Math.max(0, s - 1)), 1000)
    return () => window.clearInterval(id)
  }, [activa])

  const reiniciar = useCallback((nuevo: number) => setSegundos(Math.max(0, Math.ceil(nuevo))), [])
  return { segundos, reiniciar }
}
