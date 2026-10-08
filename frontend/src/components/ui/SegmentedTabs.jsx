import { cn } from "../../lib/utils";

/** 统一的筛选/分页签样式（与资产页的类别筛选一致） */
export function SegmentedTabs({ tabs, value, onChange, label, className }) {
  return (
    <div role="tablist" aria-label={label} className={cn("flex flex-wrap gap-1.5", className)}>
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
              "inline-flex min-h-9 items-center gap-2 rounded-[7px] px-3.5 text-sm transition-colors",
              active ? "bg-accent font-semibold text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              tab.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden="true" />}
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
