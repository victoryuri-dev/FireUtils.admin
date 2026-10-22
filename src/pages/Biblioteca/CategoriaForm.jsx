import { useState } from 'react'
import { atualizarCategoria, criarCategoria, excluirCategoria } from '../../lib/apiCatalogo.js'
import { enviarParaBucket } from '../../lib/storage.js'
import { BUCKET_ASSETS, chaveIcone, slugify, validarCategoria } from '../../lib/catalogo.js'
import { traduzirErroBanco } from '../../lib/licencas.js'
import ConfirmaDigitando from '../../components/ConfirmaDigitando.jsx'
import Seletor from './Seletor.jsx'
import Miniatura from './Miniatura.jsx'

export default function CategoriaForm({ categoria, categorias, totalFamilias, onFechar, onSalvo }) {
  const editando = Boolean(categoria)
  const [nome, setNome] = useState(categoria?.nome ?? '')
  const [icone, setIcone] = useState(null)
  const [erros, setErros] = useState([])
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const problemas = validarCategoria({ nome, icone }, categorias, { editandoId: categoria?.id ?? null })
    setErros(problemas)
    if (problemas.length) return
    setSalvando(true)
    try {
      const id = categoria?.id ?? slugify(nome)
      const campos = { nome: nome.trim() }
      if (icone) {
        const chave = chaveIcone(id, icone.name)
        await enviarParaBucket(BUCKET_ASSETS, chave, icone, { upsert: true })
        campos.icon_key = chave
      }
      if (editando) await atualizarCategoria(id, campos)
      else await criarCategoria({ id, ...campos, ordem: categorias.length })
      onSalvo()
    } catch (ex) {
      setErros([ex.message ?? traduzirErroBanco(ex)])
      setSalvando(false)
    }
  }

  async function excluir() {
    setExcluindo(false)
    setSalvando(true)
    try {
      await excluirCategoria(categoria.id)
      onSalvo()
    } catch (ex) {
      setErros([ex.code === '23503' ? 'Mova ou exclua as famílias desta categoria antes.' : traduzirErroBanco(ex)])
      setSalvando(false)
    }
  }

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Categoria">
      <form className="modal" onSubmit={salvar}>
        <h2>{editando ? 'Editar categoria' : 'Nova categoria'}</h2>
        <label>Nome
          <input value={nome} maxLength={120} onChange={(e) => setNome(e.target.value)} autoFocus />
        </label>
        {editando && categoria.icon_key && (
          <div className="miniatura-atual"><Miniatura chave={categoria.icon_key} versao={categoria.atualizado_em} nome={categoria.nome} grande /></div>
        )}
        <Seletor rotulo={editando ? 'Substituir o ícone (opcional)' : 'Ícone (PNG, JPG ou SVG, opcional)'} aceita=".png,.jpg,.jpeg,.svg" arquivo={icone} onArquivo={setIcone} dica="Arraste o arquivo aqui ou clique" />
        {editando && <p className="aviso">O identificador ({categoria.id}) não muda ao renomear.</p>}
        {erros.map((m) => <p key={m} className="aviso erro">{m}</p>)}
        <div className="modal-acoes">
          {editando && (
            <button type="button" className="btn btn-perigo" disabled={salvando || totalFamilias > 0} onClick={() => setExcluindo(true)}
              title={totalFamilias > 0 ? 'Tem famílias' : ''}>Excluir</button>
          )}
          <span className="espaco" />
          <button type="button" className="btn btn-sec" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={salvando}>Salvar</button>
        </div>
      </form>
      {excluindo && <ConfirmaDigitando titulo="Excluir categoria" nome={categoria.nome} onCancelar={() => setExcluindo(false)} onConfirmar={excluir} />}
    </div>
  )
}
