import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "outline";
}

export function Badge({ className, variant = "default", children, ...props }: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-900 text-white",
    secondary: "bg-slate-100 text-slate-800",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-medium",
    warning: "bg-amber-50 text-amber-700 border border-amber-200/60 font-medium",
    danger: "bg-rose-50 text-rose-700 border border-rose-200/60 font-medium",
    outline: "border border-slate-200 text-slate-700",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
