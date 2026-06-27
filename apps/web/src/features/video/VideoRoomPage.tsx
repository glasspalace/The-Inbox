import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VideoTrack,
  useLocalParticipant,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import type { FactCheck } from "@parallax/shared";
import { apiPost } from "../../lib/api";
import { useAppStore } from "../../lib/store";
import { ContextCard } from "../factcheck/ContextCard";
import { ModerationBanner } from "../../components/ModerationBanner";
import { Button } from "../../components/ui";

interface ChatLine {
  id: string;
  text: string;
  sender: "me" | "system";
}

function VideoTiles() {
  const { localParticipant } = useLocalParticipant();
  const tracks = useTracks([Track.Source.Camera, Track.Source.Microphone]);

  const localVideo = tracks.find(
    (t) => t.participant.identity === localParticipant.identity && t.source === Track.Source.Camera
  );
  const remoteVideo = tracks.find(
    (t) => t.participant.identity !== localParticipant.identity && t.source === Track.Source.Camera
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1 min-h-0">
      <div className="bg-black rounded-[var(--radius)] aspect-video relative overflow-hidden">
        {localVideo ? (
          <VideoTrack trackRef={localVideo} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--color-muted)] text-sm">
            Your camera
          </div>
        )}
        <span className="absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-0.5 rounded">You</span>
      </div>
      <div className="bg-black rounded-[var(--radius)] aspect-video relative overflow-hidden">
        {remoteVideo ? (
          <VideoTrack trackRef={remoteVideo} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--color-muted)] text-sm">
            Waiting for partner...
          </div>
        )}
        <span className="absolute bottom-2 left-2 text-xs bg-black/60 px-2 py-0.5 rounded">
          Partner
        </span>
      </div>
    </div>
  );
}

function RoomControls({
  onSkip,
  onReport,
  onToggleMute,
  onToggleCamera,
  muted,
  cameraOff,
}: {
  onSkip: () => void;
  onReport: () => void;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  muted: boolean;
  cameraOff: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center py-3">
      <Button variant="secondary" onClick={onToggleMute}>
        {muted ? "Unmute" : "Mute"}
      </Button>
      <Button variant="secondary" onClick={onToggleCamera}>
        {cameraOff ? "Camera on" : "Camera off"}
      </Button>
      <Button variant="secondary" onClick={onSkip}>
        Skip
      </Button>
      <Button variant="danger" onClick={onReport}>
        Report
      </Button>
    </div>
  );
}

function RoomInner({ onLeave }: { onLeave: (reason: string) => void }) {
  const sessionId = useAppStore((s) => s.matchSessionId);
  const selectedTopic = useAppStore((s) => s.selectedTopic);
  const userSessionId = useAppStore((s) => s.sessionId);
  const factChecks = useAppStore((s) => s.factChecks);
  const addFactCheck = useAppStore((s) => s.addFactCheck);
  const moderationWarning = useAppStore((s) => s.moderationWarning);
  const setModerationWarning = useAppStore((s) => s.setModerationWarning);
  const { localParticipant } = useLocalParticipant();

  const [messages, setMessages] = useState<ChatLine[]>([
    {
      id: "0",
      text: "You were matched because you see this topic differently. Try to understand their view first.",
      sender: "system",
    },
  ]);
  const [input, setInput] = useState("");
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, factChecks]);

  const sampleFrame = useCallback(async () => {
    if (!sessionId) return;
    const videoEl = document.querySelector("video") as HTMLVideoElement | null;
    if (!videoEl || videoEl.videoWidth === 0) return;

    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 180;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
    if (!base64) return;

    try {
      const result = await apiPost<{ action: string; reason?: string }>("/moderate/frame", {
        sessionId,
        imageBase64: base64,
      });
      if (result.action === "end_session") {
        setModerationWarning(result.reason ?? "Session ended due to moderation");
        onLeave("moderation");
      }
    } catch {
      // ignore frame mod errors
    }
  }, [sessionId, onLeave, setModerationWarning]);

  useEffect(() => {
    frameIntervalRef.current = window.setInterval(sampleFrame, 10000);
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [sampleFrame]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !sessionId || !userSessionId) return;

    try {
      const result = await apiPost<{
        allowed: boolean;
        reason?: string;
        factCheck?: FactCheck;
      }>("/moderate/text", {
        sessionId,
        text,
        senderId: userSessionId,
      });

      if (!result.allowed) {
        setModerationWarning(result.reason ?? "Message blocked");
        return;
      }

      setMessages((m) => [...m, { id: crypto.randomUUID(), text, sender: "me" }]);
      setInput("");

      if (result.factCheck) {
        addFactCheck(result.factCheck);
      }
    } catch (e) {
      setModerationWarning(e instanceof Error ? e.message : "Send failed");
    }
  };

  const toggleMute = async () => {
    await localParticipant.setMicrophoneEnabled(muted);
    setMuted(!muted);
  };

  const toggleCamera = async () => {
    await localParticipant.setCameraEnabled(cameraOff);
    setCameraOff(!cameraOff);
  };

  return (
    <div className="room-shell flex flex-col h-[calc(100vh-2rem)] gap-3">
      <div className="room-topic">
        Discussing: <span className="font-medium">{selectedTopic?.question}</span>
      </div>

      {moderationWarning && <ModerationBanner message={moderationWarning} />}

      <VideoTiles />

      <RoomControls
        onSkip={() => onLeave("skip")}
        onReport={() => onLeave("report")}
        onToggleMute={toggleMute}
        onToggleCamera={toggleCamera}
        muted={muted}
        cameraOff={cameraOff}
      />

      <div className="flex flex-1 min-h-0 gap-3">
        <div className="room-chat flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.sender === "system"
                    ? "text-[var(--color-muted)] italic text-xs"
                    : "text-[var(--color-text)]"
                }
              >
                {m.text}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex gap-2 p-2 border-t border-[var(--color-border)]">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-2 text-sm"
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>
        </div>

        <div className="context-rail w-64 hidden md:flex flex-col gap-2 overflow-y-auto">
          <p className="text-xs text-[var(--color-muted)] uppercase tracking-wide">Context</p>
          {factChecks.length === 0 ? (
            <p className="text-xs text-[var(--color-muted)]">Factual context cards appear here.</p>
          ) : (
            factChecks.map((fc) => <ContextCard key={fc.id} factCheck={fc} />)
          )}
        </div>
      </div>
    </div>
  );
}

