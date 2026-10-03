export default function SearchBar({ icon, holder, value = "", onChange }) {
  return (
    <label className="relative flex w-full max-w-sm items-center">
      <span className="pointer-events-none absolute left-3 text-[var(--text-muted)]">{icon}</span>
      <input
        type="text"
        placeholder={holder}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 pl-9 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--teal-700)] focus:ring-2 focus:ring-[rgba(39,126,120,0.12)]"
      />
    </label>
  );
}
