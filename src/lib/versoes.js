// Lógica pura de versões do plugin (sem React nem Supabase), coberta por testes.
// Os padrões de nome são os mesmos que a dockpane usa (FireUtils.extension,
// webapp/src/lib/versoes.js) e o build.ps1 gera: não mude sem mudar lá.

const VERSAO = String.raw`\d+(?:\.\d+){0,3}`
const NOME_INSTALADOR = new RegExp(`^FireUtils-Setup-(${VERSAO})\\.exe$`)
const NOME_PACOTE = new RegExp(`^FireUtils-Pacote-(${VERSAO})-base-(${VERSAO})\\.zip$`)
const VERSAO_VALIDA = new RegExp(`^${VERSAO}$`)

export const TIPOS_NOTA = [
  { valor: 'novo', rotulo: 'Novo' },
  { valor: 'melhoria', rotulo: 'Melhoria' },
  { valor: 'correcao', rotulo: 'Correção' },
]
export const rotuloNota = (v) => TIPOS_NOTA.find((t) => t.valor === v)?.rotulo ?? v

export const versaoValida = (v) => typeof v === 'string' && VERSAO_VALIDA.test(v.trim())

/** -1, 0 ou 1. Partes que faltam valem 0 ("2.1" = "2.1.0"). */
export function compararVersoes(a, b) {
  const pa = a.trim().split('.').map(Number)
  const pb = b.trim().split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? 0
    const y = pb[i] ?? 0
    if (x !== y) return x < y ? -1 : 1
  }
  return 0
}

/** {tipo, versao, base?} se o nome é de instalador ou pacote; senão null. */
export function interpretarNome(nome) {
  let m = NOME_INSTALADOR.exec(nome)
  if (m) return { tipo: 'instalador', versao: m[1] }
  m = NOME_PACOTE.exec(nome)
  if (m) return { tipo: 'pacote', versao: m[1], base: m[2] }
  return null
}

export const nomeDoHash = (arquivo) => `${arquivo}.sha256`
export const nomeDaAssinatura = (arquivo) => `${arquivo}.sig`

/**
 * Valida o formulário de nova versão. Devolve a lista de erros (vazia = ok).
 * @param f  { tipo, versao, base, arquivo: {name}|null, assinatura: {name}|null }
 * @param existentes  releases já cadastradas ({tipo, versao}), rascunhos incluídos
 */
export function validarNovaVersao(f, existentes) {
  const erros = []
  if (!['instalador', 'pacote'].includes(f.tipo)) return ['Escolha o tipo.']

  const versao = (f.versao ?? '').trim()
  if (!versaoValida(versao)) erros.push('Informe a versão no formato X.Y.Z.')

  if (!f.arquivo) {
    erros.push(f.tipo === 'instalador' ? 'Selecione o instalador (.exe).' : 'Selecione o pacote (.zip).')
  } else {
    const nome = interpretarNome(f.arquivo.name)
    if (!nome || nome.tipo !== f.tipo) {
      erros.push(
        f.tipo === 'instalador'
          ? 'O nome do arquivo deve ser FireUtils-Setup-X.Y.Z.exe.'
          : 'O nome do arquivo deve ser FireUtils-Pacote-X.Y.Z-base-B.zip.',
      )
    } else {
      if (versaoValida(versao) && compararVersoes(nome.versao, versao) !== 0) {
        erros.push(`A versão do nome do arquivo (${nome.versao}) não bate com a informada (${versao}).`)
      }
      if (f.tipo === 'pacote') {
        const base = (f.base ?? '').trim()
        if (!versaoValida(base)) erros.push('Informe a base mínima (versão do instalador).')
        else if (compararVersoes(nome.base, base) !== 0) {
          erros.push(`A base do nome do arquivo (${nome.base}) não bate com a informada (${base}).`)
        }
      }
    }
  }

  if (f.tipo === 'pacote') {
    if (!f.assinatura) erros.push('Selecione a assinatura (.sig) do pacote.')
    else if (f.arquivo && f.assinatura.name !== nomeDaAssinatura(f.arquivo.name)) {
      erros.push(`A assinatura deve se chamar ${nomeDaAssinatura(f.arquivo.name)}.`)
    }
  }

  if (versaoValida(versao)) {
    const mesmoTipo = existentes.filter((r) => r.tipo === f.tipo)
    if (mesmoTipo.some((r) => compararVersoes(r.versao, versao) === 0)) {
      erros.push(`Já existe ${f.tipo === 'instalador' ? 'um instalador' : 'um pacote'} com a versão ${versao}.`)
    } else {
      const maior = mesmoTipo.map((r) => r.versao).sort(compararVersoes).at(-1)
      if (maior && compararVersoes(versao, maior) < 0) {
        erros.push(`A versão deve ser maior que a última ${f.tipo === 'instalador' ? 'do instalador' : 'do pacote'} (${maior}).`)
      }
    }
  }
  return erros
}

/** Notas: só itens com texto; tipo válido. Devolve { notas, erros }. */
export function normalizarNotas(itens) {
  const notas = []
  const erros = []
  itens.forEach((it, i) => {
    const texto = (it.texto ?? '').trim()
    if (!texto) return
    if (!TIPOS_NOTA.some((t) => t.valor === it.tipo)) erros.push(`Item ${i + 1}: tipo inválido.`)
    else if (texto.length > 500) erros.push(`Item ${i + 1}: máximo de 500 caracteres.`)
    else notas.push({ tipo: it.tipo, texto })
  })
  return { notas, erros }
}

export function formatarTamanho(bytes) {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  const unidades = ['KB', 'MB', 'GB']
  let v = bytes
  let i = -1
  do { v /= 1024; i++ } while (v >= 1024 && i < unidades.length - 1)
  return `${v.toFixed(v < 10 ? 1 : 0)} ${unidades[i]}`
}

/** SHA-256 em hex minúsculo (64 caracteres), via Web Crypto. */
export async function sha256Hex(buffer) {
  const resumo = await globalThis.crypto.subtle.digest('SHA-256', buffer)
  return [...new Uint8Array(resumo)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
