import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type = "text", ...props }, ref) => {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl",
        "border border-white/10",
        "bg-white/[0.04]",
        "px-4 py-2",
        "text-sm text-white",
        "placeholder:text-slate-500",
        "transition-all duration-200",
        "focus:border-indigo-500/60",
        "focus:bg-white/[0.06]",
        "focus:ring-2 focus:ring-indigo-500/20",
        "focus:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";

export { Input };