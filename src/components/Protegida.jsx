import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth.jsx'

export default function Protegida() {
  const { estado } = useAuth()
  const local = useLocation()

  if (estado === 'carregando') return <div className="tela-central">Carregando…</div>
  if (estado !== 'admin') return <Navigate to="/login" replace state={{ de: local }} />
  return <Outlet />
}
