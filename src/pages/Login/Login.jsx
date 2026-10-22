import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import Logo from '../../components/Logo.jsx'
import { useAuth } from '../../lib/auth.jsx'
import { configurado } from '../../lib/supabase.js'

export default function Login() {
  const { estado, entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  if (estado === 'admin') return <Navigate to="/usuarios" replace />

  async function enviar(e) {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    const { error } = await entrar(email.trim(), senha)
    setEnviando(false)
    if (error) setErro('E-mail ou senha inválidos.')
  }

  return (
    <div className="tela-central">
      <form className="login-card" onSubmit={enviar}>
        <span className="marca-logo grande"><Logo altura={44} /></span>
        <h1>Fire Utils Admin</h1>
        {!configurado && (
          <p className="aviso">Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).</p>
        )}
        {estado === 'sem-permissao' && (
          <p className="aviso erro">Sem permissão. Esta conta não é administradora.</p>
        )}
        <label>
          E-mail
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha
          <input type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </label>
        {erro && <p className="aviso erro">{erro}</p>}
        <button type="submit" className="btn btn-primario" disabled={enviando || !configurado}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
