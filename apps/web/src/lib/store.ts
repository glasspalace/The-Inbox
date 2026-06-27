import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { FactCheck, Topic } from "@parallax/shared";

interface ProfileScores {
  econ: number;
  dipl: number;
  civil: number;
  scty: number;
}

interface AppState {
  sessionId: string | null;
  profile: ProfileScores | null;
  selectedTopic: Topic | null;
  queueId: string | null;
  matchSessionId: string | null;
  roomName: string | null;
  livekitToken: string | null;
  livekitUrl: string | null;
  factChecks: FactCheck[];
  moderationWarning: string | null;
  setSession: (sessionId: string, profile: ProfileScores) => void;
  setSelectedTopic: (topic: Topic | null) => void;
  setQueue: (queueId: string | null) => void;
  setMatch: (payload: {
    sessionId: string;
    roomName: string;
    livekitToken: string;
    livekitUrl: string;
  }) => void;
  addFactCheck: (fc: FactCheck) => void;
  setModerationWarning: (msg: string | null) => void;
  clearMatch: () => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sessionId: null,
      profile: null,
      selectedTopic: null,
      queueId: null,
      matchSessionId: null,
      roomName: null,
      livekitToken: null,
      livekitUrl: null,
      factChecks: [],
      moderationWarning: null,
      setSession: (sessionId, profile) => set({ sessionId, profile }),
      setSelectedTopic: (topic) => set({ selectedTopic: topic }),
      setQueue: (queueId) => set({ queueId }),
      setMatch: (payload) =>
        set({
          matchSessionId: payload.sessionId,
          roomName: payload.roomName,
          livekitToken: payload.livekitToken,
          livekitUrl: payload.livekitUrl,
        }),
      addFactCheck: (fc) =>
        set((s) => ({ factChecks: [fc, ...s.factChecks].slice(0, 10) })),
      setModerationWarning: (msg) => set({ moderationWarning: msg }),
      clearMatch: () =>
        set({
          matchSessionId: null,
          roomName: null,
          livekitToken: null,
          livekitUrl: null,
          factChecks: [],
          moderationWarning: null,
        }),
      reset: () =>
        set({
          sessionId: null,
          profile: null,
          selectedTopic: null,
          queueId: null,
          matchSessionId: null,
          roomName: null,
          livekitToken: null,
          livekitUrl: null,
          factChecks: [],
          moderationWarning: null,
        }),
    }),
    {
      name: "parallax-session",
      partialize: (s) => ({
        sessionId: s.sessionId,
        profile: s.profile,
      }),
    }
  )
);
