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
    <Page title="After / residue">
      {!submitted ? (
        <section className="ready-screen">
          <h1>Did the room move anything?</h1>
          <p>Rate whether you better understood the other side.</p>
          <div className="answer-stack w-full max-w-xl mb-8">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={`answer-option ${score === n ? "is-selected" : ""}`}
              >
                <span>{n}</span>
                {n === 1 ? "Not at all" : n === 5 ? "Very much" : "Some movement"}
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
        </section>
      ) : (
        <section className="ready-screen">
          <div className="ready-orb" aria-hidden="true" />
          <h1>Signal received.</h1>
          <Button onClick={() => navigate("/topics")}>Talk again</Button>
        </section>
      )}
    </Page>
  );
}
