/**
 * Socket.IO event contract (tech plan §3). Client and server import the same
 * typed maps, so event names and payloads can never drift apart.
 *
 * Security invariants (§23):
 * - `word`/`role` travel only via `you:secret` to the owning socket.
 * - `host:fullState` goes only to sockets that proved hostToken ownership.
 */
import type {
  HostAction,
  HostState,
  PublicRoomState,
  RoomConfig,
  SecretPayload,
} from './online';

/** Acknowledgement envelope for request/response events. */
// Default `{}` (not `Record<string, never>`) so `{ ok: true } & T` keeps `ok`
// assignable to `true` when there is no extra payload.
export type Ack<T = object> = (
  res: ({ ok: true } & T) | { ok: false; error: string },
) => void;

export interface ClientToServerEvents {
  'host:create': (
    config: Partial<RoomConfig>,
    ack: Ack<{ roomCode: string; hostToken: string }>,
  ) => void;
  'host:reclaim': (p: { roomCode: string; hostToken: string }, ack: Ack) => void;
  'host:action': (action: HostAction, ack: Ack) => void;

  'player:join': (
    p: { roomCode: string; name: string },
    ack: Ack<{ playerId: string; playerToken: string; roomCode: string }>,
  ) => void;
  'player:rejoin': (
    p: { roomCode: string; playerId: string; playerToken: string },
    ack: Ack<{ groupId: string | null }>,
  ) => void;
  /** groupId null = "Assign me to a group" (auto-balance). */
  'player:pickGroup': (p: { groupId: string | null }, ack: Ack<{ groupId: string }>) => void;
  /** "I've memorised my word" during the reveal phase. */
  'player:ready': () => void;
  /** Current speaker finished their clue (host may also skip via host:action). */
  'game:nextSpeaker': () => void;
  'vote:cast': (p: { targetId: string }, ack: Ack) => void;
  /** Advance own group from elimination to the next round. */
  'group:continue': () => void;
}

export interface ServerToClientEvents {
  'room:state': (state: PublicRoomState) => void;
  'host:fullState': (state: HostState) => void;
  'you:secret': (secret: SecretPayload) => void;
  'room:closed': (p: { reason: string }) => void;
}

/** Per-socket identity, set once a socket authenticates as host or player. */
export interface SocketData {
  roomCode?: string;
  role?: 'host' | 'player';
  playerId?: string;
}
