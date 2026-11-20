/* useCierrePorInactividad — cierra la sesión después de `minutos` sin actividad del usuario. */
import { useEffect, useRef } from 'react'

const EVENTOS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const

export function useCierrePorInactividad(minutos: number, alExpirar: () => void): void {
  const callback = useRef(alExpirar)
  useEffect(() => {
    callback.current = alExpirar
  })

  useEffect(() => {
    const ms = minutos * 60_000
    let temporizador = window.setTimeout(() => callback.current(), ms)
    const reiniciar = () => {
      window.clearTimeout(temporizador)
      temporizador = window.setTimeout(() => callback.current(), ms)
    }
    EVENTOS.forEach((e) => window.addEventListener(e, reiniciar, { passive: true }))
    return () => {
      window.clearTimeout(temporizador)
      EVENTOS.forEach((e) => window.removeEventListener(e, reiniciar))
    }
  }, [minutos])
}
