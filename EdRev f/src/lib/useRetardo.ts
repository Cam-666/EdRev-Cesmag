import { useEffect, useState } from 'react'

/** Devuelve `valor` solo después de que dejó de cambiar durante `ms` (para no hacer una petición por cada tecla). */
export function useRetardo<T>(valor: T, ms = 300): T {
  const [retardado, setRetardado] = useState(valor)
  useEffect(() => {
    const id = window.setTimeout(() => setRetardado(valor), ms)
    return () => window.clearTimeout(id)
  }, [valor, ms])
  return retardado
}
