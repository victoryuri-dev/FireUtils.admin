import { chaveAnon, supabase, urlSupabase } from './supabase.js'
import { nomeDaAssinatura, nomeDoHash } from './versoes.js'

const BUCKET = 'plugin-releases'

export async function listarReleases() {
  const { data, error } = await supabase
    .from('plugin_releases')
    .select('id, versao, tipo, arquivo, base_minima, sha256, tamanho_bytes, titulo, notas, publicada, publicada_em, criada_em')
    .order('criada_em', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function buscarRelease(id) {
  const { data, error } = await supabase.from('plugin_releases').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

// Sempre nasce como rascunho; só vira visível para os clientes ao publicar.
export async function criarRelease(r) {
  const { data, error } = await supabase
    .from('plugin_releases')
    .insert({ ...r, publicada: false })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export async function salvarNotas(id, { titulo, notas }) {
  const { error } = await supabase.from('plugin_releases').update({ titulo, notas }).eq('id', id)
  if (error) throw error
}

export async function definirPublicada(id, publicada) {
  const { error } = await supabase.from('plugin_releases').update({ publicada }).eq('id', id)
  if (error) throw error
}

export function arquivosDaRelease(r) {
  return [r.arquivo, r.tipo === 'pacote' ? nomeDaAssinatura(r.arquivo) : nomeDoHash(r.arquivo)]
}

// Os arquivos que a dockpane vai pedir precisam estar no bucket antes de publicar.
export async function arquivosAusentes(r) {
  const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: 1000, search: r.arquivo })
  if (error) throw error
  const presentes = new Set((data ?? []).map((o) => o.name))
  return arquivosDaRelease(r).filter((nome) => !presentes.has(nome))
}

export async function removerArquivos(nomes) {
  const { error } = await supabase.storage.from(BUCKET).remove(nomes)
  if (error) throw error
}

export async function excluirRascunho(r) {
  const { error } = await supabase.from('plugin_releases').delete().eq('id', r.id)
  if (error) throw error
  await removerArquivos(arquivosDaRelease(r)).catch(() => {})
}

// supabase-js não informa progresso de upload; XHR informa.
// Sem upsert: nunca sobrescreve um arquivo que já exista no bucket.
export async function enviarArquivo(nome, blob, aoProgredir) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Entre de novo.')
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${urlSupabase}/storage/v1/object/${BUCKET}/${encodeURIComponent(nome)}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', chaveAnon)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => e.lengthComputable && aoProgredir?.(e.loaded / e.total)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let msg = `Falha no envio de ${nome} (${xhr.status}).`
      try { msg = JSON.parse(xhr.responseText).message || msg } catch { /* mantém */ }
      reject(new Error(msg))
    }
    xhr.onerror = () => reject(new Error(`Falha de rede ao enviar ${nome}.`))
    xhr.send(blob)
  })
}
