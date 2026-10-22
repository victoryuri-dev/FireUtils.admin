import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { acaoUsuario, buscarPerfil, buscarUsuario, revogarLicenca } from '../../lib/api.js'
import { hojeNoBrasil, rotuloModulo, rotuloSituacao, situacaoEfetiva, traduzirErroBanco } from '../../lib/licencas.js'
import { dataBr, dataHoraBr } from '../../lib/formato.js'
import ConfirmaDigitando from '../../components/ConfirmaDigitando.jsx'
import LicencaForm from './LicencaForm.jsx'

export default function Detalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const hoje = hojeNoBrasil()
  const [usuario, setUsuario] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [form, setForm] = useState(null) // null | { licenca } 
  const [excluindo, setExcluindo] = useState(false)
  const [link, setLink] = useState('')

  const carregar = useCallback(async () => {
    setErro('')
    try {
      const [u, p] = await Promise.all([buscarUsuario(id), buscarPerfil(id)])
      setUsuario(u)
      setPerfil(p)
    } catch (e) {
      setErro(traduzirErroBanco(e))
    } finally {
      setCarregando(false)
    }
  }, [id])

  useEffect(() => { carregar() }, [carregar])

  async function executar(corpo, mensagem) {
    setErro('')
    setAviso('')
    try {
      const r = await acaoUsuario({ ...corpo, user_id: id })
      if (r?.link) setLink(r.link)
      setAviso(mensagem)
      return r
    } catch (e) {
      setErro(e.message)
      return null
    }
  }

  async function revogar(l) {
    setErro('')
    try {
      await revogarLicenca(l.id)
      carregar()
    } catch (e) {
      setErro(traduzirErroBanco(e))
    }
  }

  if (carregando) return <p className="aviso">Carregando…</p>
  if (!usuario) return <p className="aviso erro">{erro || 'Usuário não encontrado.'} <Link to="/usuarios">Voltar</Link></p>

  const usados = usuario.licencas.map((l) => l.modulo)

  return (
    <>
      <p><Link to="/usuarios">← Usuários</Link></p>
      <h2 className="subtitulo">{usuario.email} {usuario.banido && <span className="chip chip-cancelada">Banido</span>}</h2>
      {erro && <p className="aviso erro">{erro}</p>}
      {aviso && <p className="aviso ok">{aviso}</p>}

      <div className="painel">
        <h3>Perfil</h3>
        <dl className="dados">
          <dt>Nome</dt><dd>{perfil?.nome || '—'}</dd>
          <dt>Telefone</dt><dd>{perfil?.telefone || '—'}</dd>
          <dt>Responsável técnico</dt><dd>{perfil?.responsavel_tecnico || '—'}</dd>
          <dt>Criado em</dt><dd>{dataHoraBr(usuario.criado_em)}</dd>
          <dt>Último login</dt><dd>{dataHoraBr(usuario.ultimo_login)}</dd>
        </dl>
      </div>

      <div className="painel">
        <div className="painel-topo">
          <h3>Licenças</h3>
          <button type="button" className="btn btn-primario" disabled={usados.length >= 4} onClick={() => setForm({ licenca: null })}>Nova licença</button>
        </div>
        <table className="tabela">
          <thead><tr><th>Módulo</th><th>Plano</th><th>Situação</th><th>Início</th><th>Expira</th><th /></tr></thead>
          <tbody>
            {usuario.licencas.map((l) => {
              const sit = situacaoEfetiva(l, hoje)
              return (
                <tr key={l.id}>
                  <td>{rotuloModulo(l.modulo)}</td>
                  <td>{l.plano || '—'}</td>
                  <td><span className={`chip chip-${sit}`}>{rotuloSituacao(sit)}</span></td>
                  <td>{dataBr(l.inicio_em)}</td>
                  <td>{l.expira_em ? dataBr(l.expira_em) : 'Sem término'}</td>
                  <td className="acoes-linha">
                    <button type="button" className="btn btn-sec" onClick={() => setForm({ licenca: l })}>Editar</button>
                    {l.situacao !== 'cancelada' && <button type="button" className="btn btn-sec" onClick={() => revogar(l)}>Revogar</button>}
                  </td>
                </tr>
              )
            })}
            {usuario.licencas.length === 0 && <tr><td colSpan="6" className="muted">Sem licenças.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="painel">
        <h3>Conta</h3>
        <div className="acoes-conta">
          <button type="button" className="btn btn-sec" onClick={() => executar({ acao: 'link_redefinicao' }, 'Link de redefinição gerado. Envie ao usuário por um canal seguro.')}>Gerar link de redefinição de senha</button>
          {usuario.banido
            ? <button type="button" className="btn btn-sec" onClick={async () => { if (await executar({ acao: 'desbanir' }, 'Usuário desbanido.')) carregar() }}>Desbanir</button>
            : <button type="button" className="btn btn-sec" onClick={async () => { if (await executar({ acao: 'banir' }, 'Usuário banido.')) carregar() }}>Banir</button>}
          <button type="button" className="btn btn-perigo" onClick={() => setExcluindo(true)}>Excluir usuário</button>
        </div>
        {link && (
          <label className="link-gerado">
            Link de redefinição (válido por tempo limitado)
            <input readOnly value={link} onFocus={(e) => e.target.select()} />
          </label>
        )}
      </div>

      {form && (
        <LicencaForm
          userId={id}
          licenca={form.licenca}
          modulosUsados={usados}
          onCancelar={() => setForm(null)}
          onSalvo={() => { setForm(null); carregar() }}
        />
      )}
      {excluindo && (
        <ConfirmaDigitando
          titulo="Excluir usuário"
          nome={usuario.email}
          onCancelar={() => setExcluindo(false)}
          onConfirmar={async () => {
            setExcluindo(false)
            if (await executar({ acao: 'excluir', confirmacao: usuario.email }, 'Usuário excluído.')) navegar('/usuarios')
          }}
        />
      )}
    </>
  )
}
