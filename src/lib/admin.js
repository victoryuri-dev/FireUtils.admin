import { supabase } from './supabase.js'

// A decisão final é sempre do banco (is_admin() nas políticas RLS e nas
// Edge Functions). Esta chamada só serve para decidir o que mostrar na tela.
export async function verificarAdmin() {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) return { admin: false, erro: error.message }
  return { admin: data === true, erro: null }
}
