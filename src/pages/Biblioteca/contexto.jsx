import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { carregarRascunho, verificar } from '../../lib/apiCatalogo.js'
import { traduzirErroBanco } from '../../lib/licencas.js'
import { BUCKET_FAMILIAS, problemasPorNome } from '../../lib/catalogo.js'

const Contexto = createContext(null)
export const useBiblioteca = () => useContext(Contexto)

// Rascunho (tabelas) + verificação (Edge Function, que olha os buckets).
// A verificação é mais lenta e pode falhar sozinha (function não publicada),
// então carrega à parte e não trava a edição.
export function BibliotecaProvider({ children }) {
  const [rascunho, setRascunho] = useState(null)
  const [erro, setErro] = useState('')
  const [verificacao, setVerificacao] = useState(null)
  const [verificando, setVerificando] = useState(true)
  const [erroVerificacao, setErroVerificacao] = useState('')

  const recarregar = useCallback(async () => {
    try {
      setRascunho(await carregarRascunho())
      setErro('')
    } catch (e) {
      setErro(traduzirErroBanco(e))
    }
  }, [])

  const reverificar = useCallback(async () => {
    setVerificando(true)
    try {
      setVerificacao(await verificar())
      setErroVerificacao('')
    } catch (e) {
      setErroVerificacao(e.message)
    } finally {
      setVerificando(false)
    }
  }, [])

  // Depois de qualquer mudança: relê as tabelas e refaz a conferência.
  const atualizarTudo = useCallback(() => Promise.all([recarregar(), reverificar()]), [recarregar, reverificar])

  useEffect(() => { atualizarTudo() }, [atualizarTudo])

  const valor = useMemo(() => ({
    categorias: rascunho?.categorias ?? [],
    familias: rascunho?.familias ?? [],
    config: rascunho?.config ?? null,
    carregado: rascunho !== null,
    erro,
    verificacao,
    verificando,
    erroVerificacao,
    problemas: problemasPorNome(verificacao?.problemas ?? []),
    chavesFamilias: new Set((verificacao?.arquivos ?? []).filter((a) => a.bucket === BUCKET_FAMILIAS).map((a) => a.key)),
    chavesAssets: new Set((verificacao?.arquivos ?? []).filter((a) => a.bucket !== BUCKET_FAMILIAS).map((a) => a.key)),
    recarregar,
    reverificar,
    atualizarTudo,
  }), [rascunho, erro, verificacao, verificando, erroVerificacao, recarregar, reverificar, atualizarTudo])

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}
