import { cn } from "../../lib/utils";

export function StatCard({ title, value, description, icon: Icon, trend, className }) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-zinc-800 rounded-2xl shadow-air p-6 hover:shadow-air-hover transition-shadow duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-2">{value}</p>
          {description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{description}</p>
          )}
          {trend && (
            <div className={cn(
              "text-xs font-medium mt-2",
              trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}>
              {trend.value}
            </div>
          )}
        </div>
        {Icon && (
          <div className="ml-4 p-3 bg-violet-50 dark:bg-violet-900/30 rounded-xl">
            <Icon className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
        )}
      </div>
    </div>
  );
}
