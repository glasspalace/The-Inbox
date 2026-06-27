import { useNavigate } from "react-router-dom";
import { Button, Page } from "../components/ui";
import { useAppStore } from "../lib/store";

export function LandingPage() {
  const navigate = useNavigate();
  const sessionId = useAppStore((s) => s.sessionId);

  return (
    <Page>
      <div className="flex flex-col items-center justify-center min-h-[80vh] text-center gap-6">
        <h1 className="text-4xl font-bold tracking-tight">Parallax</h1>
        <p className="text-[var(--color-muted)] max-w-md text-lg">
          Talk with someone who sees the world differently. Video conversations on topics you
          choose — matched with an opposing view.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button onClick={() => navigate(sessionId ? "/topics" : "/survey")}>
            {sessionId ? "Talk again" : "Start conversation"}
          </Button>
          {sessionId && (
            <Button variant="secondary" onClick={() => navigate("/survey")}>
              Retake survey
            </Button>
          )}
        </div>
        <p className="text-xs text-[var(--color-muted)] max-w-sm">
          Anonymous · AI-moderated · Factual context powered by Exa
        </p>
      </div>
    </Page>
  );
}
