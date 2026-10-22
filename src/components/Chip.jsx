import { rotuloModulo, rotuloSituacao, situacaoEfetiva } from '../lib/licencas.js'
import { dataBr } from '../lib/formato.js'

export default function ChipLicenca({ licenca, hoje }) {
  const sit = situacaoEfetiva(licenca, hoje)
  const validade = licenca.expira_em ? `até ${dataBr(licenca.expira_em)}` : 'sem término'
  return (
    <span className={`chip chip-${sit}`} title={`${rotuloSituacao(sit)} · ${validade}`}>
      <strong>{rotuloModulo(licenca.modulo)}</strong> {rotuloSituacao(sit)} · {validade}
    </span>
  )
}
