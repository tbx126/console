import { cn } from "../../lib/utils";

/** 带标题行的卡片 */
export function Section({ title, meta, actions, children, className, bodyClassName, id, ...props }) {
  return (
    <section id={id} className={cn("min-w-0 rounded-2xl border border-border bg-card", className)} {...props}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div className="flex min-w-0 items-baseline gap-3">
            {title && <h2 className="m-0 text-base font-semibold">{title}</h2>}
            {meta && <span className="truncate text-sm text-muted-foreground">{meta}</span>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("px-5 pb-4 pt-2.5", bodyClassName)}>{children}</div>
    </section>
  );
}
