/** Formatea segundos como "Xm SSs" o "Ss". */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0s";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

/** Porcentaje entero de value/total; "—" si no hay base. */
export function formatPercent(value: number, total: number): string {
  if (total <= 0) return "—";
  return `${Math.round((value / total) * 100)}%`;
}
