// O perfil do usuário guarda o responsável técnico como objeto (jsonb) com
// chaves rt*; a tela precisa de texto. Funções puras, cobertas por testes.

const CAMPOS = [
  ['rtNome', 'Nome'],
  ['rtBrtCpf', 'CPF'],
  ['rtCpf', 'CPF'],
  ['rtEmail', 'E-mail'],
  ['rtTelefone', 'Telefone'],
  ['rtEmpresa', 'Empresa'],
  ['rtEspecialidade', 'Especialidade'],
]
const CONSELHO = ['rtConselhoTipo', 'rtConselho']

const texto = (v) => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v.trim()
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** Qualquer valor do perfil vira texto: nunca um objeto, que quebraria o React (#31). */
export const textoSeguro = texto

/** [[rótulo, valor]] do responsável técnico, só com o que está preenchido. */
export function linhasDoResponsavelTecnico(valor) {
  if (valor === null || valor === undefined || valor === '') return []
  if (typeof valor !== 'object') return [['Responsável', texto(valor)]].filter(([, v]) => v)

  const linhas = []
  for (const [chave, rotulo] of CAMPOS) {
    const v = texto(valor[chave])
    if (v) linhas.push([rotulo, v])
  }
  const conselho = [texto(valor.rtConselhoTipo), texto(valor.rtConselho)].filter(Boolean).join(' ')
  if (conselho) linhas.splice(1, 0, ['Conselho', conselho])

  // Chaves que a tela ainda não conhece aparecem como estão, em vez de sumir.
  const conhecidas = new Set([...CAMPOS.map(([c]) => c), ...CONSELHO])
  for (const [chave, v] of Object.entries(valor)) {
    if (!conhecidas.has(chave) && texto(v)) linhas.push([chave, texto(v)])
  }
  return linhas
}
