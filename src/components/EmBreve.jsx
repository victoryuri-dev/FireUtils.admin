export default function EmBreve({ titulo, fase, descricao }) {
  return (
    <section>
      <h1 className="pagina-titulo">{titulo}</h1>
      <div className="vazio">
        <p>{descricao}</p>
        <small>Previsto para a {fase}.</small>
      </div>
    </section>
  )
}
