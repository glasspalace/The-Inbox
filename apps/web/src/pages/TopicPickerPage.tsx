import { type CSSProperties, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Topic } from "@parallax/shared";
import { Button, Page } from "../components/ui";
import { apiGet } from "../lib/api";
import { useAppStore } from "../lib/store";

type TopicTileStyle = CSSProperties & { "--delay": string };

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
    <Page title="Topics / choose tension">
      <section className="topic-layout">
        <div className="section-heading">
          <h1>Choose the question you can feel in your teeth.</h1>
          <p>
            Each topic becomes a temporary room. Pick one, and Parallax looks for someone whose
            map bends differently from yours.
          </p>
        </div>

        {error && <p className="text-[var(--color-danger)] mb-4">{error}</p>}

        <div className="topic-grid">
          {topics.map((topic, index) => (
            <button
              key={topic.id}
              type="button"
              className="topic-tile"
              onClick={() => selectTopic(topic)}
              style={{ "--delay": `${index * 90}ms` } as TopicTileStyle}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <p>{topic.question}</p>
            </button>
          ))}
        </div>

        <Button variant="secondary" className="mt-8" onClick={() => navigate("/")}>
          Back home
        </Button>
      </section>
    </Page>
  );
}
