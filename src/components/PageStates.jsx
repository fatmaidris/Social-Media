export function LoadingState({ label = 'Loading' }) {
  return <div className="state-message" role="status"><span className="loading-dot" />{label}…</div>;
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state-panel state-error" role="alert">
      <strong>That didn’t load.</strong>
      <p>{message}</p>
      {onRetry && <button className="button-secondary" type="button" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function EmptyState({ title, message }) {
  return <div className="state-panel"><span className="empty-mark" aria-hidden="true">✳</span><strong>{title}</strong><p>{message}</p></div>;
}