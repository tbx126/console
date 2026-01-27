import { cn } from "../../lib/utils";

export function Badge({ className, variant = "default", children, ...props }) {
  const variants = {
    default: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    primary: "bg-indigo-100 text-indigo-900 hover:bg-indigo-200",
    success: "bg-emerald-100 text-emerald-900 hover:bg-emerald-200",
    warning: "bg-amber-100 text-amber-900 hover:bg-amber-200",
    danger: "bg-rose-100 text-rose-900 hover:bg-rose-200",
    outline: "border border-slate-200 text-slate-900 hover:bg-slate-50",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
