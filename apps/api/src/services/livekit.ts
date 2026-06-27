import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { config, hasLiveKit } from "../config.js";

function normalizeLiveKitUrls(rawUrl: string): { apiUrl: string; wsUrl: string } {
  const value = rawUrl.trim();

  if (value.startsWith("ws://")) {
    return { apiUrl: `http://${value.slice(5)}`, wsUrl: value };
  }

  if (value.startsWith("wss://")) {
    return { apiUrl: `https://${value.slice(6)}`, wsUrl: value };
  }

  if (value.startsWith("http://")) {
    return { apiUrl: value, wsUrl: `ws://${value.slice(7)}` };
  }

  if (value.startsWith("https://")) {
    return { apiUrl: value, wsUrl: `wss://${value.slice(8)}` };
  }

  return { apiUrl: `http://${value}`, wsUrl: `ws://${value}` };
}

function getRoomServiceClient(): RoomServiceClient | null {
  if (!hasLiveKit()) {
    return null;
  }

  const { apiUrl } = normalizeLiveKitUrls(config.livekitUrl);
  return new RoomServiceClient(apiUrl, config.livekitApiKey, config.livekitApiSecret);
}

export async function createRoomToken(
  roomName: string,
  participantId: string
): Promise<{ token: string; url: string } | null> {
  if (!hasLiveKit()) {
    return null;
  }

  const at = new AccessToken(config.livekitApiKey, config.livekitApiSecret, {
    identity: participantId,
    ttl: "2h",
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });

  const token = await at.toJwt();
  const { wsUrl } = normalizeLiveKitUrls(config.livekitUrl);
  const roomService = getRoomServiceClient();

  try {
    await roomService?.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 2 });
  } catch {
    // Room may already exist
  }

  return { token, url: wsUrl };
}

export function generateRoomName(sessionId: string): string {
  return `parallax-${sessionId}`;
}

export async function deleteRoom(roomName: string): Promise<void> {
  const roomService = getRoomServiceClient();
  if (!roomService) {
    return;
  }

  try {
    await roomService.deleteRoom(roomName);
  } catch {
    // Room may already be gone
  }
}
