import { cn } from "../../lib/utils";

export function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-100 dark:bg-zinc-700", className)}
      {...props}
    />
  );
}
