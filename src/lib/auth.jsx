import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, configurado } from './supabase.js'
import { verificarAdmin } from './admin.js'

const AuthContext = createContext(null)

// estado: 'carregando' | 'anonimo' | 'sem-permissao' | 'admin'
export function AuthProvider({ children }) {
  const [estado, setEstado] = useState(configurado ? 'carregando' : 'anonimo')
  const [usuario, setUsuario] = useState(null)

  const avaliar = useCallback(async (session) => {
    if (!session) {
      setUsuario(null)
      // Mantém o aviso de "sem permissão" depois do signOut automático.
      setEstado((atual) => (atual === 'sem-permissao' ? atual : 'anonimo'))
      return
    }
    setUsuario(session.user)
    const { admin } = await verificarAdmin()
    if (admin) {
      setEstado('admin')
    } else {
      setEstado('sem-permissao')
      await supabase.auth.signOut()
    }
  }, [])

  useEffect(() => {
    if (!configurado) return undefined
    supabase.auth.getSession().then(({ data }) => avaliar(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((evento, session) => {
      // Evita reavaliar (e deslogar) em loop depois do signOut por falta de permissão.
      if (evento === 'SIGNED_IN' || evento === 'SIGNED_OUT') {
        setTimeout(() => avaliar(session), 0)
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [avaliar])

  const entrar = (email, senha) => supabase.auth.signInWithPassword({ email, password: senha })
  const sair = () => supabase.auth.signOut()

  return (
    <AuthContext.Provider value={{ estado, usuario, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
