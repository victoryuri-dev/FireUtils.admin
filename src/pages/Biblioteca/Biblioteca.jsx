import { NavLink, Route, Routes } from 'react-router-dom'
import { BibliotecaProvider, useBiblioteca } from './contexto.jsx'
import Catalogo from './Catalogo.jsx'
import Arquivos from './Arquivos.jsx'
import Publicacao from './Publicacao.jsx'

function Abas() {
  const { verificacao } = useBiblioteca()
  const r = verificacao?.resumo
  const marca = (n, cor) => (n ? <span className={`contagem contagem-${cor}`}>{n}</span> : null)
  const aba = ({ isActive }) => (isActive ? 'aba ativa' : 'aba')
  return (
    <div className="abas">
      <NavLink to="/biblioteca" end className={aba}>Catálogo</NavLink>
      <NavLink to="/biblioteca/arquivos" className={aba}>Arquivos {marca(r?.orfaos, 'aviso')}</NavLink>
      <NavLink to="/biblioteca/publicacao" className={aba}>Publicação {marca(r?.fantasmas, 'erro')}</NavLink>
    </div>
  )
}

export default function Biblioteca() {
  return (
    <section>
      <h1 className="pagina-titulo">Biblioteca</h1>
      <BibliotecaProvider>
        <Abas />
        <Routes>
          <Route index element={<Catalogo />} />
          <Route path="arquivos" element={<Arquivos />} />
          <Route path="publicacao" element={<Publicacao />} />
        </Routes>
      </BibliotecaProvider>
    </section>
  )
}
