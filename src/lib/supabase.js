import { createClient } from '@supabase/supabase-js'

export const urlSupabase = import.meta.env.VITE_SUPABASE_URL
export const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(urlSupabase && chaveAnon)

// Somente a anon key no navegador. Privilégios vêm do JWT + RLS + is_admin().
export const supabase = configurado ? createClient(urlSupabase, chaveAnon) : null
