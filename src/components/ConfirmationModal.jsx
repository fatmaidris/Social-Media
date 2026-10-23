import { useEffect, useRef } from 'react';

export default function ConfirmationModal({
  open,
  title,
  description,
  pending = false,
  error = '',
  onCancel,
  onConfirm,
}) {
  const cancelButton = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    cancelButton.current?.focus();
    function closeOnEscape(event) {
      if (event.key === 'Escape' && !pending) onCancel();
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onCancel(); }}>
      <section className="confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-description">
        <p className="eyebrow">PLEASE CONFIRM</p>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-description">{description}</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="confirm-actions">
          <button ref={cancelButton} className="button-secondary" type="button" onClick={onCancel} disabled={pending}>Cancel</button>
          <button className="button-danger" type="button" onClick={onConfirm} disabled={pending}>{pending ? 'Deleting…' : 'Delete'}</button>
        </div>
      </section>
    </div>
  );
}