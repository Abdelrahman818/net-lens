export default function Opts({ value = "all", onChange, options = ["all", "online", "warning", "offline"] }) {

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Show</span>
      {options.map((option) => {
        const active = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange?.(option)}
            className={[
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
              active
                ? "border-[var(--teal-700)] bg-[var(--mint-100)] text-[var(--teal-800)]"
                : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface)]",
            ].join(" ")}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
