import { useNavigate } from "react-router-dom";
import { InteractiveStage } from "../components/InteractiveStage";
import { Button, SiteChrome } from "../components/ui";
import { useAppStore } from "../lib/store";

const WINDOWS = [
  { label: "Question", className: "window-a" },
  { label: "Counterview", className: "window-b" },
  { label: "Context", className: "window-c" },
  { label: "Room", className: "window-d" },
];

const STEPS = [
  ["01", "Answer the pressure-test", "A short values scan builds a rough silhouette of how you read civic tradeoffs."],
  ["02", "Pick a live question", "Choose the tension you actually want to sit inside, not a generic debate prompt."],
  ["03", "Enter the room", "Parallax opens a moderated video space with context cards ready in the wings."],
];

export function LandingPage() {
  const navigate = useNavigate();
  const sessionId = useAppStore((s) => s.sessionId);

  const start = () => navigate(sessionId ? "/topics" : "/survey");

  return (
    <div className="home-canvas">
      <SiteChrome />
      <InteractiveStage density={58} />
      <section className="hero-scene" onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty("--my", `${event.clientY - rect.top}px`);
      }}>
        <div className="hero-copy">
          <p className="eyebrow">Anonymous video rooms for difficult opinions</p>
          <h1>Parallax</h1>
          <p className="hero-kicker">
            Talk to someone standing on the other side of a real question. No feed, no pile-on,
            no infinite thread. Just a room, a counterview, and enough context to stay honest.
          </p>
          <div className="hero-actions">
            <Button onClick={start}>{sessionId ? "Open topics" : "Begin questions"}</Button>
            {sessionId && (
              <Button variant="secondary" onClick={() => navigate("/survey")}>
                Recalibrate
              </Button>
            )}
          </div>
        </div>

        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit-ring" />
          <div className="orbit-core" />
          {WINDOWS.map((window) => (
            <div key={window.label} className={`pixel-window ${window.className}`}>
              <span>{window.label}</span>
              <i />
            </div>
          ))}
        </div>

      </section>

      <section className="process-section" id="questions">
        <div className="section-heading">
          <p className="eyebrow">Questions section</p>
          <h2>The front door is a moving instrument.</h2>
        </div>
        <div className="process-grid">
          {STEPS.map(([number, title, body]) => (
            <article className="process-panel" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="room-entry" id="room">
        <div className="room-poster" aria-hidden="true">
          <div className="scanline-face" />
          <div className="doorway-pulse" />
        </div>
        <div>
          <p className="eyebrow">How to enter the room</p>
          <h2>Pass through the survey, choose a live tension, then wait for the match pulse.</h2>
          <p>
            The queue becomes the airlock. When a match arrives, the interface collapses into a
            video room with moderation, factual context, and an exit that never traps you.
          </p>
          <Button onClick={start}>{sessionId ? "Choose a tension" : "Start the scan"}</Button>
        </div>
      </section>
    </div>
  );
}
