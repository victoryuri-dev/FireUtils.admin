import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { resumoLicencas } from '../../lib/api.js'
import { MODULOS, rotuloModulo, traduzirErroBanco } from '../../lib/licencas.js'
import { dataBr } from '../../lib/formato.js'

export default function Resumo() {
  const [dados, setDados] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    resumoLicencas().then(setDados).catch((e) => setErro(traduzirErroBanco(e)))
  }, [])

  if (erro) return <p className="aviso erro">{erro}</p>
  if (!dados) return <p className="aviso">Carregando resumo…</p>

  const porModulo = Object.fromEntries(dados.por_modulo.map((m) => [m.modulo, m]))

  return (
    <div className="resumo">
      <div className="cards">
        <div className="card">
          <small>Usuários</small>
          <strong>{dados.total_usuarios}</strong>
        </div>
        {MODULOS.map((m) => (
          <div className="card" key={m.valor}>
            <small>{m.rotulo} (válidas)</small>
            <strong>{(porModulo[m.valor]?.ativas ?? 0) + (porModulo[m.valor]?.teste ?? 0)}</strong>
            {porModulo[m.valor]?.teste > 0 && <em>{porModulo[m.valor].teste} em teste</em>}
          </div>
        ))}
      </div>
      {dados.vencendo.length > 0 && (
        <div className="vencendo">
          <h2>Vencem em até 15 dias</h2>
          <ul>
            {dados.vencendo.map((v) => (
              <li key={`${v.user_id}-${v.modulo}`}>
                <Link to={`/usuarios/${v.user_id}`}>{v.email}</Link>
                <span>{rotuloModulo(v.modulo)} · {dataBr(v.expira_em)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
