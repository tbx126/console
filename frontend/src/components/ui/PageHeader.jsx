import { cn } from "../../lib/utils";

/** 紧凑页头：标题 + 视图切换/状态（同一行）+ 右侧操作 */
export function PageHeader({ title, meta, children, actions, className }) {
  return (
    <header className={cn("flex flex-wrap items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
        <h1 className="page-title">{title}</h1>
        {children}
        {meta && <span className="page-meta">{meta}</span>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </header>
  );
}
