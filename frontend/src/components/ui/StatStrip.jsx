import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";
import { Skeleton } from "./Skeleton";

/** 一张卡片内横排多个指标，替代多张独立的统计卡 */
export function StatStrip({ items, loading, className, label }) {
  return (
    <section
      aria-label={label}
      className={cn("grid overflow-hidden rounded-2xl border border-border bg-card", className)}
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
    >
      {items.map((item) => {
        const body = (
          <>
            <span className="text-sm text-muted-foreground">{item.label}</span>
            {loading ? (
              <Skeleton className="my-0.5 h-7 w-24" />
            ) : (
              <strong className="tabular text-[22px] font-semibold leading-tight tracking-tight">{item.value}</strong>
            )}
            {item.hint && <span className="truncate text-sm text-muted-foreground">{item.hint}</span>}
          </>
        );
        const cls = "flex min-w-0 flex-col gap-1 border-r border-b border-border px-5 py-3.5 -mb-px";
        return item.to ? (
          <Link key={item.label} to={item.to} className={cn(cls, "text-foreground hover:bg-muted")}>
            {body}
          </Link>
        ) : (
          <div key={item.label} className={cls}>
            {body}
          </div>
        );
      })}
    </section>
  );
}
