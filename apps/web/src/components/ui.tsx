import type { ReactNode, ButtonHTMLAttributes } from "react";
import { Link, NavLink } from "react-router-dom";

export function Page({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="app-shell">
      <SiteChrome />
      <main className="page-frame">
        {title && <p className="eyebrow">{title}</p>}
        {children}
      </main>
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
    "action-button disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "action-button--primary",
    secondary: "action-button--secondary",
    danger: "action-button--danger",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`signal-card ${className}`}>
      {children}
    </div>
  );
}

export function SiteChrome() {
  const navItems = [
    { to: "/", label: "Home" },
    { to: "/survey", label: "Questions" },
    { to: "/topics", label: "Topics" },
    { to: "/room", label: "Room" },
  ];

  return (
    <header className="site-chrome">
      <Link to="/" className="brand-mark" aria-label="Parallax home">
        <span className="brand-glyph">P</span>
        <span>Parallax</span>
      </Link>
      <nav className="menu-strip" aria-label="Primary navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `menu-link ${isActive ? "is-active" : ""}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
