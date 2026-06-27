export function ModerationBanner({ message }: { message: string }) {
  return (
    <div className="bg-[var(--color-danger)]/20 border border-[var(--color-danger)] text-[var(--color-danger)] px-4 py-2 rounded-[var(--radius)] text-sm">
      {message}
    </div>
  );
}
