export default function formatThroughput(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "n/a";

  const units = [
    { threshold: 1_000_000_000, label: "Gbps" },
    { threshold: 1_000_000, label: "Mbps" },
    { threshold: 1_000, label: "Kbps" },
  ];

  const unit = units.find(({ threshold }) => Math.abs(numericValue) >= threshold);
  if (!unit) return `${numericValue.toLocaleString()} bps`;
  return `${(numericValue / unit.threshold).toFixed(2)} ${unit.label}`;
}
