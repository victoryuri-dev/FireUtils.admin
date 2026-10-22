import { chaveAnon, supabase, urlSupabase } from './supabase.js'

const caminho = (chave) => chave.split('/').map(encodeURIComponent).join('/')

// supabase-js não informa progresso de upload; XHR informa.
// Sem `upsert`, nunca sobrescreve um arquivo que já exista.
export async function enviarParaBucket(bucket, chave, blob, { upsert = false, aoProgredir } = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Sessão expirada. Entre de novo.')
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${urlSupabase}/storage/v1/object/${bucket}/${caminho(chave)}`)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', chaveAnon)
    xhr.setRequestHeader('x-upsert', upsert ? 'true' : 'false')
    xhr.setRequestHeader('Content-Type', blob.type || 'application/octet-stream')
    xhr.upload.onprogress = (e) => e.lengthComputable && aoProgredir?.(e.loaded / e.total)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve()
      let msg = `Falha no envio de ${chave} (${xhr.status}).`
      try { msg = JSON.parse(xhr.responseText).message || msg } catch { /* mantém */ }
      reject(new Error(msg))
    }
    xhr.onerror = () => reject(new Error(`Falha de rede ao enviar ${chave}.`))
    xhr.send(blob)
  })
}

export async function removerDoBucket(bucket, chaves) {
  const { error } = await supabase.storage.from(bucket).remove(chaves)
  if (error) throw error
}
