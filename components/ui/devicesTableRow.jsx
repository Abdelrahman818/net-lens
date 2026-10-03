export default function TableRow({ icon, name, type, ip, mac, vendor, status, lastSeen, segment, groupNames = [], selected = false, onSelect }) {
  const statusStyles = {
    online: "bg-[var(--online-bg)] text-[var(--online-text)] border-[var(--online)]/30",
    warning: "bg-[var(--warning-bg)] text-[var(--warning-text)] border-[var(--warning)]/30",
    offline: "bg-[var(--offline-bg)] text-[var(--offline-text)] border-[var(--offline)]/30",
  };

  const dotStyles = {
    online: "bg-[var(--online)]",
    warning: "bg-[var(--warning)]",
    offline: "bg-[var(--offline)]",
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.();
        }
      }}
      className={[
        "grid min-w-[900px] cursor-pointer grid-cols-[40px_2fr_1.7fr_1fr_1.1fr_1.2fr_1fr] items-center border-x border-b border-[var(--border)] px-3 py-3 text-sm text-[var(--text-primary)] transition hover:bg-[var(--surface)]",
        selected ? "bg-[var(--mint-100)]" : "bg-[var(--surface-raised)]",
      ].join(" ")}
    >
      <div className="flex items-center justify-center">
        <span className={`h-2.5 w-2.5 rounded-full ${dotStyles[status] || dotStyles.offline}`}></span>
      </div>

      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--mint-200)] text-[var(--teal-800)]">
          {icon}
        </span>

        <div className="flex flex-col">
          <span className="font-semibold">{name}</span>
          <span className="text-xs capitalize text-[var(--text-muted)]">{type}</span>
        </div>
      </div>

      <div className="flex flex-col font-mono">
        <span className="text-xs font-bold">{ip}</span>
        <span className="text-[11px] text-[var(--text-muted)]">{mac}</span>
      </div>

      <span className="text-xs font-semibold uppercase text-[var(--text-secondary)]">{vendor}</span>

      <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[status] || statusStyles.offline}`}>
        {status}
      </span>

      <span className="font-mono text-xs lowercase text-[var(--text-secondary)]">{lastSeen}</span>

      <span className="text-xs font-semibold text-[var(--teal-800)]">{groupNames.length ? groupNames.join(", ") : segment || "Ungrouped"}</span>
    </div>
  );
}
