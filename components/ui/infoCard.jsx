export default function InfoCard ({ lableColor="#277E78", title, icon, number, lable }) {
  return (
    <div
      className="min-w-0 rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 shadow-[0_8px_24px_rgba(23,63,67,0.05)] transition hover:border-[var(--border-soft)]"
      style={{ borderLeft: `4px solid ${lableColor}` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{ title }</div>
        <div className="rounded-lg bg-[var(--mint-200)] p-2 text-[var(--teal-800)]">{ icon }</div>
      </div>

      <div className="mt-4 flex items-end gap-3">
        <div className="text-3xl font-bold leading-none text-[var(--text-primary)]">{ number }</div>
        <div className="pb-0.5 text-sm font-medium text-[var(--text-secondary)]">{ lable }</div>
      </div>
    </div>
  )
}
