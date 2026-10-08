import { cn } from "../../lib/utils";

export function StatCard({ title, value, description, icon: Icon, trend, className }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2.5 rounded-xl border border-border bg-card px-6 py-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{title}</p>
        {Icon && (
          <span className="grid size-8 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        )}
      </div>
      <p className="tabular text-[28px] font-semibold leading-tight tracking-tight">{value}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {trend && (
        <p className={cn("text-xs font-medium", trend.isPositive ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
          {trend.value}
        </p>
      )}
    </div>
  );
}
