import { cn } from "../../lib/utils";

export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        "flex h-9 w-full rounded-[10px] border border-input bg-card px-3 text-[15px] text-foreground",
        "placeholder:text-muted-foreground focus:border-ring focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
