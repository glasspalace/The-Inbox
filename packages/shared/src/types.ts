export type Axis = "econ" | "dipl" | "civil" | "scty";

export type LikertAnswer = 1 | 2 | 3 | 4 | 5;

export interface SurveyQuestion {
  id: string;
  text: string;
  axis: Axis;
  weight: number;
  active: boolean;
}

export interface IdeologyProfile {
  sessionId: string;
  econ: number;
  dipl: number;
  civil: number;
  scty: number;
  createdAt: string;
  expiresAt: string;
}

export interface Topic {
  id: string;
  slug: string;
  title: string;
  question: string;
  description: string;
  primaryAxis: Axis;
  active: boolean;
}

export type SessionEndReason = "skip" | "report" | "moderation" | "timeout" | "completed";

export interface Session {
  id: string;
  topicId: string;
  roomName: string;
  startedAt: string;
  endedAt?: string;
  endReason?: SessionEndReason;
}

export type ModerationAction = "allow" | "warn" | "block" | "end_session";

export interface ModerationResult {
  action: ModerationAction;
  confidence: number;
  reason?: string;
}

export type FactVerdict = "supported" | "contradicted" | "mixed" | "unverifiable";

export interface FactSource {
  title: string;
  url: string;
}

export interface FactCheck {
  id: string;
  sessionId: string;
  claim: string;
  verdict: FactVerdict;
  summary: string;
  sources: FactSource[];
  createdAt: string;
}

export interface QueueJoinRequest {
  topicId: string;
  sessionId: string;
}

export interface QueueJoinResponse {
  queueId: string;
}

export interface MatchPayload {
  sessionId: string;
  roomName: string;
  livekitToken: string;
  livekitUrl: string;
  topic: Topic;
  starterQuestion: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface SurveySubmitRequest {
  answers: Array<{ questionId: string; value: LikertAnswer }>;
}

export interface SurveySubmitResponse {
  sessionId: string;
  profile: Omit<IdeologyProfile, "sessionId" | "createdAt" | "expiresAt">;
}
