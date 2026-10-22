import { supabase } from './supabase.js'

// Tudo aqui passa pelo JWT do admin; quem decide é o banco (RLS + is_admin()).

export async function listarUsuarios({ busca = '', filtro = 'todos', pagina = 0, porPagina = 25 }) {
  const { data, error } = await supabase.rpc('admin_listar_usuarios', {
    p_busca: busca,
    p_filtro: filtro,
    p_limite: porPagina,
    p_offset: pagina * porPagina,
  })
  if (error) throw error
  return { linhas: data ?? [], total: data?.[0]?.total ?? 0 }
}

export async function buscarUsuario(userId) {
  const { data, error } = await supabase.rpc('admin_listar_usuarios', { p_user_id: userId, p_limite: 1 })
  if (error) throw error
  return data?.[0] ?? null
}

export async function buscarPerfil(userId) {
  const { data, error } = await supabase
    .from('perfis')
    .select('nome, telefone, responsavel_tecnico')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function resumoLicencas() {
  const { data, error } = await supabase.rpc('admin_resumo_licencas')
  if (error) throw error
  return data
}

export async function salvarLicenca(userId, form, id = null) {
  const campos = {
    modulo: form.modulo,
    plano: (form.plano ?? '').trim(),
    situacao: form.situacao,
    inicio_em: form.inicio_em,
    expira_em: form.expira_em || null,
    atualizado_em: new Date().toISOString(),
  }
  const consulta = id
    ? supabase.from('licencas').update(campos).eq('id', id)
    : supabase.from('licencas').insert({ ...campos, user_id: userId })
  const { error } = await consulta
  if (error) throw error
}

export async function revogarLicenca(id) {
  const { error } = await supabase
    .from('licencas')
    .update({ situacao: 'cancelada', atualizado_em: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

// Chama uma Edge Function com o JWT do admin; erros viram Error com a mensagem do servidor.
export async function chamarFuncao(nome, corpo) {
  const { data, error } = await supabase.functions.invoke(nome, { body: corpo })
  if (error) {
    let mensagem = error.message
    try {
      const resposta = await error.context.json()
      if (resposta?.error) mensagem = resposta.error
    } catch { /* mantém a mensagem genérica */ }
    throw new Error(mensagem)
  }
  return data
}

// Ações do Auth (convidar, link, banir, excluir) vão para a Edge Function.
export const acaoUsuario = (corpo) => chamarFuncao('admin-usuarios', corpo)

export async function listarAuditoria({ pagina = 0, porPagina = 50 }) {
  const { data, error, count } = await supabase
    .from('admin_auditoria')
    .select('*', { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range(pagina * porPagina, pagina * porPagina + porPagina - 1)
  if (error) throw error
  return { linhas: data ?? [], total: count ?? 0 }
}
