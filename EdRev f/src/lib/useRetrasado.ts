/*
 * useRetrasado — el valor después de que dejó de cambiar durante `ms`; evita una petición en cada tecla.
 */
import { useEffect, useState } from 'react'

export function useRetrasado<T>(valor: T, ms = 500): T {
  const [retrasado, setRetrasado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return retrasado
}
