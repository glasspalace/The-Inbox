import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { config, hasLiveKit } from "../config.js";

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

  try {
    const roomService = new RoomServiceClient(
      config.livekitUrl,
      config.livekitApiKey,
      config.livekitApiSecret
    );
    await roomService.createRoom({ name: roomName, emptyTimeout: 300, maxParticipants: 2 });
  } catch {
    // Room may already exist
  }

  return { token, url: config.livekitUrl };
}

export function generateRoomName(sessionId: string): string {
  return `parallax-${sessionId}`;
}
