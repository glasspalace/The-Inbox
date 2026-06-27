import type { FactCheck } from "@parallax/shared";

const VERDICT_LABELS: Record<string, string> = {
  supported: "Likely supported",
  contradicted: "May be inaccurate",
  mixed: "Mixed evidence",
  unverifiable: "Hard to verify",
};

export function ContextCard({
  factCheck,
  onDismiss,
}: {
  factCheck: FactCheck;
  onDismiss?: () => void;
}) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius)] p-3 text-sm">
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className="text-[var(--color-accent)] font-medium text-xs uppercase tracking-wide">
          Context
        </span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[var(--color-muted)] hover:text-[var(--color-text)] text-xs"
          >
            Dismiss
          </button>
        )}
      </div>
      <p className="text-[var(--color-muted)] italic mb-2">&ldquo;{factCheck.claim}&rdquo;</p>
      <p className="mb-2">
        <span className="font-medium">{VERDICT_LABELS[factCheck.verdict] ?? factCheck.verdict}:</span>{" "}
        {factCheck.summary}
      </p>
      {factCheck.sources.length > 0 && (
        <ul className="space-y-1">
          {factCheck.sources.map((s) => (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-accent)] hover:underline text-xs truncate block"
              >
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
