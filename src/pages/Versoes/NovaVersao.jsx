import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  criarRelease, enviarArquivo, excluirRascunho, listarReleases, removerArquivos,
} from '../../lib/apiVersoes.js'
import { traduzirErroBanco } from '../../lib/licencas.js'
import {
  formatarTamanho, interpretarNome, nomeDaAssinatura, nomeDoHash, normalizarNotas, sha256Hex, validarNovaVersao,
} from '../../lib/versoes.js'
import EditorNotas from './EditorNotas.jsx'
import PreviaNotas from './PreviaNotas.jsx'

function Soltar({ rotulo, aceita, arquivo, onArquivo }) {
  const entrada = useRef(null)
  const [sobre, setSobre] = useState(false)
  const pegar = (f) => f && onArquivo(f)
  return (
    <div
      className={`soltar ${sobre ? 'sobre' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setSobre(true) }}
      onDragLeave={() => setSobre(false)}
      onDrop={(e) => { e.preventDefault(); setSobre(false); pegar(e.dataTransfer.files[0]) }}
      onClick={() => entrada.current?.click()}
    >
      <input ref={entrada} type="file" accept={aceita} hidden onChange={(e) => pegar(e.target.files[0])} />
      <strong>{rotulo}</strong>
      <span className="muted">{arquivo ? `${arquivo.name} · ${formatarTamanho(arquivo.size)}` : 'Arraste o arquivo aqui ou clique para escolher'}</span>
    </div>
  )
}

export default function NovaVersao() {
  const navegar = useNavigate()
  const [existentes, setExistentes] = useState([])
  const [f, setF] = useState({ tipo: 'instalador', versao: '', base: '', arquivo: null, assinatura: null })
  const [titulo, setTitulo] = useState('')
  const [itens, setItens] = useState([{ tipo: 'novo', texto: '' }])
  const [erros, setErros] = useState([])
  const [etapa, setEtapa] = useState('') // texto do que está acontecendo
  const [progresso, setProgresso] = useState(0)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    listarReleases().then(setExistentes).catch((e) => setErros([traduzirErroBanco(e)]))
  }, [])

  function escolherArquivo(arquivo) {
    const nome = interpretarNome(arquivo.name)
    setF((atual) => ({
      ...atual,
      arquivo,
      // Preenche versão/base a partir do nome; o usuário ainda pode corrigir e a validação confere.
      versao: nome && nome.tipo === atual.tipo ? nome.versao : atual.versao,
      base: nome?.base ?? atual.base,
    }))
  }

  async function enviar(e) {
    e.preventDefault()
    const problemas = validarNovaVersao(f, existentes)
    const { notas, erros: errosNotas } = normalizarNotas(itens)
    setErros([...problemas, ...errosNotas])
    if (problemas.length || errosNotas.length) return

    setEnviando(true)
    const enviados = []
    let id = null
    try {
      setEtapa('Calculando SHA-256…')
      setProgresso(0)
      const hash = await sha256Hex(await f.arquivo.arrayBuffer())

      setEtapa('Registrando rascunho…')
      id = await criarRelease({
        versao: f.versao.trim(),
        tipo: f.tipo,
        arquivo: f.arquivo.name,
        base_minima: f.tipo === 'pacote' ? f.base.trim() : null,
        sha256: hash,
        tamanho_bytes: f.arquivo.size,
        titulo: titulo.trim(),
        notas,
      })

      setEtapa(`Enviando ${f.arquivo.name}…`)
      await enviarArquivo(f.arquivo.name, f.arquivo, setProgresso)
      enviados.push(f.arquivo.name)

      if (f.tipo === 'instalador') {
        setEtapa('Enviando arquivo de hash…')
        const nomeHash = nomeDoHash(f.arquivo.name)
        await enviarArquivo(nomeHash, new Blob([hash], { type: 'text/plain' }))
        enviados.push(nomeHash)
      } else {
        setEtapa('Enviando assinatura…')
        await enviarArquivo(nomeDaAssinatura(f.arquivo.name), f.assinatura)
        enviados.push(nomeDaAssinatura(f.arquivo.name))
      }
      navegar(`/versoes/${id}`)
    } catch (ex) {
      // Desfaz o que foi feito para não deixar rascunho sem arquivo.
      if (enviados.length) await removerArquivos(enviados).catch(() => {})
      if (id) await excluirRascunho({ id, arquivo: f.arquivo.name, tipo: f.tipo }).catch(() => {})
      setErros([ex.message ?? traduzirErroBanco(ex)])
      setEnviando(false)
      setEtapa('')
    }
  }

  const trocarTipo = (tipo) => setF({ tipo, versao: '', base: '', arquivo: null, assinatura: null })

  return (
    <form onSubmit={enviar}>
      <p><Link to="/versoes">← Versões</Link></p>
      <div className="painel">
        <h3>Arquivo</h3>
        <div className="seletor-tipo" role="radiogroup" aria-label="Tipo">
          {['instalador', 'pacote'].map((t) => (
            <label key={t} className={f.tipo === t ? 'opcao ativa' : 'opcao'}>
              <input type="radio" name="tipo" checked={f.tipo === t} onChange={() => trocarTipo(t)} disabled={enviando} />
              {t === 'instalador' ? 'Instalador (.exe)' : 'Pacote de atualização (.zip)'}
            </label>
          ))}
        </div>
        <Soltar
          rotulo={f.tipo === 'instalador' ? 'FireUtils-Setup-X.Y.Z.exe' : 'FireUtils-Pacote-X.Y.Z-base-B.zip'}
          aceita={f.tipo === 'instalador' ? '.exe' : '.zip'}
          arquivo={f.arquivo}
          onArquivo={escolherArquivo}
        />
        {f.tipo === 'pacote' && (
          <Soltar rotulo="Assinatura (.sig), gerada localmente por publicar-pacote.ps1" aceita=".sig" arquivo={f.assinatura} onArquivo={(a) => setF({ ...f, assinatura: a })} />
        )}
        <div className="grade-form">
          <label>Versão
            <input value={f.versao} onChange={(e) => setF({ ...f, versao: e.target.value })} placeholder="3.2.0" />
          </label>
          {f.tipo === 'pacote' && (
            <label>Base mínima (versão do instalador)
              <input value={f.base} onChange={(e) => setF({ ...f, base: e.target.value })} placeholder="3.1.0" />
            </label>
          )}
          <label className="coluna-cheia">Título (opcional)
            <input value={titulo} maxLength={120} onChange={(e) => setTitulo(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="painel">
        <h3>Notas da versão</h3>
        <div className="duas-colunas">
          <EditorNotas itens={itens} onChange={setItens} />
          <PreviaNotas versao={f.versao} titulo={titulo} itens={itens} />
        </div>
      </div>

      {erros.map((m) => <p key={m} className="aviso erro">{m}</p>)}
      {enviando && (
        <div className="progresso">
          <span>{etapa}</span>
          <progress value={progresso} max="1" />
        </div>
      )}
      <button type="submit" className="btn btn-primario" disabled={enviando}>Salvar como rascunho</button>
      <p className="aviso">A versão só aparece para os clientes depois de publicada.</p>
    </form>
  )
}
