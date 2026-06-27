import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MatchPayload } from "@parallax/shared";
import { Button, Page } from "../../components/ui";
import { getWsUrl } from "../../lib/api";
import { useAppStore } from "../../lib/store";

export function useMatchQueue() {
  const sessionId = useAppStore((s) => s.sessionId);
  const selectedTopic = useAppStore((s) => s.selectedTopic);
  const setQueue = useAppStore((s) => s.setQueue);
  const setMatch = useAppStore((s) => s.setMatch);
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"idle" | "connecting" | "waiting" | "matched" | "timeout" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const queueIdRef = useRef<string | null>(null);

  const cancel = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && queueIdRef.current) {
      wsRef.current.send(JSON.stringify({ type: "queue:leave", queueId: queueIdRef.current }));
    }
    wsRef.current?.close();
    wsRef.current = null;
    queueIdRef.current = null;
    setQueue(null);
    setStatus("idle");
  }, [setQueue]);

  const join = useCallback(() => {
    if (!sessionId || !selectedTopic) return;

    setStatus("connecting");
    setError(null);

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "queue:join",
          topicId: selectedTopic.id,
          sessionId,
        })
      );
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string) as {
        type: string;
        queueId?: string;
        error?: string;
        sessionId?: string;
        roomName?: string;
        livekitToken?: string;
        livekitUrl?: string;
        topic?: MatchPayload["topic"];
      };

      if (msg.type === "queue:waiting" && msg.queueId) {
        queueIdRef.current = msg.queueId;
        setQueue(msg.queueId);
        setStatus("waiting");
      }

      if (msg.type === "queue:matched" && msg.sessionId && msg.roomName && msg.livekitToken) {
        setMatch({
          sessionId: msg.sessionId,
          roomName: msg.roomName,
          livekitToken: msg.livekitToken,
          livekitUrl: msg.livekitUrl ?? "",
        });
        setStatus("matched");
      }

      if (msg.type === "queue:timeout") {
        setStatus("timeout");
      }

      if (msg.type === "error") {
        setError(msg.error ?? "Queue error");
        setStatus("error");
      }
    };

    ws.onerror = () => {
      setError("Connection failed");
      setStatus("error");
    };
  }, [sessionId, selectedTopic, setQueue, setMatch]);

  useEffect(() => () => cancel(), [cancel]);

  return { status, error, join, cancel, selectedTopic };
}

export function QueueScreen() {
  const navigate = useNavigate();
  const { status, error, join, cancel, selectedTopic } = useMatchQueue();

  useEffect(() => {
    if (!selectedTopic) {
      navigate("/topics");
      return;
    }
    join();
  }, [selectedTopic, navigate, join]);

  useEffect(() => {
    if (status === "matched") {
      navigate("/room");
    }
  }, [status, navigate]);

  return (
    <Page>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
        {status === "waiting" || status === "connecting" ? (
          <>
            <div className="w-10 h-10 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
            <p className="text-lg">
              Finding someone with a different view on{" "}
              <span className="font-medium">{selectedTopic?.question}</span>…
            </p>
          </>
        ) : status === "timeout" ? (
          <>
            <p className="text-[var(--color-muted)]">No match found yet. Try another topic?</p>
            <Button onClick={() => navigate("/topics")}>Choose different topic</Button>
          </>
        ) : status === "error" ? (
          <>
            <p className="text-[var(--color-danger)]">{error}</p>
            <Button onClick={() => navigate("/topics")}>Back to topics</Button>
          </>
        ) : null}
        {(status === "waiting" || status === "connecting") && (
          <Button variant="secondary" onClick={() => { cancel(); navigate("/topics"); }}>
            Cancel
          </Button>
        )}
      </div>
    </Page>
  );
}
