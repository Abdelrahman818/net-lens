export default function Button({ text, icon, onClick, variant = "primary" }) {
  const styles =
    variant === "primary"
      ? "border-[var(--teal-800)] bg-[var(--teal-800)] text-white hover:bg-[var(--navy-teal-900)]"
      : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text-secondary)] hover:bg-[var(--surface)]";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-10 w-max items-center justify-center gap-2 rounded-lg border px-3.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--teal-700)] ${styles}`}
    >
      <span>{icon}</span>
      <span>{text}</span>
    </button>
  );
}
