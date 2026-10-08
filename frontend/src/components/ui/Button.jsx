import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

const variants = {
  primary: "border border-primary bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-transparent bg-secondary text-secondary-foreground hover:bg-muted",
  outline: "border border-border bg-card text-foreground hover:bg-muted",
  ghost: "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive: "border border-destructive bg-destructive text-white hover:opacity-90",
};

const sizes = {
  default: "h-10 px-4",
  sm: "h-9 px-3",
  lg: "h-11 px-6",
  icon: "size-10",
};

export function Button({ className, variant = "primary", size = "default", isLoading, children, ...props }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
}
