import type { ReactNode, ButtonHTMLAttributes } from "react";

export function Page({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen p-[var(--spacing-page)] max-w-2xl mx-auto">
      {title && (
        <h1 className="text-2xl font-semibold mb-6 text-[var(--color-text)]">{title}</h1>
      )}
      {children}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const base =
    "px-4 py-2 rounded-[var(--radius)] font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white",
    secondary:
      "bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-muted)]",
    danger: "bg-[var(--color-danger)] text-white hover:opacity-90",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] p-4 ${className}`}
    >
      {children}
    </div>
  );
}
