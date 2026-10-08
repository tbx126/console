import { cn } from "../../lib/utils";

/** 带标题行的紧凑卡片 */
export function Section({ title, meta, actions, children, className, bodyClassName, id, ...props }) {
  return (
    <section id={id} className={cn("min-w-0 rounded-[10px] border border-border bg-card", className)} {...props}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3">
          <div className="flex min-w-0 items-baseline gap-2">
            {title && <h2 className="m-0 text-sm font-semibold">{title}</h2>}
            {meta && <span className="truncate text-xs text-muted-foreground">{meta}</span>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
        </div>
      )}
      <div className={cn("px-4 pb-3 pt-2", bodyClassName)}>{children}</div>
    </section>
  );
}
