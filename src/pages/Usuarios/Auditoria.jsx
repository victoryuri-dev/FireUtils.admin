import { Fragment, useEffect, useState } from 'react'
import { listarAuditoria } from '../../lib/api.js'
import { traduzirErroBanco } from '../../lib/licencas.js'
import { dataHoraBr } from '../../lib/formato.js'

const POR_PAGINA = 50

export default function Auditoria() {
  const [pagina, setPagina] = useState(0)
  const [dados, setDados] = useState({ linhas: [], total: 0 })
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aberta, setAberta] = useState(null)

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    listarAuditoria({ pagina, porPagina: POR_PAGINA })
      .then((d) => ativo && setDados(d))
      .catch((e) => ativo && setErro(traduzirErroBanco(e)))
      .finally(() => ativo && setCarregando(false))
    return () => { ativo = false }
  }, [pagina])

  const totalPaginas = Math.max(1, Math.ceil(dados.total / POR_PAGINA))

  return (
    <>
      {erro && <p className="aviso erro">{erro}</p>}
      <div className="tabela-wrap">
        <table className="tabela">
          <thead><tr><th>Quando</th><th>Admin</th><th>Ação</th><th>Alvo</th><th /></tr></thead>
          <tbody>
            {dados.linhas.map((l) => (
              <Fragment key={l.id}>
                <tr>
                  <td>{dataHoraBr(l.criado_em)}</td>
                  <td>{l.admin_email ?? '—'}</td>
                  <td><code>{l.acao}</code></td>
                  <td className="muted">{l.alvo_tipo} {l.alvo_id ? `· ${l.alvo_id.slice(0, 8)}` : ''}</td>
                  <td><button type="button" className="btn btn-sec" onClick={() => setAberta(aberta === l.id ? null : l.id)}>{aberta === l.id ? 'Ocultar' : 'Detalhes'}</button></td>
                </tr>
                {aberta === l.id && (
                  <tr>
                    <td colSpan="5"><pre className="json">{JSON.stringify({ antes: l.antes, depois: l.depois }, null, 2)}</pre></td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!carregando && dados.linhas.length === 0 && <tr><td colSpan="5" className="muted">Sem registros.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="paginacao">
        <button type="button" className="btn btn-sec" disabled={pagina === 0 || carregando} onClick={() => setPagina((p) => p - 1)}>Anterior</button>
        <span>{carregando ? 'Carregando…' : `Página ${pagina + 1} de ${totalPaginas} · ${dados.total} registros`}</span>
        <button type="button" className="btn btn-sec" disabled={pagina + 1 >= totalPaginas || carregando} onClick={() => setPagina((p) => p + 1)}>Próxima</button>
      </div>
    </>
  )
}
