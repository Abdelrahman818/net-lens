export function formatRelativeMinutes(minutes) {
  if (minutes === undefined || minutes === null || Number.isNaN(Number(minutes))) return "just now";
  const totalMinutes = Number(minutes);
  if (totalMinutes < 60) return `${Math.max(0, Math.round(totalMinutes))}m ago`;
  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = Math.round(totalMinutes % 60);
  return remainingMinutes === 0 ? `${hours}h ago` : `${hours}h ${remainingMinutes}m ago`;
}
