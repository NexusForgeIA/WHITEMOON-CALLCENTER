import type { LucideIcon } from "lucide-react";

export function KpiCard({
  label,
  value,
  icon: Icon,
  accent,
  valueColor,
  hint,
  loading,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: string;
  /** Color del número principal (p. ej. semáforo de saldo). Por defecto hereda. */
  valueColor?: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/50 p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-muted">
          {label}
        </span>
        <Icon
          className="h-4 w-4 text-muted"
          style={accent ? { color: accent } : undefined}
        />
      </div>
      {loading ? (
        <div className="mt-3 h-9 w-16 animate-pulse rounded-md bg-white/[0.06]" />
      ) : (
        <p
          className="mt-3 text-3xl font-semibold tracking-tight tabular-nums"
          style={valueColor ? { color: valueColor } : undefined}
        >
          {value}
        </p>
      )}
      {hint && !loading && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}
