import { useState } from 'react'

// Confirmação de ação destrutiva: o usuário precisa digitar o nome do item.
export default function ConfirmaDigitando({ titulo, nome, rotuloAcao = 'Excluir', onConfirmar, onCancelar }) {
  const [texto, setTexto] = useState('')
  const ok = texto === nome

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label={titulo}>
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault()
          if (ok) onConfirmar()
        }}
      >
        <h2>{titulo}</h2>
        <p>Esta ação não pode ser desfeita. Digite <strong>{nome}</strong> para confirmar.</p>
        <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="modal-acoes">
          <button type="button" className="btn btn-sec" onClick={onCancelar}>Cancelar</button>
          <button type="submit" className="btn btn-perigo" disabled={!ok}>{rotuloAcao}</button>
        </div>
      </form>
    </div>
  )
}
