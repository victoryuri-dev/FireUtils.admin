// Lógica pura de licenças (sem React nem Supabase), coberta por testes.

export const MODULOS = [
  { valor: 'saidas', rotulo: 'Saídas' },
  { valor: 'memorial', rotulo: 'Memorial' },
  { valor: 'hidrantes', rotulo: 'Hidrantes' },
  { valor: 'pro', rotulo: 'PRO' },
]

export const SITUACOES = [
  { valor: 'ativa', rotulo: 'Ativa' },
  { valor: 'teste', rotulo: 'Teste' },
  { valor: 'suspensa', rotulo: 'Suspensa' },
  { valor: 'cancelada', rotulo: 'Cancelada' },
]

export const rotuloModulo = (v) => MODULOS.find((m) => m.valor === v)?.rotulo ?? v
export const rotuloSituacao = (v) =>
  v === 'expirada' ? 'Expirada' : SITUACOES.find((s) => s.valor === v)?.rotulo ?? v

const ISO = /^\d{4}-\d{2}-\d{2}$/

function paraUtc(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d))
}

function paraIso(data) {
  return data.toISOString().slice(0, 10)
}

// "Hoje" no Brasil (UTC-3), mesma régua de tem_licenca() no banco.
export function hojeNoBrasil(agora = new Date()) {
  return paraIso(new Date(agora.getTime() - 3 * 60 * 60 * 1000))
}

export function somarDias(iso, dias) {
  const d = paraUtc(iso)
  d.setUTCDate(d.getUTCDate() + dias)
  return paraIso(d)
}

export function somarAnos(iso, anos) {
  const d = paraUtc(iso)
  const dia = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCFullYear(d.getUTCFullYear() + anos)
  // 29/02 num ano sem bissexto cai no último dia de fevereiro.
  const ultimo = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dia, ultimo))
  return paraIso(d)
}

export function diasAte(iso, hoje) {
  return Math.round((paraUtc(iso) - paraUtc(hoje)) / 86_400_000)
}

// "Expirada" não existe no banco: é ativa/teste com expira_em já passada.
export function situacaoEfetiva(licenca, hoje) {
  const { situacao, expira_em: expira } = licenca
  if ((situacao === 'ativa' || situacao === 'teste') && expira && expira < hoje) return 'expirada'
  return situacao
}

export function vencendoEm(licenca, hoje, dias = 15) {
  if (!['ativa', 'teste'].includes(licenca.situacao) || !licenca.expira_em) return false
  const n = diasAte(licenca.expira_em, hoje)
  return n >= 0 && n <= dias
}

// Atalhos "+30 dias" / "+1 ano": contam a partir da expiração atual quando
// ela ainda vale; senão, a partir de hoje.
export function estenderExpiracao(expiraAtual, hoje, { dias = 0, anos = 0 }) {
  const base = expiraAtual && expiraAtual >= hoje ? expiraAtual : hoje
  const comAnos = anos ? somarAnos(base, anos) : base
  return dias ? somarDias(comAnos, dias) : comAnos
}

export function validarLicenca(f) {
  const erros = []
  if (!MODULOS.some((m) => m.valor === f.modulo)) erros.push('Escolha o módulo.')
  if (!SITUACOES.some((s) => s.valor === f.situacao)) erros.push('Escolha a situação.')
  if (!ISO.test(f.inicio_em ?? '')) erros.push('Informe a data de início.')
  if (f.expira_em && !ISO.test(f.expira_em)) erros.push('Data de expiração inválida.')
  if (ISO.test(f.inicio_em ?? '') && f.expira_em && ISO.test(f.expira_em) && f.expira_em < f.inicio_em) {
    erros.push('A expiração não pode ser anterior ao início.')
  }
  if ((f.plano ?? '').length > 80) erros.push('O plano pode ter no máximo 80 caracteres.')
  return erros
}

// Mensagens legíveis para os erros do Postgres/PostgREST.
export function traduzirErroBanco(erro) {
  if (!erro) return ''
  if (erro.code === '23505') return 'Este usuário já tem uma licença deste módulo. Edite a existente.'
  if (erro.code === '23514') return 'A expiração não pode ser anterior ao início.'
  if (erro.code === '23503') return 'Usuário não encontrado.'
  if (erro.code === '42501') return 'Sem permissão para esta operação.'
  return erro.message || 'Erro inesperado.'
}
