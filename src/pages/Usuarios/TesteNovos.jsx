import { useEffect, useState } from 'react'
import { lerConfigTeste, salvarConfigTeste } from '../../lib/api.js'
import { MODULOS, traduzirErroBanco, validarTeste } from '../../lib/licencas.js'

// Teste grátis dado automaticamente a quem se cadastra. Vale só para contas
// novas; mudar aqui não altera licenças já concedidas.
export default function TesteNovos() {
  const [cfg, setCfg] = useState(null)
  const [erros, setErros] = useState([])
  const [aviso, setAviso] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    lerConfigTeste().then(setCfg).catch((e) => setErros([traduzirErroBanco(e)]))
  }, [])

  if (!cfg) return erros.length ? <p className="aviso erro">{erros[0]}</p> : null

  async function salvar(e) {
    e.preventDefault()
    setAviso('')
    const problemas = validarTeste(cfg)
    setErros(problemas)
    if (problemas.length) return
    setSalvando(true)
    try {
      await salvarConfigTeste(cfg)
      setAviso('Salvo. Vale para os próximos cadastros.')
    } catch (ex) {
      setErros([traduzirErroBanco(ex)])
    }
    setSalvando(false)
  }

  return (
    <form className="painel teste-novos" onSubmit={salvar}>
      <div className="painel-topo">
        <h3>Teste grátis para novos usuários</h3>
        <label className="opcao-linha">
          <input type="checkbox" checked={cfg.ativo} onChange={(e) => setCfg({ ...cfg, ativo: e.target.checked })} />
          {cfg.ativo ? 'Ligado' : 'Desligado'}
        </label>
      </div>
      <div className="teste-campos">
        <label>Módulo
          <select value={cfg.modulo} onChange={(e) => setCfg({ ...cfg, modulo: e.target.value })}>
            {MODULOS.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
          </select>
        </label>
        <label>Dias
          <input type="number" min="1" max="90" value={cfg.dias} onChange={(e) => setCfg({ ...cfg, dias: e.target.value })} />
        </label>
        <button type="submit" className="btn btn-primario" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
      </div>
      <p className="aviso">
        Quem se cadastrar recebe uma licença de teste do módulo escolhido, válida por pelo menos esses dias. Não afeta contas que já existem.
      </p>
      {erros.map((m) => <p key={m} className="aviso erro">{m}</p>)}
      {aviso && <p className="aviso ok">{aviso}</p>}
    </form>
  )
}
