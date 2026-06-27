import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Page } from "../components/ui";
import { apiPost } from "../lib/api";
import { useAppStore } from "../lib/store";

export function FeedbackPage() {
  const navigate = useNavigate();
  const matchSessionId = useAppStore((s) => s.matchSessionId);
  const clearMatch = useAppStore((s) => s.clearMatch);
  const [score, setScore] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (matchSessionId && score) {
      await apiPost("/session/feedback", { sessionId: matchSessionId, score }).catch(() => {});
    }
    setSubmitted(true);
    clearMatch();
  };

  return (
    <Page title="Quick feedback">
      {!submitted ? (
        <div className="space-y-6">
          <p className="text-[var(--color-muted)]">
            Did you better understand the other side? (1 = not at all, 5 = very much)
          </p>
          <div className="flex gap-2 justify-center">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={`w-12 h-12 rounded-[var(--radius)] border font-medium ${
                  score === n
                    ? "border-[var(--color-accent)] bg-[var(--color-accent)]/20"
                    : "border-[var(--color-border)]"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <Button onClick={submit} disabled={!score}>
              Submit
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                clearMatch();
                navigate("/topics");
              }}
            >
              Skip
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <p>Thanks for your feedback.</p>
          <Button onClick={() => navigate("/topics")}>Talk again</Button>
        </div>
      )}
    </Page>
  );
}
