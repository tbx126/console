import { cn } from "../../lib/utils";

/** 分段切换（视图、时间范围、筛选），与资产页类别筛选一致 */
export function SegmentedTabs({ tabs, value, onChange, label, className, size = "md" }) {
  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex flex-wrap gap-0.5 rounded-lg bg-muted p-0.5", className)}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 transition-colors",
              size === "sm" ? "h-6 text-xs" : "h-7 text-[13px]",
              active ? "bg-card font-semibold text-accent-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]" : "text-muted-foreground hover:text-foreground",
              tab.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {Icon && <Icon className="size-3.5" aria-hidden="true" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
