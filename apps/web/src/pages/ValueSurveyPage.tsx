import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LikertAnswer, SurveyQuestion } from "@parallax/shared";
import { Button, Card, Page } from "../components/ui";
import { apiGet, apiPost } from "../lib/api";
import { useAppStore } from "../lib/store";

const LIKERT_OPTIONS: { value: LikertAnswer; label: string }[] = [
  { value: 1, label: "Strongly Disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly Agree" },
];

export function ValueSurveyPage() {
  const navigate = useNavigate();
  const setSession = useAppStore((s) => s.setSession);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, LikertAnswer>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<{ questions: SurveyQuestion[] }>("/survey/questions")
      .then((d) => setQuestions(d.questions))
      .catch((e) => setError(e.message));
  }, []);

  const current = questions[index];
  const progress = questions.length ? ((index + 1) / questions.length) * 100 : 0;

  const selectAnswer = (value: LikertAnswer) => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: value }));
  };

  const goNext = async () => {
    if (!current || !answers[current.id]) return;
    if (index < questions.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionId, value]) => ({
          questionId,
          value,
        })),
      };
      const result = await apiPost<{
        sessionId: string;
        profile: { econ: number; dipl: number; civil: number; scty: number };
      }>("/survey/submit", payload);
      setSession(result.sessionId, result.profile);
      navigate("/survey/complete");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  if (error && !questions.length) {
    return (
      <Page title="Survey">
        <p className="text-[var(--color-danger)]">{error}</p>
      </Page>
    );
  }

  if (!current) {
    return (
      <Page title="Survey">
        <p className="text-[var(--color-muted)]">Loading questions…</p>
      </Page>
    );
  }

  return (
    <Page title="Value survey">
      <div className="mb-4">
        <div className="h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-[var(--color-muted)] mt-2">
          Question {index + 1} of {questions.length}
        </p>
      </div>

      <Card className="mb-6">
        <p className="text-lg leading-relaxed">{current.text}</p>
      </Card>

      <div className="flex flex-col gap-2 mb-6">
        {LIKERT_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectAnswer(opt.value)}
            className={`text-left px-4 py-3 rounded-[var(--radius)] border transition ${
              answers[current.id] === opt.value
                ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10"
                : "border-[var(--color-border)] hover:border-[var(--color-muted)]"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <p className="text-[var(--color-danger)] text-sm mb-4">{error}</p>}

      <div className="flex gap-3">
        <Button variant="secondary" onClick={goBack} disabled={index === 0}>
          Back
        </Button>
        <Button
          onClick={goNext}
          disabled={!answers[current.id] || loading}
          className="flex-1"
        >
          {loading ? "Saving…" : index === questions.length - 1 ? "Finish" : "Next"}
        </Button>
      </div>
    </Page>
  );
}
