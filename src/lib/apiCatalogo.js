import { supabase } from './supabase.js'
import { chamarFuncao } from './api.js'

export async function carregarRascunho() {
  const [cats, fams, cfg] = await Promise.all([
    supabase.from('catalogo_categorias').select('*').order('ordem').order('nome'),
    supabase.from('catalogo_familias').select('*').order('ordem').order('nome'),
    supabase.from('catalogo_config').select('*').maybeSingle(),
  ])
  for (const r of [cats, fams, cfg]) if (r.error) throw r.error
  return { categorias: cats.data, familias: fams.data, config: cfg.data }
}

// Conferência, publicação e limpeza passam pela Edge Function (service role).
export const verificar = () => chamarFuncao('admin-catalogo', { acao: 'verificar' })
export const publicarCatalogo = () => chamarFuncao('admin-catalogo', { acao: 'publicar' })
export const importarCatalogo = (sobrescrever = false) => chamarFuncao('admin-catalogo', { acao: 'importar', sobrescrever })
export const removerOrfaos = (itens) => chamarFuncao('admin-catalogo', { acao: 'remover_orfaos', itens })

const ok = ({ error }) => { if (error) throw error }

export const criarCategoria = async (c) => ok(await supabase.from('catalogo_categorias').insert(c))
export const atualizarCategoria = async (id, campos) => ok(await supabase.from('catalogo_categorias').update(campos).eq('id', id))
export const excluirCategoria = async (id) => ok(await supabase.from('catalogo_categorias').delete().eq('id', id))

export const criarFamilia = async (f) => ok(await supabase.from('catalogo_familias').insert(f))
export const atualizarFamilia = async (id, campos) => ok(await supabase.from('catalogo_familias').update(campos).eq('id', id))
export const excluirFamilia = async (id) => ok(await supabase.from('catalogo_familias').delete().eq('id', id))

export const definirIconeTodas = async (chave) => ok(await supabase.from('catalogo_config').update({ todas_icon_key: chave }).eq('id', true))

// Salva uma nova ordem: [{ id, ordem }].
export async function salvarOrdem(tabela, mudancas) {
  const respostas = await Promise.all(mudancas.map((m) => supabase.from(tabela).update({ ordem: m.ordem }).eq('id', m.id)))
  respostas.forEach(ok)
}
