import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const configurado = Boolean(url && anonKey)

// Somente a anon key no navegador. Privilégios vêm do JWT + RLS + is_admin().
export const supabase = configurado ? createClient(url, anonKey) : null
