import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: string;
  prefixIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", label, hint, error, suffix, prefixIcon, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center rounded-xl border border-slate-200 bg-white shadow-xs transition-all focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
          {prefixIcon && <div className="pl-3 text-slate-400 flex items-center pointer-events-none">{prefixIcon}</div>}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              "w-full bg-transparent px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
              prefixIcon ? "pl-2" : "",
              suffix ? "pr-14" : "",
              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 text-xs font-medium text-slate-400 pointer-events-none bg-slate-50 px-2 py-1 rounded">
              {suffix}
            </div>
          )}
        </div>
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
        {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
