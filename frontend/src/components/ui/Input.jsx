import { cn } from "../../lib/utils";

export function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-8 w-full rounded-[7px] border border-input bg-card px-2.5 text-[13px] text-foreground",
        "placeholder:text-muted-foreground focus:border-ring focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}
