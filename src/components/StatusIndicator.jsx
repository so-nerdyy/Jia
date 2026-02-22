export default function StatusIndicator({ status, isLoading, error }) {
  return (
    <section className="status" aria-label="Status indicator" aria-live="polite">
      <h2>System Status</h2>
      <p className="status-text">{status}</p>
      {isLoading && <p className="status-loading">Analyzing image…</p>}
      {error && <p className="status-error">{error}</p>}
    </section>
  );
}
