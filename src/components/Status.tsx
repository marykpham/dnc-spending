export function Status({ data, error }: { data?: unknown; error?: string }) {
  if (error) return <p className="error">Couldn't load data: {error}</p>
  if (!data) return <p className="muted">Loading…</p>
  return null
}
