import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  diasAte, estenderExpiracao, hojeNoBrasil, situacaoEfetiva, somarAnos, somarDias,
  traduzirErroBanco, validarLicenca, vencendoEm,
} from '../src/lib/licencas.js'

test('hojeNoBrasil usa UTC-3', () => {
  assert.equal(hojeNoBrasil(new Date('2026-10-22T02:30:00Z')), '2026-10-21')
  assert.equal(hojeNoBrasil(new Date('2026-10-22T03:00:00Z')), '2026-10-22')
})

test('somarDias e somarAnos', () => {
  assert.equal(somarDias('2026-12-20', 30), '2027-01-19')
  assert.equal(somarAnos('2026-10-22', 1), '2027-10-22')
  assert.equal(somarAnos('2028-02-29', 1), '2029-02-28')
  assert.equal(diasAte('2026-10-27', '2026-10-22'), 5)
})

test('situacaoEfetiva marca expirada só para ativa/teste vencida', () => {
  const hoje = '2026-10-22'
  assert.equal(situacaoEfetiva({ situacao: 'ativa', expira_em: '2026-10-21' }, hoje), 'expirada')
  assert.equal(situacaoEfetiva({ situacao: 'teste', expira_em: '2026-10-22' }, hoje), 'teste')
  assert.equal(situacaoEfetiva({ situacao: 'ativa', expira_em: null }, hoje), 'ativa')
  assert.equal(situacaoEfetiva({ situacao: 'cancelada', expira_em: '2020-01-01' }, hoje), 'cancelada')
})

test('vencendoEm', () => {
  const hoje = '2026-10-22'
  assert.equal(vencendoEm({ situacao: 'ativa', expira_em: '2026-11-06' }, hoje), true)
  assert.equal(vencendoEm({ situacao: 'ativa', expira_em: '2026-11-07' }, hoje), false)
  assert.equal(vencendoEm({ situacao: 'ativa', expira_em: '2026-10-21' }, hoje), false)
  assert.equal(vencendoEm({ situacao: 'suspensa', expira_em: '2026-10-25' }, hoje), false)
})

test('estenderExpiracao parte da expiração vigente ou de hoje', () => {
  const hoje = '2026-10-22'
  assert.equal(estenderExpiracao('2026-11-01', hoje, { dias: 30 }), '2026-12-01')
  assert.equal(estenderExpiracao('2026-01-01', hoje, { dias: 30 }), '2026-11-21')
  assert.equal(estenderExpiracao(null, hoje, { anos: 1 }), '2027-10-22')
})

test('validarLicenca', () => {
  const ok = { modulo: 'pro', situacao: 'ativa', inicio_em: '2026-10-01', expira_em: '2027-10-01', plano: 'Anual' }
  assert.deepEqual(validarLicenca(ok), [])
  assert.deepEqual(validarLicenca({ ...ok, expira_em: null }), [])
  assert.equal(validarLicenca({ ...ok, expira_em: '2026-09-30' }).length, 1)
  assert.equal(validarLicenca({ ...ok, modulo: 'x', inicio_em: '' }).length, 2)
})

test('traduzirErroBanco', () => {
  assert.match(traduzirErroBanco({ code: '23505' }), /já tem uma licença/)
  assert.match(traduzirErroBanco({ code: '23514' }), /anterior ao início/)
  assert.equal(traduzirErroBanco({ message: 'x' }), 'x')
})
