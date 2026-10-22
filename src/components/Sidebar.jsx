import { NavLink } from 'react-router-dom'
import Logo from './Logo.jsx'
import { useAuth } from '../lib/auth.jsx'

const ITENS = [
  { para: '/usuarios', rotulo: 'Usuários' },
  { para: '/versoes', rotulo: 'Versões' },
  { para: '/biblioteca', rotulo: 'Biblioteca' },
]

export default function Sidebar() {
  const { usuario, sair } = useAuth()
  return (
    <aside className="sidebar">
      <div className="sidebar-marca">
        <span className="marca-logo"><Logo /></span>
        <div>
          <strong>Fire Utils</strong>
          <small>Admin</small>
        </div>
      </div>
      <nav className="sidebar-nav" aria-label="Seções">
        {ITENS.map((i) => (
          <NavLink key={i.para} to={i.para} className={({ isActive }) => (isActive ? 'nav-item ativo' : 'nav-item')}>
            {i.rotulo}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-rodape">
        <span className="sidebar-email" title={usuario?.email}>{usuario?.email}</span>
        <button type="button" className="btn btn-sec" onClick={sair}>Sair</button>
      </div>
    </aside>
  )
}
