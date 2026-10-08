import { cn } from "../../lib/utils";

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        "flex min-h-20 w-full rounded-[7px] border border-input bg-card px-3 py-2 text-sm text-foreground",
        "placeholder:text-muted-foreground focus:border-ring focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
