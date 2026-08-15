import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      ref={ref}
      className={cn(
        "flex min-h-[120px] w-full rounded-xl",
        "border border-white/10",
        "bg-white/[0.04]",
        "px-4 py-3",
        "text-sm text-white",
        "placeholder:text-slate-500",
        "resize-none",
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

Textarea.displayName = "Textarea";

export { Textarea };