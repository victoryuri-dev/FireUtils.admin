import { useMemo, useState } from 'react'
import { removerOrfaos } from '../../lib/apiCatalogo.js'
import { BUCKET_ASSETS, ROTULO_SITUACAO } from '../../lib/catalogo.js'
import { formatarTamanho } from '../../lib/versoes.js'
import ConfirmaDigitando from '../../components/ConfirmaDigitando.jsx'
import { useBiblioteca } from './contexto.jsx'
import Miniatura from './Miniatura.jsx'

const ROTULO_USO = { familia: '.rfa', thumbnail: 'miniatura', icone: 'ícone' }
const chaveDe = (a) => `${a.bucket}/${a.key}`

export default function Arquivos() {
  const b = useBiblioteca()
  const [situacao, setSituacao] = useState('todos')
  const [busca, setBusca] = useState('')
  const [marcados, setMarcados] = useState(new Set())
  const [confirmando, setConfirmando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const arquivos = b.verificacao?.arquivos ?? []
  const fantasmas = (b.verificacao?.problemas ?? []).filter((p) => p.bloqueia)
  const linhas = useMemo(() => arquivos
    .filter((a) => situacao === 'todos' || a.situacao === situacao)
    .filter((a) => !busca.trim() || a.key.toLowerCase().includes(busca.trim().toLowerCase()) || a.usos.some((u) => u.dono.toLowerCase().includes(busca.trim().toLowerCase())))
    .sort((x, y) => chaveDe(x).localeCompare(chaveDe(y))), [arquivos, situacao, busca])
  const orfaosVisiveis = linhas.filter((a) => a.situacao === 'orfao')

  const alternar = (a) => setMarcados((s) => { const n = new Set(s); n.has(chaveDe(a)) ? n.delete(chaveDe(a)) : n.add(chaveDe(a)); return n })
  const marcarTodosOrfaos = () => setMarcados(new Set(orfaosVisiveis.map(chaveDe)))

  async function remover() {
    setConfirmando(false)
    setErro('')
    setMensagem('')
    const itens = arquivos.filter((a) => marcados.has(chaveDe(a))).map((a) => ({ bucket: a.bucket, key: a.key }))
    try {
      const r = await removerOrfaos(itens)
      setMensagem(`${r.removidos} arquivo(s) removido(s)${r.ignorados.length ? `, ${r.ignorados.length} preservado(s) por estarem em uso` : ''}.`)
      setMarcados(new Set())
      await b.reverificar()
    } catch (e) { setErro(e.message) }
  }

  if (b.verificando && !b.verificacao) return <p className="aviso">Conferindo os buckets…</p>
  if (!b.verificacao) return <p className="aviso erro">{b.erroVerificacao || 'Sem dados da verificação.'}</p>

  return (
    <>
      {erro && <p className="aviso erro">{erro}</p>}
      {mensagem && <p className="aviso ok">{mensagem}</p>}

      {fantasmas.length > 0 && (
        <div className="painel painel-erro">
          <h3>Itens fantasmas ({fantasmas.length})</h3>
          <p className="aviso">O catálogo cita estes arquivos, mas eles não existem no bucket. Reenvie o arquivo na aba Catálogo (Editar) ou exclua o item.</p>
          <ul className="lista-problemas">{fantasmas.map((p, i) => <li key={i}>{p.mensagem}</li>)}</ul>
        </div>
      )}

      <div className="barra">
        <input className="busca-input" placeholder="Buscar por arquivo ou item" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select value={situacao} onChange={(e) => setSituacao(e.target.value)} aria-label="Situação">
          <option value="todos">Todos ({arquivos.length})</option>
          {Object.entries(ROTULO_SITUACAO).map(([v, r]) => (
            <option key={v} value={v}>{r} ({arquivos.filter((a) => a.situacao === v).length})</option>
          ))}
        </select>
        <button type="button" className="btn btn-sec" onClick={b.reverificar} disabled={b.verificando}>{b.verificando ? 'Conferindo…' : 'Conferir de novo'}</button>
        <span className="espaco" />
        <button type="button" className="btn btn-sec" onClick={marcarTodosOrfaos} disabled={orfaosVisiveis.length === 0}>Marcar órfãos ({orfaosVisiveis.length})</button>
        <button type="button" className="btn btn-perigo" onClick={() => setConfirmando(true)} disabled={marcados.size === 0}>Remover marcados ({marcados.size})</button>
      </div>

      <div className="tabela-wrap">
        <table className="tabela">
          <thead><tr><th /><th /><th>Arquivo</th><th>Bucket</th><th>Tamanho</th><th>Situação</th><th>Usado por</th></tr></thead>
          <tbody>
            {linhas.map((a) => (
              <tr key={chaveDe(a)}>
                <td>{a.situacao === 'orfao' && <input type="checkbox" checked={marcados.has(chaveDe(a))} onChange={() => alternar(a)} aria-label={`Marcar ${a.key}`} />}</td>
                <td>{a.bucket === BUCKET_ASSETS && <Miniatura chave={a.key} nome={a.key} />}</td>
                <td><code className="quebra">{a.key}</code></td>
                <td className="muted">{a.bucket}</td>
                <td>{formatarTamanho(a.size)}</td>
                <td><span className={`selo selo-${a.situacao}`}>{ROTULO_SITUACAO[a.situacao]}</span></td>
                <td>{a.usos.map((u) => `${u.dono} (${ROTULO_USO[u.uso]})`).join(', ') || <span className="muted">—</span>}</td>
              </tr>
            ))}
            {linhas.length === 0 && <tr><td colSpan="7" className="muted">Nenhum arquivo neste filtro.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="aviso">"Só no publicado": o catálogo atual não usa, mas o catalog.json publicado ainda cita; some do bucket depois que você publicar.</p>

      {confirmando && (
        <ConfirmaDigitando
          titulo="Remover arquivos órfãos" nome={`remover ${marcados.size}`} rotuloAcao="Remover"
          onCancelar={() => setConfirmando(false)} onConfirmar={remover}
        />
      )}
    </>
  )
}
