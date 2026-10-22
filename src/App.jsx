import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Protegida from './components/Protegida.jsx'
import Login from './pages/Login/Login.jsx'
import Usuarios from './pages/Usuarios/Usuarios.jsx'
import Versoes from './pages/Versoes/Versoes.jsx'
import Biblioteca from './pages/Biblioteca/Biblioteca.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protegida />}>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/usuarios" replace />} />
          <Route path="/usuarios/*" element={<Usuarios />} />
          <Route path="/versoes/*" element={<Versoes />} />
          <Route path="/biblioteca/*" element={<Biblioteca />} />
          <Route path="*" element={<Navigate to="/usuarios" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
