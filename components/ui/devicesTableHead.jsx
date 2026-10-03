export default function TableHead () {
  return (
    <div className="grid min-w-[900px] grid-cols-[40px_2fr_1.7fr_1fr_1.1fr_1.2fr_1fr] items-center rounded-t-lg border border-[var(--border)] bg-[var(--mint-200)] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
      <span></span>
      <span>device</span>
      <span>address</span>
      <span>vendor</span>
      <span>status</span>
      <span>last seen</span>
      <span>segment</span>
    </div>
  )
}
