import { Route, Routes } from 'react-router-dom'
import Lista from './Lista.jsx'
import NovaVersao from './NovaVersao.jsx'
import Detalhe from './Detalhe.jsx'

export default function Versoes() {
  return (
    <section>
      <h1 className="pagina-titulo">Versões</h1>
      <Routes>
        <Route index element={<Lista />} />
        <Route path="nova" element={<NovaVersao />} />
        <Route path=":id" element={<Detalhe />} />
      </Routes>
    </section>
  )
}
