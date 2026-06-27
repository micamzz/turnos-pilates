import { useState, useEffect } from 'react'

// Devuelve true si el ancho de pantalla es de celular (hasta 700px)
export function useEsMobile() {
  const [esMobile, setEsMobile] = useState(window.innerWidth <= 700)

  useEffect(() => {
    function manejarResize() {
      setEsMobile(window.innerWidth <= 700)
    }
    window.addEventListener('resize', manejarResize)
    return () => window.removeEventListener('resize', manejarResize)
  }, [])

  return esMobile
}