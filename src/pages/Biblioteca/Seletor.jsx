import { useRef } from 'react'
import { formatarTamanho } from '../../lib/versoes.js'

// Escolha de um arquivo por clique ou arrastar (sem biblioteca).
export default function Seletor({ rotulo, aceita, arquivo, onArquivo, dica }) {
  const entrada = useRef(null)
  return (
    <div
      className="soltar soltar-mini"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); e.dataTransfer.files[0] && onArquivo(e.dataTransfer.files[0]) }}
      onClick={() => entrada.current?.click()}
    >
      <input ref={entrada} type="file" accept={aceita} hidden onChange={(e) => e.target.files[0] && onArquivo(e.target.files[0])} />
      <strong>{rotulo}</strong>
      <span className="muted">{arquivo ? `${arquivo.name} · ${formatarTamanho(arquivo.size)}` : dica}</span>
    </div>
  )
}
