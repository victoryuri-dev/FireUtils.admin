import { TIPOS_NOTA } from '../../lib/versoes.js'

// itens: [{ tipo, texto }]. Controlado pelo pai.
export default function EditorNotas({ itens, onChange }) {
  const set = (i, campo, valor) => onChange(itens.map((it, j) => (j === i ? { ...it, [campo]: valor } : it)))
  const mover = (i, d) => {
    const j = i + d
    if (j < 0 || j >= itens.length) return
    const novo = [...itens]
    ;[novo[i], novo[j]] = [novo[j], novo[i]]
    onChange(novo)
  }

  return (
    <div className="notas-editor">
      {itens.map((it, i) => (
        <div className="nota-linha" key={i}>
          <select value={it.tipo} onChange={(e) => set(i, 'tipo', e.target.value)} aria-label="Tipo do item">
            {TIPOS_NOTA.map((t) => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
          <input value={it.texto} maxLength={500} placeholder="Descreva a mudança" onChange={(e) => set(i, 'texto', e.target.value)} />
          <button type="button" className="btn btn-sec" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir">↑</button>
          <button type="button" className="btn btn-sec" onClick={() => mover(i, 1)} disabled={i === itens.length - 1} aria-label="Descer">↓</button>
          <button type="button" className="btn btn-sec" onClick={() => onChange(itens.filter((_, j) => j !== i))} aria-label="Remover">✕</button>
        </div>
      ))}
      <button type="button" className="btn btn-sec" onClick={() => onChange([...itens, { tipo: 'novo', texto: '' }])}>+ Adicionar item</button>
    </div>
  )
}
