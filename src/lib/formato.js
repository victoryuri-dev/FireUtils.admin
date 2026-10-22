export function dataBr(valor) {
  if (!valor) return '—'
  const iso = String(valor).slice(0, 10)
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

export function dataHoraBr(valor) {
  if (!valor) return '—'
  return new Date(valor).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
