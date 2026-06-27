import { useNavigate } from "react-router-dom";
import { Button, Page } from "../components/ui";

export function SurveyResultsPage() {
  const navigate = useNavigate();

  return (
    <Page>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        <h1 className="text-2xl font-semibold">You&apos;re ready</h1>
        <p className="text-[var(--color-muted)] max-w-sm">
          Your profile is set. Pick a topic next — we&apos;ll match you with someone who sees it
          differently.
        </p>
        <Button onClick={() => navigate("/topics")}>Choose a topic</Button>
      </div>
    </Page>
  );
}
