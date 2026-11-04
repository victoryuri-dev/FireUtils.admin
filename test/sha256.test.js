import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash, randomBytes } from 'node:crypto'
import { Sha256, sha256Arquivo } from '../src/lib/sha256.js'

const referencia = (bytes) => createHash('sha256').update(bytes).digest('hex')

test('Sha256 incremental bate com o do Node em vários tamanhos (bordas de bloco e de padding)', () => {
  for (const n of [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 129, 1000, 65537]) {
    const dados = randomBytes(n)
    assert.equal(new Sha256().update(dados).digest(), referencia(dados), `tamanho ${n}`)
  }
})

test('Sha256 incremental com partes de tamanhos irregulares', () => {
  const dados = randomBytes(10_000)
  const sha = new Sha256()
  for (let i = 0, passo = 1; i < dados.length; i += passo, passo = (passo * 7 + 3) % 200 + 1) sha.update(dados.subarray(i, i + passo))
  assert.equal(sha.digest(), referencia(dados))
})

test('vetor conhecido: "abc"', () => {
  assert.equal(new Sha256().update(new TextEncoder().encode('abc')).digest(),
    'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})

test('sha256Arquivo: caminho nativo e por partes dão o mesmo resultado', async () => {
  const dados = randomBytes(3 * 1024 * 1024 + 123)
  const arquivo = new Blob([dados])
  const esperado = referencia(dados)
  assert.equal(await sha256Arquivo(arquivo), esperado)
  const progresso = []
  assert.equal(await sha256Arquivo(arquivo, { limiteNativo: 0, tamanhoParte: 1_000_000, aoProgredir: (p) => progresso.push(p) }), esperado)
  assert.equal(progresso.at(-1), 1)
  assert.ok(progresso.length >= 4)
})
