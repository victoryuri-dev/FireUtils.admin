// Lógica pura do catálogo (sem React nem Supabase), coberta por testes.
// slugify e o formato das chaves seguem migration/generate_catalog.py
// (FireUtils.extension) e supabase/functions/_shared/catalogo.ts (ETOS.FireUtils).

export const BUCKET_FAMILIAS = 'revit-families'
export const BUCKET_ASSETS = 'plugin-assets'

export function slugify(texto) {
  const slug = texto
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
  return slug || 'item'
}

export const urlPublica = (key, versao = '') =>
  `${import.meta.env?.VITE_SUPABASE_URL ?? ''}/storage/v1/object/public/${BUCKET_ASSETS}/${key.split('/').map(encodeURIComponent).join('/')}${versao ? `?v=${encodeURIComponent(versao)}` : ''}`

const mesmoNome = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase()

export const nomeEmUso = (nome, itens, ignorarId = null) =>
  itens.find((i) => i.id !== ignorarId && mesmoNome(i.nome, nome)) ?? null

const extensao = (nome) => (nome.match(/\.([^.]+)$/)?.[1] ?? '').toLowerCase()

/** Chave do .rfa: <categoria>/<slug>.rfa; se já existir no bucket (órfão, ou
 * a família sendo substituída), <categoria>/<slug>-<hash8>.rfa — nunca
 * sobrescreve um arquivo que o catálogo publicado ainda pode estar usando. */
export function chaveRfa(categoriaId, nome, sha256, chavesExistentes) {
  const slug = slugify(nome)
  const simples = `${categoriaId}/${slug}.rfa`
  return chavesExistentes.has(simples) ? `${categoriaId}/${slug}-${sha256.slice(0, 8)}.rfa` : simples
}

export const chaveMiniatura = (categoriaId, nome) => `thumbnails/${categoriaId}/${slugify(nome)}.png`
export const chaveIcone = (categoriaId, nomeArquivo) => `icons/${categoriaId}.${extensao(nomeArquivo) === 'jpeg' ? 'jpg' : extensao(nomeArquivo)}`

/** Erros de uma família nova/editada. `f`: { nome, category_id, rfa, miniatura }, `existentes`: famílias já cadastradas. */
export function validarFamilia(f, existentes, { editandoId = null } = {}) {
  const erros = []
  const nome = (f.nome ?? '').trim()
  if (!nome) erros.push('Informe o nome.')
  else if (nome.length > 200) erros.push('O nome pode ter no máximo 200 caracteres.')
  else {
    const dup = nomeEmUso(nome, existentes, editandoId)
    if (dup) erros.push(`Já existe uma família chamada "${dup.nome}".`)
    if (!editandoId) {
      const id = `${f.category_id}__${slugify(nome)}`
      const colide = existentes.find((e) => e.id === id)
      if (colide) erros.push(`O nome gera o mesmo identificador de "${colide.nome}".`)
    }
  }
  if (!f.category_id) erros.push('Escolha a categoria.')
  if (!editandoId && !f.rfa) erros.push('Selecione o arquivo .rfa.')
  if (f.rfa && extensao(f.rfa.name) !== 'rfa') erros.push('O arquivo da família deve ser .rfa.')
  if (f.miniatura && extensao(f.miniatura.name) !== 'png') erros.push('A miniatura deve ser PNG.')
  return erros
}

export function validarCategoria(c, existentes, { editandoId = null } = {}) {
  const erros = []
  const nome = (c.nome ?? '').trim()
  if (!nome) erros.push('Informe o nome.')
  else if (nome.length > 120) erros.push('O nome pode ter no máximo 120 caracteres.')
  else {
    const dup = nomeEmUso(nome, existentes, editandoId)
    if (dup) erros.push(`Já existe uma categoria chamada "${dup.nome}".`)
    if (!editandoId && existentes.some((e) => e.id === slugify(nome))) erros.push('O nome gera o mesmo identificador de outra categoria.')
  }
  if (c.icone && !['png', 'jpg', 'jpeg'].includes(extensao(c.icone.name))) erros.push('O ícone deve ser PNG ou JPG.')
  return erros
}

/** Move o item de `id` uma posição e devolve só o que precisa mudar: [{id, ordem}]. */
export function reordenar(lista, id, direcao) {
  const i = lista.findIndex((x) => x.id === id)
  const j = i + direcao
  if (i < 0 || j < 0 || j >= lista.length) return []
  const nova = [...lista]
  ;[nova[i], nova[j]] = [nova[j], nova[i]]
  return nova.map((x, ordem) => ({ id: x.id, ordem })).filter((x, k) => lista.find((o) => o.id === x.id).ordem !== x.ordem || k === i || k === j)
}

/** Problemas (da verificação) de cada família, indexados pelo nome. */
export function problemasPorNome(problemas) {
  const mapa = new Map()
  for (const p of problemas) if (p.alvo) mapa.set(p.alvo, [...(mapa.get(p.alvo) ?? []), p])
  return mapa
}

export const ROTULO_PROBLEMA = {
  familia_ausente: '.rfa ausente',
  thumbnail_ausente: 'Miniatura ausente',
  icone_ausente: 'Ícone ausente',
  tamanho_divergente: 'Tamanho diverge',
  familia_sem_miniatura: 'Sem miniatura',
  categoria_sem_icone: 'Sem ícone',
  categoria_vazia: 'Sem famílias',
  arquivo_compartilhado: 'Arquivo compartilhado',
}

export const ROTULO_SITUACAO = { em_uso: 'Em uso', so_publicado: 'Só no publicado', orfao: 'Órfão' }
