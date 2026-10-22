import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  compararVersoes, formatarTamanho, interpretarNome, normalizarNotas, sha256Hex, validarNovaVersao,
} from '../src/lib/versoes.js'

test('compararVersoes', () => {
  assert.equal(compararVersoes('3.1.2', '3.1.10'), -1)
  assert.equal(compararVersoes('3.1', '3.1.0'), 0)
  assert.equal(compararVersoes('4', '3.9.9'), 1)
})

test('interpretarNome', () => {
  assert.deepEqual(interpretarNome('FireUtils-Setup-3.1.2.exe'), { tipo: 'instalador', versao: '3.1.2' })
  assert.deepEqual(interpretarNome('FireUtils-Pacote-3.1.3-base-3.1.0.zip'), { tipo: 'pacote', versao: '3.1.3', base: '3.1.0' })
  assert.equal(interpretarNome('FireUtils-Setup-3.1.2-teste.exe'), null)
  assert.equal(interpretarNome('manifest.json'), null)
})

const arq = (name) => ({ name })
const ok = { tipo: 'instalador', versao: '3.2.0', base: '', arquivo: arq('FireUtils-Setup-3.2.0.exe'), assinatura: null }

test('validarNovaVersao: instalador válido e inconsistências', () => {
  const existentes = [{ tipo: 'instalador', versao: '3.1.2' }, { tipo: 'pacote', versao: '9.0.0' }]
  assert.deepEqual(validarNovaVersao(ok, existentes), [])
  assert.match(validarNovaVersao({ ...ok, versao: '3.2.1' }, existentes)[0], /não bate/)
  assert.match(validarNovaVersao({ ...ok, arquivo: arq('setup.exe') }, existentes)[0], /FireUtils-Setup/)
  assert.match(validarNovaVersao({ ...ok, arquivo: null }, existentes)[0], /Selecione/)
})

test('validarNovaVersao: repetida ou menor que a última do mesmo tipo', () => {
  const existentes = [{ tipo: 'instalador', versao: '3.2.0' }, { tipo: 'instalador', versao: '3.10.0' }]
  assert.match(validarNovaVersao(ok, existentes)[0], /Já existe/)
  const menor = { ...ok, versao: '3.5.0', arquivo: arq('FireUtils-Setup-3.5.0.exe') }
  assert.match(validarNovaVersao(menor, existentes)[0], /maior que a última/)
})

test('validarNovaVersao: pacote exige base e .sig com o nome certo', () => {
  const pacote = {
    tipo: 'pacote', versao: '3.2.1', base: '3.2.0',
    arquivo: arq('FireUtils-Pacote-3.2.1-base-3.2.0.zip'),
    assinatura: arq('FireUtils-Pacote-3.2.1-base-3.2.0.zip.sig'),
  }
  assert.deepEqual(validarNovaVersao(pacote, []), [])
  assert.match(validarNovaVersao({ ...pacote, base: '3.1.0' }, [])[0], /base do nome/)
  assert.match(validarNovaVersao({ ...pacote, assinatura: null }, [])[0], /assinatura/)
  assert.match(validarNovaVersao({ ...pacote, assinatura: arq('x.sig') }, [])[0], /deve se chamar/)
})

test('normalizarNotas descarta vazios e valida tipo', () => {
  const r = normalizarNotas([{ tipo: 'novo', texto: ' A ' }, { tipo: 'novo', texto: '  ' }, { tipo: 'x', texto: 'B' }])
  assert.deepEqual(r.notas, [{ tipo: 'novo', texto: 'A' }])
  assert.equal(r.erros.length, 1)
})

test('formatarTamanho e sha256Hex', async () => {
  assert.equal(formatarTamanho(1536), '1.5 KB')
  assert.equal(formatarTamanho(250 * 1024 * 1024), '250 MB')
  const hash = await sha256Hex(new TextEncoder().encode('abc'))
  assert.equal(hash, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
