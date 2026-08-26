"use client";

import clsx from "clsx";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.05)]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  title,
  icon,
  description,
  action,
  children,
}: {
  title: string;
  icon?: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-brand-50/60 px-5 py-3">
        <div className="flex items-center gap-2.5">
          {icon && <span className="text-brand-700">{icon}</span>}
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">{title}</h2>
            {description && (
              <p className="text-xs text-zinc-500">{description}</p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

const controlBase =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 " +
  "outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed " +
  "disabled:bg-zinc-100 disabled:text-zinc-500";

export function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label className="text-xs font-medium text-zinc-700">
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-rose-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      className={clsx(controlBase, invalid && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20", className)}
    />
  );
}

export function Select({
  className,
  invalid,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      className={clsx(controlBase, "cursor-pointer", invalid && "border-rose-400", className)}
    >
      {children}
    </select>
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={clsx(controlBase, "resize-y", className)} />;
}

export function Checkbox({
  label,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className={clsx("flex cursor-pointer select-none items-center gap-2.5", className)}>
      <input
        type="checkbox"
        {...props}
        className="h-4 w-4 cursor-pointer rounded border-zinc-300 text-brand-600 accent-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-zinc-700">{label}</span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons + badges                                                    */
/* ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500/40",
  secondary:
    "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 focus-visible:ring-zinc-400/40",
  ghost: "text-zinc-600 hover:bg-zinc-100 focus-visible:ring-zinc-400/40",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/40",
};

export function buttonClass(variant: ButtonVariant = "primary", className?: string) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
    "focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
    buttonVariants[variant],
    className
  );
}

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
}) {
  return (
    <button {...props} className={buttonClass(variant, className)}>
      {children}
    </button>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className ?? "bg-zinc-100 text-zinc-700 ring-zinc-200"
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback states                                                     */
/* ------------------------------------------------------------------ */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        "inline-block animate-spin rounded-full border-2 border-current border-t-transparent",
        className ?? "h-4 w-4"
      )}
      aria-hidden
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {icon && <div className="text-zinc-300">{icon}</div>}
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      {description && <p className="max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
