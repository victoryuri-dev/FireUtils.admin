import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chaveIcone, chaveMiniatura, chaveRfa, nomeEmUso, problemasPorNome, reordenar, slugify, validarCategoria, validarFamilia,
} from '../src/lib/catalogo.js'

test('slugify igual ao generate_catalog.py', () => {
  assert.equal(slugify('Extintor Portátil - ABC'), 'extintor-portatil-abc')
  assert.equal(slugify('Saída de Emergência'), 'saida-de-emergencia')
  assert.equal(slugify('***'), 'item')
  assert.equal(slugify('Ação ø Ünico'), 'acao-unico')
})

test('chaveRfa não sobrescreve arquivo existente', () => {
  const hash = 'abcdef0123456789'.repeat(4)
  assert.equal(chaveRfa('ext', 'Extintor ABC', hash, new Set()), 'ext/extintor-abc.rfa')
  assert.equal(chaveRfa('ext', 'Extintor ABC', hash, new Set(['ext/extintor-abc.rfa'])), 'ext/extintor-abc-abcdef01.rfa')
})

test('chaves de miniatura e ícone', () => {
  assert.equal(chaveMiniatura('ext', 'Extintor ABC'), 'thumbnails/ext/extintor-abc.png')
  assert.equal(chaveIcone('ext', 'foo.JPEG'), 'icons/ext.jpg')
  assert.equal(chaveIcone('ext', 'foo.png'), 'icons/ext.png')
})

const existentes = [{ id: 'a__extintor-k', nome: 'Extintor K', ordem: 0 }]
const arq = (name) => ({ name })

test('validarFamilia: nome duplicado sem diferenciar maiúsculas, id colidindo, arquivos', () => {
  const ok = { nome: 'Outro', category_id: 'a', rfa: arq('x.rfa'), miniatura: arq('x.png') }
  assert.deepEqual(validarFamilia(ok, existentes), [])
  assert.match(validarFamilia({ ...ok, nome: 'extintor k' }, existentes)[0], /Já existe/)
  assert.match(validarFamilia({ ...ok, nome: 'Extintor-K' }, existentes).join(), /mesmo identificador/)
  assert.deepEqual(validarFamilia({ ...ok, rfa: null }, existentes), ['Selecione o arquivo .rfa.'])
  assert.deepEqual(validarFamilia({ ...ok, rfa: null }, existentes, { editandoId: 'x' }), [])
  assert.match(validarFamilia({ ...ok, rfa: arq('x.zip') }, existentes)[0], /\.rfa/)
  assert.match(validarFamilia({ ...ok, miniatura: arq('x.jpg') }, existentes)[0], /PNG/)
})

test('validarFamilia ao editar ignora a própria família', () => {
  const f = { nome: 'extintor k', category_id: 'a', rfa: null, miniatura: null }
  assert.deepEqual(validarFamilia(f, existentes, { editandoId: 'a__extintor-k' }), [])
})

test('validarCategoria', () => {
  const cats = [{ id: 'alfa', nome: 'Alfa' }]
  assert.deepEqual(validarCategoria({ nome: 'Beta' }, cats), [])
  assert.match(validarCategoria({ nome: 'ALFA' }, cats)[0], /Já existe/)
  assert.match(validarCategoria({ nome: 'Beta', icone: arq('i.gif') }, cats)[0], /PNG ou JPG/)
  assert.equal(nomeEmUso('alfa', cats)?.id, 'alfa')
})

test('reordenar troca vizinhos e só devolve o que mudou', () => {
  const lista = [{ id: 'a', ordem: 0 }, { id: 'b', ordem: 1 }, { id: 'c', ordem: 2 }]
  assert.deepEqual(reordenar(lista, 'b', -1).sort((x, y) => x.id.localeCompare(y.id)), [{ id: 'a', ordem: 1 }, { id: 'b', ordem: 0 }])
  assert.deepEqual(reordenar(lista, 'a', -1), [])
  assert.deepEqual(reordenar(lista, 'c', 1), [])
})

test('problemasPorNome agrupa pelo alvo', () => {
  const m = problemasPorNome([{ alvo: 'K', tipo: 'a' }, { alvo: 'K', tipo: 'b' }, { tipo: 'sem alvo' }])
  assert.equal(m.get('K').length, 2)
  assert.equal(m.size, 1)
})
