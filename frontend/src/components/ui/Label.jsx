import { cn } from "../../lib/utils";

export function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        "text-sm font-medium leading-none text-slate-700 dark:text-zinc-300",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}
