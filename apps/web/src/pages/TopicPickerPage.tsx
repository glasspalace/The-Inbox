import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Topic } from "@parallax/shared";
import { Button, Card, Page } from "../components/ui";
import { apiGet } from "../lib/api";
import { useAppStore } from "../lib/store";

export function TopicPickerPage() {
  const navigate = useNavigate();
  const sessionId = useAppStore((s) => s.sessionId);
  const setSelectedTopic = useAppStore((s) => s.setSelectedTopic);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/survey");
      return;
    }
    apiGet<{ topics: Topic[] }>("/topics")
      .then((d) => setTopics(d.topics))
      .catch((e) => setError(e.message));
  }, [sessionId, navigate]);

  const selectTopic = (topic: Topic) => {
    setSelectedTopic(topic);
    navigate("/queue");
  };

  return (
    <Page title="What do you want to talk about?">
      <p className="text-[var(--color-muted)] mb-6">
        Choose a topic. You&apos;ll be matched with someone who holds a different view.
      </p>
      {error && <p className="text-[var(--color-danger)] mb-4">{error}</p>}
      <div className="flex flex-col gap-3">
        {topics.map((topic) => (
          <Card key={topic.id} className="cursor-pointer hover:border-[var(--color-accent)] transition">
            <button
              type="button"
              className="w-full text-left"
              onClick={() => selectTopic(topic)}
            >
              <p className="font-medium">{topic.question}</p>
            </button>
          </Card>
        ))}
      </div>
      <Button variant="secondary" className="mt-6" onClick={() => navigate("/")}>
        Back
      </Button>
    </Page>
  );
}
