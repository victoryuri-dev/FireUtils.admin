import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  arquivosAusentes, arquivosDaRelease, buscarRelease, definirPublicada, excluirRascunho, salvarNotas,
} from '../../lib/apiVersoes.js'
import { traduzirErroBanco } from '../../lib/licencas.js'
import { formatarTamanho, normalizarNotas } from '../../lib/versoes.js'
import { dataHoraBr } from '../../lib/formato.js'
import ConfirmaDigitando from '../../components/ConfirmaDigitando.jsx'
import EditorNotas from './EditorNotas.jsx'
import PreviaNotas from './PreviaNotas.jsx'

export default function Detalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const [r, setR] = useState(undefined) // undefined = carregando, null = não existe
  const [titulo, setTitulo] = useState('')
  const [itens, setItens] = useState([])
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirmar, setConfirmar] = useState(null) // 'despublicar' | 'excluir'

  const carregar = useCallback(async () => {
    try {
      const dados = await buscarRelease(id)
      setR(dados)
      if (dados) {
        setTitulo(dados.titulo)
        setItens(dados.notas.length ? dados.notas : [{ tipo: 'novo', texto: '' }])
      }
    } catch (e) {
      setErro(traduzirErroBanco(e))
      setR(null)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function acao(fn, mensagem) {
    setErro('')
    setAviso('')
    try {
      // fn devolve false quando o admin desistiu (nada mudou, sem mensagem).
      if ((await fn()) === false) return
      setAviso(mensagem)
      await carregar()
    } catch (e) {
      setErro(e.message ?? traduzirErroBanco(e))
    }
  }

  const salvar = () => {
    const { notas, erros } = normalizarNotas(itens)
    if (erros.length) return setErro(erros.join(' '))
    return acao(() => salvarNotas(id, { titulo: titulo.trim(), notas }), 'Notas salvas.')
  }

  const publicar = () => acao(async () => {
    const ausentes = await arquivosAusentes(r)
    if (ausentes.length) throw new Error(`Faltam no bucket: ${ausentes.join(', ')}. Não é possível publicar.`)
    if (!window.confirm(`Publicar a versão ${r.versao}? Os clientes passam a vê-la.`)) return false
    await definirPublicada(id, true)
  }, 'Versão publicada.')

  if (r === undefined) return <p className="aviso">Carregando…</p>
  if (r === null) return <p className="aviso erro">{erro || 'Versão não encontrada.'} <Link to="/versoes">Voltar</Link></p>

  return (
    <>
      <p><Link to="/versoes">← Versões</Link></p>
      <h2 className="subtitulo">
        {r.tipo === 'instalador' ? 'Instalador' : 'Pacote'} {r.versao}
        {r.publicada ? <span className="chip chip-ativa">Publicada</span> : <span className="chip chip-suspensa">Rascunho</span>}
      </h2>
      {erro && <p className="aviso erro">{erro}</p>}
      {aviso && <p className="aviso ok">{aviso}</p>}

      <div className="painel">
        <h3>Arquivo</h3>
        <dl className="dados">
          <dt>Nome</dt><dd><code>{r.arquivo}</code></dd>
          {r.base_minima && (<><dt>Base mínima</dt><dd>{r.base_minima}</dd></>)}
          <dt>Tamanho</dt><dd>{formatarTamanho(r.tamanho_bytes)}</dd>
          <dt>SHA-256</dt><dd><code className="quebra">{r.sha256 ?? '—'}</code></dd>
          <dt>Arquivos no bucket</dt><dd>{arquivosDaRelease(r).join(' · ')}</dd>
          <dt>Criada em</dt><dd>{dataHoraBr(r.criada_em)}</dd>
          <dt>Publicada em</dt><dd>{dataHoraBr(r.publicada_em)}</dd>
        </dl>
      </div>

      <div className="painel">
        <h3>Notas</h3>
        <label className="coluna-cheia">Título
          <input value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} />
        </label>
        <div className="duas-colunas">
          <EditorNotas itens={itens} onChange={setItens} />
          <PreviaNotas versao={r.versao} titulo={titulo} itens={itens} />
        </div>
        <button type="button" className="btn btn-primario" onClick={salvar}>Salvar notas</button>
      </div>

      <div className="painel acoes-conta">
        {r.publicada
          ? <button type="button" className="btn btn-sec" onClick={() => setConfirmar('despublicar')}>Despublicar</button>
          : <button type="button" className="btn btn-primario" onClick={publicar}>Publicar</button>}
        {!r.publicada && <button type="button" className="btn btn-perigo" onClick={() => setConfirmar('excluir')}>Excluir rascunho</button>}
      </div>

      {confirmar && (
        <ConfirmaDigitando
          titulo={confirmar === 'despublicar' ? 'Despublicar versão' : 'Excluir rascunho'}
          nome={r.arquivo}
          rotuloAcao={confirmar === 'despublicar' ? 'Despublicar' : 'Excluir'}
          onCancelar={() => setConfirmar(null)}
          onConfirmar={async () => {
            const qual = confirmar
            setConfirmar(null)
            if (qual === 'despublicar') return acao(() => definirPublicada(id, false), 'Versão despublicada.')
            try {
              await excluirRascunho(r)
              navegar('/versoes')
            } catch (e) {
              setErro(traduzirErroBanco(e))
            }
          }}
        />
      )}
    </>
  )
}
