import { test } from 'node:test'
import assert from 'node:assert/strict'
import { linhasDoResponsavelTecnico, textoSeguro } from '../src/lib/perfil.js'

test('responsável técnico em objeto vira linhas de texto, só com o que está preenchido', () => {
  const linhas = linhasDoResponsavelTecnico({
    rtBrtCpf: '123', rtNome: 'Fulano', rtEmail: 'f@x', rtEmpresa: '', rtConselho: '9876',
    rtTelefone: '9999', rtConselhoTipo: 'CREA', rtEspecialidade: 'Incêndio',
  })
  assert.deepEqual(linhas, [
    ['Nome', 'Fulano'], ['Conselho', 'CREA 9876'], ['CPF', '123'], ['E-mail', 'f@x'], ['Telefone', '9999'], ['Especialidade', 'Incêndio'],
  ])
  assert.ok(linhas.every(([r, v]) => typeof r === 'string' && typeof v === 'string'))
})

test('vazio, texto antigo e chaves desconhecidas', () => {
  assert.deepEqual(linhasDoResponsavelTecnico(null), [])
  assert.deepEqual(linhasDoResponsavelTecnico(''), [])
  assert.deepEqual(linhasDoResponsavelTecnico({ rtConselhoTipo: '', rtConselho: '' }), [])
  assert.deepEqual(linhasDoResponsavelTecnico('Fulano'), [['Responsável', 'Fulano']])
  assert.deepEqual(linhasDoResponsavelTecnico({ rtNome: 'A', rtNovo: 'x' }), [['Nome', 'A'], ['rtNovo', 'x']])
})

test('textoSeguro nunca devolve objeto', () => {
  assert.equal(textoSeguro(null), '')
  assert.equal(textoSeguro(' a '), 'a')
  assert.equal(textoSeguro(5), '5')
  assert.equal(typeof textoSeguro({ a: 1 }), 'string')
})
