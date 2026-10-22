import { useState } from 'react'
import {
  MODULOS, SITUACOES, estenderExpiracao, hojeNoBrasil, traduzirErroBanco, validarLicenca,
} from '../../lib/licencas.js'
import { salvarLicenca } from '../../lib/api.js'

export default function LicencaForm({ userId, licenca, modulosUsados, onSalvo, onCancelar }) {
  const hoje = hojeNoBrasil()
  const [f, setF] = useState(
    licenca
      ? { modulo: licenca.modulo, plano: licenca.plano ?? '', situacao: licenca.situacao, inicio_em: licenca.inicio_em, expira_em: licenca.expira_em ?? '' }
      : { modulo: '', plano: '', situacao: 'ativa', inicio_em: hoje, expira_em: '' },
  )
  const [erros, setErros] = useState([])
  const [salvando, setSalvando] = useState(false)

  const set = (campo) => (e) => setF({ ...f, [campo]: e.target.value })
  const estender = (opcao) => setF({ ...f, expira_em: estenderExpiracao(f.expira_em || null, hoje, opcao) })

  async function enviar(e) {
    e.preventDefault()
    const problemas = validarLicenca(f)
    setErros(problemas)
    if (problemas.length) return
    setSalvando(true)
    try {
      await salvarLicenca(userId, f, licenca?.id ?? null)
      onSalvo()
    } catch (ex) {
      setErros([traduzirErroBanco(ex)])
      setSalvando(false)
    }
  }

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label="Licença">
      <form className="modal modal-largo" onSubmit={enviar}>
        <h2>{licenca ? 'Editar licença' : 'Nova licença'}</h2>
        <div className="grade-form">
          <label>
            Módulo
            <select value={f.modulo} onChange={set('modulo')} disabled={Boolean(licenca)}>
              <option value="">Selecione…</option>
              {MODULOS.map((m) => (
                <option key={m.valor} value={m.valor} disabled={!licenca && modulosUsados.includes(m.valor)}>
                  {m.rotulo}{!licenca && modulosUsados.includes(m.valor) ? ' (já existe)' : ''}
                </option>
              ))}
            </select>
          </label>
          <label>
            Situação
            <select value={f.situacao} onChange={set('situacao')}>
              {SITUACOES.map((s) => <option key={s.valor} value={s.valor}>{s.rotulo}</option>)}
            </select>
          </label>
          <label>
            Plano
            <input value={f.plano} onChange={set('plano')} placeholder="Ex.: Anual" maxLength={80} />
          </label>
          <label>
            Início
            <input type="date" value={f.inicio_em} onChange={set('inicio_em')} required />
          </label>
          <label className="coluna-cheia">
            Expiração (vazio = sem término)
            <input type="date" value={f.expira_em} onChange={set('expira_em')} />
          </label>
        </div>
        <div className="atalhos">
          <button type="button" className="btn btn-sec" onClick={() => estender({ dias: 30 })}>+30 dias</button>
          <button type="button" className="btn btn-sec" onClick={() => estender({ anos: 1 })}>+1 ano</button>
          <button type="button" className="btn btn-sec" onClick={() => setF({ ...f, expira_em: '' })}>Sem término</button>
        </div>
        {erros.map((m) => <p key={m} className="aviso erro">{m}</p>)}
        <div className="modal-acoes">
          <button type="button" className="btn btn-sec" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
        </div>
      </form>
    </div>
  )
}
