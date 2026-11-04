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

// O catálogo guarda famílias (.rfa) e projetos (.rvt) no mesmo bucket; quem
// consome o catálogo distingue pela extensão do storage_key.
export const EXTENSOES_ARQUIVO = ['rfa', 'rvt']

export const extensaoDoArquivo = (nome) => extensao(nome)

/** 'rfa' | 'rvt' | null, a partir do storage_key. */
export const tipoDoArquivo = (storageKey) => {
  const e = extensao(storageKey ?? '')
  return EXTENSOES_ARQUIVO.includes(e) ? e : null
}

/** Chave do arquivo: <categoria>/<slug>.<ext>; se já existir no bucket (órfão, ou
 * o item sendo substituído), <categoria>/<slug>-<hash8>.<ext> — nunca
 * sobrescreve um arquivo que o catálogo publicado ainda pode estar usando. */
export function chaveArquivo(categoriaId, nome, sha256, chavesExistentes, ext) {
  const slug = slugify(nome)
  const simples = `${categoriaId}/${slug}.${ext}`
  return chavesExistentes.has(simples) ? `${categoriaId}/${slug}-${sha256.slice(0, 8)}.${ext}` : simples
}

export const chaveMiniatura = (categoriaId, nome) => `thumbnails/${categoriaId}/${slugify(nome)}.png`
export const EXTENSOES_ICONE = ['png', 'jpg', 'jpeg', 'svg']
export const chaveIcone = (categoriaId, nomeArquivo) => `icons/${categoriaId}.${extensao(nomeArquivo) === 'jpeg' ? 'jpg' : extensao(nomeArquivo)}`

/** Erros de um item novo/editado. `f`: { nome, category_id, arquivo (.rfa ou .rvt), miniatura }, `existentes`: itens já cadastrados. */
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
  if (!editandoId && !f.arquivo) erros.push('Selecione o arquivo (.rfa ou .rvt).')
  if (f.arquivo && !EXTENSOES_ARQUIVO.includes(extensao(f.arquivo.name))) erros.push('O arquivo deve ser .rfa ou .rvt.')
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
  if (c.icone && !EXTENSOES_ICONE.includes(extensao(c.icone.name))) erros.push('O ícone deve ser PNG, JPG ou SVG.')
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
  familia_ausente: 'Arquivo ausente',
  thumbnail_ausente: 'Miniatura ausente',
  icone_ausente: 'Ícone ausente',
  tamanho_divergente: 'Tamanho diverge',
  familia_sem_miniatura: 'Sem miniatura',
  categoria_sem_icone: 'Sem ícone',
  categoria_vazia: 'Sem famílias',
  arquivo_compartilhado: 'Arquivo compartilhado',
}

export const ROTULO_SITUACAO = { em_uso: 'Em uso', so_publicado: 'Só no publicado', orfao: 'Órfão' }
