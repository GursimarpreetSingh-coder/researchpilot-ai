import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center",
    "whitespace-nowrap rounded-xl",
    "text-sm font-medium",
    "transition-all duration-200",
    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-indigo-500/70",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-r from-indigo-500 to-cyan-500",
          "text-white",
          "shadow-lg shadow-indigo-500/20",
          "hover:scale-[1.02]",
          "hover:shadow-indigo-500/30",
        ],

        primary: [
          "bg-indigo-500 text-white",
          "hover:bg-indigo-400",
          "hover:shadow-lg hover:shadow-indigo-500/20",
        ],

        secondary: [
          "bg-white/[0.07]",
          "border border-white/[0.08]",
          "text-slate-200",
          "hover:bg-white/[0.12]",
        ],

        ghost: [
          "text-slate-400",
          "hover:bg-white/[0.06]",
          "hover:text-white",
        ],

        destructive: [
          "bg-red-500/10",
          "border border-red-500/20",
          "text-red-400",
          "hover:bg-red-500/20",
        ],

        outline: [
          "border border-white/10",
          "bg-transparent",
          "text-slate-200",
          "hover:bg-white/[0.06]",
        ],
      },

      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          buttonVariants({
            variant,
            size,
            className,
          })
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };