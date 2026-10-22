import { useState } from 'react'
import { atualizarFamilia, criarFamilia } from '../../lib/apiCatalogo.js'
import { enviarParaBucket, removerDoBucket } from '../../lib/storage.js'
import {
  BUCKET_ASSETS, BUCKET_FAMILIAS, chaveMiniatura, chaveRfa, slugify, validarFamilia,
} from '../../lib/catalogo.js'
import { traduzirErroBanco } from '../../lib/licencas.js'
import { sha256Hex } from '../../lib/versoes.js'
import Seletor from './Seletor.jsx'
import Miniatura from './Miniatura.jsx'

// Cria ou edita uma família. Ordem de segurança: sobe os arquivos, grava a
// linha por último; se algo falhar, apaga o que acabou de subir — assim nunca
// sobra item apontando para arquivo que não existe.
export default function FamiliaForm({ familia, categoriaInicial, categorias, familias, chavesFamilias, chavesAssets, onFechar, onSalvo }) {
  const editando = Boolean(familia)
  const [f, setF] = useState({
    nome: familia?.nome ?? '',
    category_id: familia?.category_id ?? categoriaInicial ?? '',
    rfa: null,
    miniatura: null,
    removerMiniatura: false,
  })
  const [erros, setErros] = useState([])
  const [etapa, setEtapa] = useState('')
  const [progresso, setProgresso] = useState(0)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e) {
    e.preventDefault()
    const problemas = validarFamilia(f, familias, { editandoId: familia?.id ?? null })
    setErros(problemas)
    if (problemas.length) return

    setSalvando(true)
    const novos = [] // { bucket, chave } enviados agora, para desfazer em caso de erro
    try {
      const campos = {}
      const nome = f.nome.trim()
      if (nome !== familia?.nome) campos.nome = nome
      if (editando && f.category_id !== familia.category_id) campos.category_id = f.category_id

      let hash = familia?.sha256
      if (f.rfa) {
        setEtapa('Calculando SHA-256…')
        hash = await sha256Hex(await f.rfa.arrayBuffer())
        if (editando && hash === familia.sha256) {
          throw new Error('Este .rfa é idêntico ao atual (mesmo SHA-256). Nada a substituir.')
        }
        const chave = chaveRfa(f.category_id, nome, hash, chavesFamilias)
        setEtapa(`Enviando ${f.rfa.name}…`)
        setProgresso(0)
        await enviarParaBucket(BUCKET_FAMILIAS, chave, f.rfa, { aoProgredir: setProgresso })
        novos.push({ bucket: BUCKET_FAMILIAS, chave })
        Object.assign(campos, { storage_key: chave, size_bytes: f.rfa.size, sha256: hash })
      }

      if (f.miniatura) {
        const chave = familia?.thumbnail_key ?? chaveMiniatura(f.category_id, nome)
        setEtapa('Enviando miniatura…')
        setProgresso(0)
        await enviarParaBucket(BUCKET_ASSETS, chave, f.miniatura, { upsert: true, aoProgredir: setProgresso })
        if (!chavesAssets.has(chave)) novos.push({ bucket: BUCKET_ASSETS, chave })
        campos.thumbnail_key = chave
      } else if (editando && f.removerMiniatura && familia.thumbnail_key) {
        campos.thumbnail_key = null
      }

      setEtapa('Salvando…')
      if (editando) {
        if (Object.keys(campos).length) await atualizarFamilia(familia.id, campos)
      } else {
        await criarFamilia({
          id: `${f.category_id}__${slugify(nome)}`,
          nome,
          category_id: f.category_id,
          thumbnail_key: campos.thumbnail_key ?? null,
          storage_key: campos.storage_key,
          size_bytes: campos.size_bytes,
          sha256: campos.sha256,
          ordem: familias.filter((x) => x.category_id === f.category_id).length,
        })
      }
      onSalvo()
    } catch (ex) {
      for (const n of novos) await removerDoBucket(n.bucket, [n.chave]).catch(() => {})
      setErros([ex.message ?? traduzirErroBanco(ex)])
      setSalvando(false)
      setEtapa('')
    }
  }

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Família">
      <form className="modal modal-largo" onSubmit={salvar}>
        <h2>{editando ? 'Editar família' : 'Nova família'}</h2>
        <div className="grade-form">
          <label className="coluna-cheia">Nome
            <input value={f.nome} maxLength={200} onChange={(e) => setF({ ...f, nome: e.target.value })} autoFocus />
          </label>
          <label className="coluna-cheia">Categoria
            <select value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
              <option value="">Selecione…</option>
              {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </label>
        </div>

        {editando && familia.thumbnail_key && !f.removerMiniatura && (
          <div className="miniatura-atual">
            <Miniatura chave={familia.thumbnail_key} versao={familia.atualizado_em} nome={familia.nome} grande />
            <label className="opcao-linha">
              <input type="checkbox" checked={f.removerMiniatura} onChange={(e) => setF({ ...f, removerMiniatura: e.target.checked })} />
              Remover miniatura
            </label>
          </div>
        )}
        <Seletor
          rotulo={editando ? 'Substituir o .rfa (opcional)' : 'Arquivo .rfa'}
          aceita=".rfa" arquivo={f.rfa} onArquivo={(a) => setF({ ...f, rfa: a })}
          dica={editando ? `Atual: ${familia.storage_key}` : 'Arraste o arquivo aqui ou clique'}
        />
        <Seletor
          rotulo={editando ? 'Substituir a miniatura (PNG, opcional)' : 'Miniatura (PNG, opcional)'}
          aceita=".png,image/png" arquivo={f.miniatura} onArquivo={(a) => setF({ ...f, miniatura: a, removerMiniatura: false })}
          dica="Arraste o arquivo aqui ou clique"
        />

        {erros.map((m) => <p key={m} className="aviso erro">{m}</p>)}
        {salvando && (
          <div className="progresso"><span>{etapa}</span><progress value={progresso} max="1" /></div>
        )}
        <div className="modal-acoes">
          <button type="button" className="btn btn-sec" onClick={onFechar} disabled={salvando}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={salvando}>Salvar</button>
        </div>
      </form>
    </div>
  )
}
