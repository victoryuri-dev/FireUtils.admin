import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guarda de segurança: nenhum segredo de serviço pode chegar ao bundle do navegador.
test('.env.example só declara URL e anon key do Supabase', () => {
  const txt = readFileSync(new URL('../.env.example', import.meta.url), 'utf8')
  const vars = txt
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => l.split('=')[0])
  assert.deepEqual(vars, ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])
})
