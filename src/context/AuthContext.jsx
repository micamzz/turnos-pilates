import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../config/supabase'


const AuthContext = createContext(null)

//  Provider: verifica la sesión UNA sola vez y la comparte
export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(undefined) 

  useEffect(() => {
   
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session ?? null)
    })

  
    const { data: listener } = supabase.auth.onAuthStateChange((_evento, session) => {
      setSesion(session ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ sesion, verificando: sesion === undefined }}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth() {
  return useContext(AuthContext)
}
