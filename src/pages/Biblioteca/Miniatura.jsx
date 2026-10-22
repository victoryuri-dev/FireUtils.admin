import { useState } from 'react'
import { urlPublica } from '../../lib/catalogo.js'

// Imagem do bucket público; se não carrega, mostra o aviso (é sinal de arquivo fantasma).
export default function Miniatura({ chave, versao, nome, grande = false }) {
  const [falhou, setFalhou] = useState(false)
  const classe = `miniatura ${grande ? 'miniatura-grande' : ''}`
  if (!chave) return <div className={`${classe} vazia`} title="Sem miniatura">{(nome ?? '?').slice(0, 1)}</div>
  if (falhou) return <div className={`${classe} quebrada`} title={`Não carrega: ${chave}`}>!</div>
  return <img className={classe} src={urlPublica(chave, versao)} alt={nome ?? ''} loading="lazy" onError={() => setFalhou(true)} />
}
