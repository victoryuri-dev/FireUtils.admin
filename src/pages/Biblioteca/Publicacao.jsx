import { useState } from 'react'
import { importarCatalogo, publicarCatalogo, removerOrfaos } from '../../lib/apiCatalogo.js'
import { dataHoraBr } from '../../lib/formato.js'
import { useBiblioteca } from './contexto.jsx'

function Lista({ titulo, itens, cor }) {
  if (!itens?.length) return null
  return (
    <div className="diff-bloco">
      <strong className={`diff-${cor}`}>{titulo} ({itens.length})</strong>
      <span className="muted">{itens.slice(0, 12).join(', ')}{itens.length > 12 ? ` e mais ${itens.length - 12}` : ''}</span>
    </div>
  )
}

export default function Publicacao() {
  const b = useBiblioteca()
  const [trabalhando, setTrabalhando] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const v = b.verificacao
  if (b.verificando && !v) return <p className="aviso">Conferindo o catálogo e os buckets…</p>
  if (!v) return <p className="aviso erro">{b.erroVerificacao || 'Sem dados da verificação.'} Confira se a Edge Function admin-catalogo foi publicada.</p>

  const { resumo, publicacao, problemas, arquivos } = v
  const bloqueios = problemas.filter((p) => p.bloqueia)
  const avisos = problemas.filter((p) => !p.bloqueia)
  const orfaos = arquivos.filter((a) => a.situacao === 'orfao')
  const dif = publicacao.diferencas
  const rascunhoVazio = resumo.categorias === 0 && resumo.familias === 0
  const podePublicar = bloqueios.length === 0 && !publicacao.sincronizado && resumo.familias > 0

  async function executar(nome, fn, sucesso) {
    setTrabalhando(nome)
    setErro('')
    setMensagem('')
    try {
      const r = await fn()
      setMensagem(sucesso(r))
      await b.atualizarTudo()
    } catch (e) {
      setErro(e.message)
    } finally {
      setTrabalhando('')
    }
  }

  const importar = () => {
    const sobrescrever = !rascunhoVazio
    if (sobrescrever && !window.confirm('O catálogo já tem dados. Importar sobrescreve itens com o mesmo identificador pelos do catálogo publicado. Continuar?')) return
    executar('importar', () => importarCatalogo(sobrescrever), (r) => `Importado: ${r.categorias} categorias e ${r.familias} famílias.`)
  }

  const publicar = () => {
    if (!window.confirm('Publicar o catálogo? A dockpane passa a mostrar estas famílias.')) return
    executar('publicar', publicarCatalogo, (r) => `Catálogo publicado: ${r.categorias} categorias e ${r.familias} famílias.`)
  }

  const limpar = () => {
    if (!window.confirm(`Remover ${orfaos.length} arquivo(s) órfão(s) dos buckets? Não dá para desfazer.`)) return
    executar('limpar', async () => {
      let removidos = 0
      for (let i = 0; i < orfaos.length; i += 200) {
        removidos += (await removerOrfaos(orfaos.slice(i, i + 200).map((a) => ({ bucket: a.bucket, key: a.key })))).removidos
      }
      return { removidos }
    }, (r) => `${r.removidos} arquivo(s) removido(s).`)
  }

  const estado = !publicacao.existe ? ['Nunca publicado', 'aviso'] : publicacao.sincronizado ? ['Publicado e atualizado', 'ok'] : ['Há alterações não publicadas', 'aviso']

  return (
    <>
      {erro && <p className="aviso erro">{erro}</p>}
      {mensagem && <p className="aviso ok">{mensagem}</p>}

      <div className="cards">
        <div className="card"><small>Categorias</small><strong>{resumo.categorias}</strong></div>
        <div className="card"><small>Famílias</small><strong>{resumo.familias}</strong></div>
        <div className={`card ${resumo.fantasmas ? 'card-erro' : ''}`}><small>Itens fantasmas</small><strong>{resumo.fantasmas}</strong></div>
        <div className="card"><small>Avisos</small><strong>{resumo.avisos}</strong></div>
        <div className="card"><small>Arquivos órfãos</small><strong>{resumo.orfaos}</strong></div>
      </div>

      <div className="painel">
        <div className="painel-topo">
          <h3>Situação: <span className={`aviso ${estado[1] === 'ok' ? 'ok' : ''}`}>{estado[0]}</span></h3>
          <span className="muted">{publicacao.publicado_em ? `Última publicação: ${dataHoraBr(publicacao.publicado_em)}` : ''}</span>
        </div>
        {!publicacao.sincronizado && publicacao.existe && (
          <>
            <Lista titulo="Famílias novas" itens={dif.familias.adicionadas} cor="novo" />
            <Lista titulo="Famílias alteradas" itens={dif.familias.alteradas} cor="alterado" />
            <Lista titulo="Famílias removidas" itens={dif.familias.removidas} cor="removido" />
            <Lista titulo="Categorias novas" itens={dif.categorias.adicionadas} cor="novo" />
            <Lista titulo="Categorias alteradas" itens={dif.categorias.alteradas} cor="alterado" />
            <Lista titulo="Categorias removidas" itens={dif.categorias.removidas} cor="removido" />
            {dif.todas_icone_mudou && <div className="diff-bloco"><strong className="diff-alterado">Ícone de "Todas" mudou</strong></div>}
          </>
        )}
        <div className="acoes-conta">
          <button type="button" className="btn btn-primario" disabled={!podePublicar || Boolean(trabalhando)} onClick={publicar}
            title={bloqueios.length ? 'Corrija os itens fantasmas antes' : publicacao.sincronizado ? 'Nada a publicar' : ''}>
            {trabalhando === 'publicar' ? 'Publicando…' : 'Publicar catálogo'}
          </button>
          <button type="button" className="btn btn-sec" onClick={b.reverificar} disabled={b.verificando || Boolean(trabalhando)}>{b.verificando ? 'Conferindo…' : 'Conferir de novo'}</button>
          {publicacao.existe && (
            <button type="button" className="btn btn-sec" onClick={importar} disabled={Boolean(trabalhando)}>
              {trabalhando === 'importar' ? 'Importando…' : 'Importar catálogo publicado'}
            </button>
          )}
        </div>
        {rascunhoVazio && publicacao.existe && <p className="aviso">O rascunho está vazio e já existe um catálogo publicado: importe-o para começar a editar.</p>}
      </div>

      {bloqueios.length > 0 && (
        <div className="painel painel-erro">
          <h3>Impedem a publicação ({bloqueios.length})</h3>
          <ul className="lista-problemas">{bloqueios.map((p, i) => <li key={i}>{p.mensagem}</li>)}</ul>
        </div>
      )}
      {avisos.length > 0 && (
        <div className="painel">
          <h3>Avisos ({avisos.length}), não impedem a publicação</h3>
          <ul className="lista-problemas">{avisos.map((p, i) => <li key={i}>{p.mensagem}</li>)}</ul>
        </div>
      )}
      {orfaos.length > 0 && (
        <div className="painel">
          <div className="painel-topo">
            <h3>Arquivos órfãos ({orfaos.length})</h3>
            <button type="button" className="btn btn-perigo" onClick={limpar} disabled={Boolean(trabalhando)}>{trabalhando === 'limpar' ? 'Removendo…' : 'Remover todos'}</button>
          </div>
          <p className="aviso">Estão nos buckets, mas nenhum item (nem o catálogo publicado) usa. Veja a lista na aba Arquivos.</p>
        </div>
      )}
    </>
  )
}
