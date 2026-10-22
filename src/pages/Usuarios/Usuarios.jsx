import { NavLink, Route, Routes } from 'react-router-dom'
import Lista from './Lista.jsx'
import Detalhe from './Detalhe.jsx'
import Auditoria from './Auditoria.jsx'

export default function Usuarios() {
  return (
    <section>
      <h1 className="pagina-titulo">Usuários</h1>
      <div className="abas">
        <NavLink to="/usuarios" end className={({ isActive }) => (isActive ? 'aba ativa' : 'aba')}>Usuários e licenças</NavLink>
        <NavLink to="/usuarios/auditoria" className={({ isActive }) => (isActive ? 'aba ativa' : 'aba')}>Auditoria</NavLink>
      </div>
      <Routes>
        <Route index element={<Lista />} />
        <Route path="auditoria" element={<Auditoria />} />
        <Route path=":id" element={<Detalhe />} />
      </Routes>
    </section>
  )
}
