import { useEffect } from 'react'

// Confirmação de ação destrutiva: dois botões, sem digitar nada.
// `item` (opcional) é o nome do que será afetado; `mensagem` troca o aviso padrão.
export default function Confirma({ titulo, item, mensagem, rotuloAcao = 'Excluir', onConfirmar, onCancelar }) {
  useEffect(() => {
    const aoTeclar = (e) => e.key === 'Escape' && onCancelar()
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [onCancelar])

  return (
    <div className="modal-fundo" role="dialog" aria-modal="true" aria-label={titulo}>
      <div className="modal">
        <h2>{titulo}</h2>
        {item && <p><strong>{item}</strong></p>}
        <p>{mensagem ?? 'Esta ação não pode ser desfeita.'}</p>
        <div className="modal-acoes">
          {/* Foco no Cancelar: Enter sem querer não confirma uma exclusão. */}
          <button type="button" className="btn btn-sec" autoFocus onClick={onCancelar}>Cancelar</button>
          <button type="button" className="btn btn-perigo" onClick={onConfirmar}>{rotuloAcao}</button>
        </div>
      </div>
    </div>
  )
}