export function VideoRoomPage() {
  const navigate = useNavigate();
  const matchSessionId = useAppStore((s) => s.matchSessionId);
  const livekitToken = useAppStore((s) => s.livekitToken);
  const livekitUrl = useAppStore((s) => s.livekitUrl);
  const userSessionId = useAppStore((s) => s.sessionId);
  const clearMatch = useAppStore((s) => s.clearMatch);

  const handleLeave = async (reason: string) => {
    if (matchSessionId) {
      await apiPost("/session/skip", { sessionId: matchSessionId, reason }).catch(() => {});
    }
    clearMatch();
    navigate(reason === "skip" ? "/queue" : "/feedback");
  };

  if (!matchSessionId || !livekitToken || !userSessionId) {
    navigate("/topics");
    return null;
  }

  const serverUrl = livekitUrl || "wss://demo.livekit.cloud";

  if (!livekitUrl) {
    return (
      <div className="p-[var(--spacing-page)] max-w-2xl mx-auto">
        <h1 className="text-xl font-semibold mb-4">Demo mode</h1>
        <p className="text-[var(--color-muted)] mb-4">
          LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in
          apps/api/.env for video. Text chat and matching still work in demo layout.
        </p>
        <DemoRoom onLeave={handleLeave} />
      </div>
    );
  }

  return (
    <div className="p-[var(--spacing-page)] h-screen box-border">
      <LiveKitRoom
        token={livekitToken}
        serverUrl={serverUrl}
        connect
        video
        audio
        onDisconnected={() => handleLeave("skip")}
      >
        <RoomAudioRenderer />
        <RoomInner onLeave={handleLeave} />
      </LiveKitRoom>
    </div>
  );
}

function DemoRoom({ onLeave }: { onLeave: (reason: string) => void }) {
  const selectedTopic = useAppStore((s) => s.selectedTopic);
  const matchSessionId = useAppStore((s) => s.matchSessionId);
  const userSessionId = useAppStore((s) => s.sessionId);
  const factChecks = useAppStore((s) => s.factChecks);
  const addFactCheck = useAppStore((s) => s.addFactCheck);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  const send = async () => {
    const text = input.trim();
    if (!text || !matchSessionId || !userSessionId) return;
    const result = await apiPost<{ allowed: boolean; factCheck?: FactCheck }>("/moderate/text", {
      sessionId: matchSessionId,
      text,
      senderId: userSessionId,
    });
    if (result.allowed) {
      setMessages((m) => [...m, text]);
      if (result.factCheck) addFactCheck(result.factCheck);
    }
    setInput("");
  };

  return (
    <div className="space-y-4">
      <p className="room-topic">Topic: {selectedTopic?.question}</p>
      <div className="room-chat p-3 min-h-[120px] space-y-1 text-sm">
        {messages.map((m, i) => (
          <p key={i}>{m}</p>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border border-[var(--color-border)] rounded px-3 py-2 bg-[var(--color-bg)]"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button onClick={send}>Send</Button>
      </div>
      {factChecks.map((fc) => (
        <ContextCard key={fc.id} factCheck={fc} />
      ))}
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => onLeave("skip")}>
          Skip
        </Button>
        <Button variant="danger" onClick={() => onLeave("report")}>
          Report
        </Button>
      </div>
    </div>
  );
}
