import { useMemo, useRef, useState } from 'react'
import { definirIconeTodas, excluirFamilia, importarCatalogo, salvarOrdem } from '../../lib/apiCatalogo.js'
import { BUCKET_ASSETS, ROTULO_PROBLEMA, reordenar } from '../../lib/catalogo.js'
import { enviarParaBucket } from '../../lib/storage.js'
import { traduzirErroBanco } from '../../lib/licencas.js'
import { formatarTamanho } from '../../lib/versoes.js'
import ConfirmaDigitando from '../../components/ConfirmaDigitando.jsx'
import { useBiblioteca } from './contexto.jsx'
import Miniatura from './Miniatura.jsx'
import FamiliaForm from './FamiliaForm.jsx'
import CategoriaForm from './CategoriaForm.jsx'

export default function Catalogo() {
  const b = useBiblioteca()
  const [categoriaId, setCategoriaId] = useState('todas')
  const [busca, setBusca] = useState('')
  const [soProblemas, setSoProblemas] = useState(false)
  const [formFamilia, setFormFamilia] = useState(null) // null | { familia } (familia null = nova)
  const [formCategoria, setFormCategoria] = useState(null)
  const [excluindo, setExcluindo] = useState(null)
  const [erro, setErro] = useState('')
  const [importando, setImportando] = useState(false)
  const entradaTodas = useRef(null)

  const familiasDe = (id) => b.familias.filter((f) => f.category_id === id)
  const nomeDaCategoria = useMemo(() => Object.fromEntries(b.categorias.map((c) => [c.id, c.nome])), [b.categorias])

  const visiveis = b.familias
    .filter((f) => categoriaId === 'todas' || f.category_id === categoriaId)
    .filter((f) => !busca.trim() || f.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    .filter((f) => !soProblemas || b.problemas.has(f.nome))
  const podeReordenar = categoriaId !== 'todas' && !busca.trim() && !soProblemas

  async function mover(familia, direcao) {
    setErro('')
    try {
      await salvarOrdem('catalogo_familias', reordenar(familiasDe(categoriaId), familia.id, direcao))
      await b.recarregar()
    } catch (e) { setErro(traduzirErroBanco(e)) }
  }

  async function moverCategoria(c, direcao) {
    setErro('')
    try {
      await salvarOrdem('catalogo_categorias', reordenar(b.categorias, c.id, direcao))
      await b.recarregar()
    } catch (e) { setErro(traduzirErroBanco(e)) }
  }

  async function trocarIconeTodas(arquivo) {
    setErro('')
    try {
      const chave = `icons/todas.${arquivo.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg')}`
      await enviarParaBucket(BUCKET_ASSETS, chave, arquivo, { upsert: true })
      await definirIconeTodas(chave)
      await b.atualizarTudo()
    } catch (e) { setErro(e.message ?? traduzirErroBanco(e)) }
  }

  async function importar() {
    setImportando(true)
    setErro('')
    try {
      await importarCatalogo(false)
      await b.atualizarTudo()
    } catch (e) { setErro(e.message) }
    setImportando(false)
  }

  async function excluir(f) {
    setExcluindo(null)
    setErro('')
    try {
      await excluirFamilia(f.id)
      await b.atualizarTudo()
    } catch (e) { setErro(traduzirErroBanco(e)) }
  }

  if (!b.carregado) return <p className="aviso">{b.erro || 'Carregando…'}</p>

  const vazio = b.categorias.length === 0 && b.familias.length === 0
  const semCategorias = b.categorias.length === 0

  return (
    <>
      {b.erro && <p className="aviso erro">{b.erro}</p>}
      {erro && <p className="aviso erro">{erro}</p>}
      {b.erroVerificacao && (
        <p className="aviso erro">Não foi possível conferir os arquivos: {b.erroVerificacao}. As miniaturas e os avisos de itens fantasmas ficam indisponíveis.</p>
      )}
      {vazio && (
        <div className="vazio">
          <p>O rascunho do catálogo está vazio.</p>
          {b.verificacao?.publicacao?.existe ? (
            <>
              <small>Já existe um catálogo publicado. Importe-o para começar a editar (os arquivos e o catálogo publicado não são alterados).</small>
              <div><button type="button" className="btn btn-primario" onClick={importar} disabled={importando}>{importando ? 'Importando…' : 'Importar catálogo publicado'}</button></div>
            </>
          ) : (
            <small>Crie uma categoria para começar.</small>
          )}
        </div>
      )}

      <div className="biblioteca">
        <aside className="categorias">
          <div className="categorias-topo">
            <strong>Categorias</strong>
            <button type="button" className="btn btn-sec" onClick={() => setFormCategoria({ categoria: null })}>+ Nova</button>
          </div>
          <button type="button" className={categoriaId === 'todas' ? 'cat-item ativa' : 'cat-item'} onClick={() => setCategoriaId('todas')}>
            <span>Todas</span><em>{b.familias.length}</em>
          </button>
          {b.categorias.map((c, i) => (
            <div key={c.id} className={categoriaId === c.id ? 'cat-linha ativa' : 'cat-linha'}>
              <button type="button" className="cat-item" onClick={() => setCategoriaId(c.id)}>
                <Miniatura chave={c.icon_key} versao={c.atualizado_em} nome={c.nome} />
                <span>{c.nome}</span><em>{familiasDe(c.id).length}</em>
              </button>
              <span className="cat-acoes">
                <button type="button" aria-label="Subir categoria" disabled={i === 0} onClick={() => moverCategoria(c, -1)}>↑</button>
                <button type="button" aria-label="Descer categoria" disabled={i === b.categorias.length - 1} onClick={() => moverCategoria(c, 1)}>↓</button>
                <button type="button" aria-label="Editar categoria" onClick={() => setFormCategoria({ categoria: c })}>✎</button>
              </span>
            </div>
          ))}
          <div className="todas-icone">
            <Miniatura chave={b.config?.todas_icon_key} versao={b.verificacao?.publicacao?.publicado_em} nome="Todas" />
            <span className="muted">Ícone de "Todas"</span>
            <input ref={entradaTodas} type="file" accept=".png,.jpg,.jpeg,.svg" hidden onChange={(e) => e.target.files[0] && trocarIconeTodas(e.target.files[0])} />
            <button type="button" className="btn btn-sec" onClick={() => entradaTodas.current?.click()}>Trocar</button>
          </div>
        </aside>

        <div className="familias">
          <div className="barra">
            <input className="busca-input" placeholder="Buscar família" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <label className="opcao-linha">
              <input type="checkbox" checked={soProblemas} onChange={(e) => setSoProblemas(e.target.checked)} /> Só com problema
            </label>
            <span className="espaco" />
            <button type="button" className="btn btn-primario" disabled={semCategorias}
              title={semCategorias ? 'Crie uma categoria primeiro' : ''}
              onClick={() => setFormFamilia({ familia: null })}>Nova família</button>
          </div>

          <div className="grade-familias">
            {visiveis.map((f, i) => {
              const ps = b.problemas.get(f.nome) ?? []
              const bloqueio = ps.some((p) => p.bloqueia)
              return (
                <div key={f.id} className={`familia-card ${bloqueio ? 'com-erro' : ''}`}>
                  <Miniatura chave={f.thumbnail_key} versao={f.atualizado_em} nome={f.nome} grande />
                  <div className="familia-info">
                    <strong title={f.nome}>{f.nome}</strong>
                    <small className="muted">{nomeDaCategoria[f.category_id]} · {formatarTamanho(f.size_bytes)}</small>
                    <div className="familia-selos">
                      {ps.map((p) => (
                        <span key={p.tipo} className={p.bloqueia ? 'selo selo-erro' : 'selo selo-aviso'} title={p.mensagem}>{ROTULO_PROBLEMA[p.tipo] ?? p.tipo}</span>
                      ))}
                    </div>
                  </div>
                  <div className="familia-acoes">
                    {podeReordenar && (
                      <>
                        <button type="button" className="btn btn-sec" aria-label="Subir" disabled={i === 0} onClick={() => mover(f, -1)}>↑</button>
                        <button type="button" className="btn btn-sec" aria-label="Descer" disabled={i === visiveis.length - 1} onClick={() => mover(f, 1)}>↓</button>
                      </>
                    )}
                    <button type="button" className="btn btn-sec" onClick={() => setFormFamilia({ familia: f })}>Editar</button>
                    <button type="button" className="btn btn-sec" onClick={() => setExcluindo(f)}>Excluir</button>
                  </div>
                </div>
              )
            })}
            {visiveis.length === 0 && !vazio && <p className="muted">Nenhuma família neste filtro.</p>}
          </div>
        </div>
      </div>

      {formFamilia && (
        <FamiliaForm
          familia={formFamilia.familia}
          categoriaInicial={categoriaId !== 'todas' ? categoriaId : ''}
          categorias={b.categorias} familias={b.familias}
          chavesFamilias={b.chavesFamilias} chavesAssets={b.chavesAssets}
          onFechar={() => setFormFamilia(null)}
          onSalvo={() => { setFormFamilia(null); b.atualizarTudo() }}
        />
      )}
      {formCategoria && (
        <CategoriaForm
          categoria={formCategoria.categoria} categorias={b.categorias}
          totalFamilias={formCategoria.categoria ? familiasDe(formCategoria.categoria.id).length : 0}
          onFechar={() => setFormCategoria(null)}
          onSalvo={() => { setFormCategoria(null); b.atualizarTudo() }}
        />
      )}
      {excluindo && (
        <ConfirmaDigitando
          titulo="Excluir família" nome={excluindo.nome}
          onCancelar={() => setExcluindo(null)} onConfirmar={() => excluir(excluindo)}
        />
      )}
    </>
  )
}
