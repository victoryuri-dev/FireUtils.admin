import { rotuloNota } from '../../lib/versoes.js'

// Aproxima a página "Atualizações" da dockpane: etiqueta por tipo + texto.
export default function PreviaNotas({ versao, titulo, itens }) {
  const validos = itens.filter((it) => (it.texto ?? '').trim())
  return (
    <div className="previa">
      <small className="muted">Prévia na dockpane</small>
      <h4>{versao || 'X.Y.Z'}{titulo ? ` — ${titulo}` : ''}</h4>
      {validos.length === 0 && <p className="muted">Sem notas.</p>}
      <ul>
        {validos.map((it, i) => (
          <li key={i}><span className={`etiqueta etiqueta-${it.tipo}`}>{rotuloNota(it.tipo)}</span> {it.texto}</li>
        ))}
      </ul>
    </div>
  )
}
