import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { acaoUsuario, listarUsuarios } from '../../lib/api.js'
import { hojeNoBrasil, traduzirErroBanco } from '../../lib/licencas.js'
import { dataHoraBr } from '../../lib/formato.js'
import ChipLicenca from '../../components/Chip.jsx'
import Resumo from './Resumo.jsx'

const POR_PAGINA = 25
const FILTROS = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'sem_licenca', rotulo: 'Sem licença' },
  { valor: 'vencendo', rotulo: 'Vencendo em 15 dias' },
  { valor: 'expirada', rotulo: 'Expirada' },
]

export default function Lista() {
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [pagina, setPagina] = useState(0)
  const [dados, setDados] = useState({ linhas: [], total: 0 })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [convite, setConvite] = useState(null) // null | { email, enviando, msg }
  const hoje = hojeNoBrasil()

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro('')
    try {
      setDados(await listarUsuarios({ busca: buscaAplicada, filtro, pagina, porPagina: POR_PAGINA }))
    } catch (e) {
      setErro(traduzirErroBanco(e))
    } finally {
      setCarregando(false)
    }
  }, [buscaAplicada, filtro, pagina])

  useEffect(() => { carregar() }, [carregar])

  function buscar(e) {
    e.preventDefault()
    setPagina(0)
    setBuscaAplicada(busca.trim())
  }

  async function convidar(e) {
    e.preventDefault()
    setConvite((c) => ({ ...c, enviando: true, msg: '' }))
    try {
      await acaoUsuario({ acao: 'convidar', email: convite.email })
      setConvite(null)
      carregar()
    } catch (ex) {
      setConvite((c) => ({ ...c, enviando: false, msg: ex.message }))
    }
  }

  const totalPaginas = Math.max(1, Math.ceil(dados.total / POR_PAGINA))

  return (
    <>
      <Resumo />

      <div className="barra">
        <form className="busca" onSubmit={buscar}>
          <input placeholder="Buscar por e-mail ou nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <button type="submit" className="btn btn-sec">Buscar</button>
        </form>
        <select value={filtro} onChange={(e) => { setPagina(0); setFiltro(e.target.value) }} aria-label="Filtro">
          {FILTROS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
        </select>
        <button type="button" className="btn btn-primario" onClick={() => setConvite({ email: '', enviando: false, msg: '' })}>
          Convidar usuário
        </button>
      </div>

      {erro && <p className="aviso erro">{erro}</p>}

      <div className="tabela-wrap">
        <table className="tabela">
          <thead>
            <tr><th>E-mail</th><th>Nome</th><th>Criado em</th><th>Último login</th><th>Situação</th><th>Licenças</th></tr>
          </thead>
          <tbody>
            {dados.linhas.map((u) => (
              <tr key={u.user_id}>
                <td><Link to={`/usuarios/${u.user_id}`}>{u.email}</Link></td>
                <td>{u.nome || '—'}</td>
                <td>{dataHoraBr(u.criado_em)}</td>
                <td>{dataHoraBr(u.ultimo_login)}</td>
                <td>{u.banido ? <span className="chip chip-cancelada">Banido</span> : 'Ativo'}</td>
                <td className="chips">
                  {u.licencas.length === 0
                    ? <span className="muted">Sem licença</span>
                    : u.licencas.map((l) => <ChipLicenca key={l.id} licenca={l} hoje={hoje} />)}
                </td>
              </tr>
            ))}
            {!carregando && dados.linhas.length === 0 && (
              <tr><td colSpan="6" className="muted">Nenhum usuário encontrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="paginacao">
        <button type="button" className="btn btn-sec" disabled={pagina === 0 || carregando} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span>{carregando ? 'Carregando…' : `Página ${pagina + 1} de ${totalPaginas} · ${dados.total} usuários`}</span>
        <button type="button" className="btn btn-sec" disabled={pagina + 1 >= totalPaginas || carregando} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
      </div>

      {convite && (
        <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Convidar usuário">
          <form className="modal" onSubmit={convidar}>
            <h2>Convidar usuário</h2>
            <p>O convite chega por e-mail, com link para definir a senha.</p>
            <input type="email" autoFocus required placeholder="e-mail" value={convite.email} onChange={(e) => setConvite({ ...convite, email: e.target.value })} />
            {convite.msg && <p className="aviso erro">{convite.msg}</p>}
            <div className="modal-acoes">
              <button type="button" className="btn btn-sec" onClick={() => setConvite(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primario" disabled={convite.enviando}>{convite.enviando ? 'Enviando…' : 'Enviar convite'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
