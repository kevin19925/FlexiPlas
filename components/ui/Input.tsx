"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-slate-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "input-base",
            error && "input-error",
            className
          )}
          {...props}
        />
        {error && (
          <span className="text-xs text-red-600 font-medium">{error}</span>
        )}
        {hint && !error && (
          <span className="text-xs text-slate-500">{hint}</span>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
