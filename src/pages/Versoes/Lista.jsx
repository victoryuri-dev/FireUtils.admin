import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listarReleases } from '../../lib/apiVersoes.js'
import { traduzirErroBanco } from '../../lib/licencas.js'
import { compararVersoes, formatarTamanho } from '../../lib/versoes.js'
import { dataBr } from '../../lib/formato.js'

export default function Lista() {
  const [releases, setReleases] = useState(null)
  const [tipo, setTipo] = useState('todos')
  const [erro, setErro] = useState('')

  useEffect(() => {
    listarReleases().then(setReleases).catch((e) => setErro(traduzirErroBanco(e)))
  }, [])

  const linhas = (releases ?? [])
    .filter((r) => tipo === 'todos' || r.tipo === tipo)
    .sort((a, b) => compararVersoes(b.versao, a.versao) || a.tipo.localeCompare(b.tipo))

  return (
    <>
      <div className="barra">
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo">
          <option value="todos">Todos os tipos</option>
          <option value="instalador">Instaladores</option>
          <option value="pacote">Pacotes</option>
        </select>
        <span className="espaco" />
        <Link to="/versoes/nova" className="btn btn-primario">Nova versão</Link>
      </div>
      {erro && <p className="aviso erro">{erro}</p>}
      <div className="tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Versão</th><th>Tipo</th><th>Base</th><th>Data</th><th>Tamanho</th><th>Situação</th></tr></thead>
          <tbody>
            {linhas.map((r) => (
              <tr key={r.id}>
                <td><Link to={`/versoes/${r.id}`}>{r.versao}</Link>{r.titulo && <span className="muted"> · {r.titulo}</span>}</td>
                <td>{r.tipo === 'instalador' ? 'Instalador' : 'Pacote'}</td>
                <td>{r.base_minima ?? '—'}</td>
                <td>{dataBr(r.publicada_em ?? r.criada_em)}</td>
                <td>{formatarTamanho(r.tamanho_bytes)}</td>
                <td>{r.publicada ? <span className="chip chip-ativa">Publicada</span> : <span className="chip chip-suspensa">Rascunho</span>}</td>
              </tr>
            ))}
            {releases && linhas.length === 0 && <tr><td colSpan="6" className="muted">Nenhuma versão.</td></tr>}
            {!releases && !erro && <tr><td colSpan="6" className="muted">Carregando…</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  )
}
