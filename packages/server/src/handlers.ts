/**
 * Socket.IO event wiring — TEAM MODE (tech plan §3). Layered delivery:
 * - `room:state`     → everyone in the room (never contains secrets)
 * - `host:fullState` → the `<code>:host` channel only (answer-reveal data)
 * - `you:secret`     → each member socket, on game start and on rejoin
 *                       (every member of a group receives the SAME group word)
 */
import type { Server, Socket } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from '@arcade/shared';
import { normaliseRoomCode } from '@arcade/shared';
import { RoomManager, type Room } from './rooms';
import { RateLimiter } from './rateLimiter';

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

const hostChannel = (code: string) => `${code}:host`;

export function attachHandlers(io: IO): RoomManager {
  const manager = new RoomManager();

  // Rate limiters — keyed by socket IP (trust proxy is set in index.ts).
  // createRoom: max 5 rooms per IP per minute (prevents runaway host spam).
  // playerJoin:  max 30 joins per IP per minute (prevents name-flood).
  const createLimiter = new RateLimiter(5, 60_000);
  const joinLimiter   = new RateLimiter(30, 60_000);
  // Prune stale buckets every 10 minutes so the Map stays small.
  const pruneTimer = setInterval(() => { createLimiter.prune(); joinLimiter.prune(); }, 10 * 60_000);
  pruneTimer.unref(); // don't block process exit

  const broadcast = (room: Room) => {
    io.to(room.code).emit('room:state', manager.publicState(room));
    io.to(hostChannel(room.code)).emit('host:fullState', manager.hostState(room));
  };
  manager.onRoomChanged = broadcast;

  manager.onSecrets = (room) => {
    for (const player of room.players.values()) {
      const secret = manager.secretFor(room, player.id);
      if (secret && player.socketId) io.to(player.socketId).emit('you:secret', secret);
    }
  };

  io.on('connection', (socket: Sock) => {
    /* ── Host ────────────────────────────────────────────────── */

    socket.on('host:create', (config, ack) => {
      const ip = socket.handshake.address;
      if (!createLimiter.check(ip)) {
        return ack({ ok: false, error: `Too many rooms created. Try again in ${createLimiter.retryAfter(ip)}s.` });
      }
      const room = manager.createRoom(config ?? {});
      socket.data = { roomCode: room.code, role: 'host' };
      socket.join(room.code);
      socket.join(hostChannel(room.code));
      ack({ ok: true, roomCode: room.code, hostToken: room.hostToken });
      broadcast(room);
    });

    socket.on('host:reclaim', ({ roomCode, hostToken }, ack) => {
      const room = manager.getRoom(roomCode);
      if (!room) return ack({ ok: false, error: 'Room not found. It may have expired.' });
      if (room.hostToken !== hostToken) return ack({ ok: false, error: 'Invalid host token.' });
      socket.data = { roomCode: room.code, role: 'host' };
      socket.join(room.code);
      socket.join(hostChannel(room.code));
      ack({ ok: true });
      socket.emit('host:fullState', manager.hostState(room));
      socket.emit('room:state', manager.publicState(room));
    });

    socket.on('host:action', (action, ack) => {
      const room = requireHost(socket, manager);
      if (!room) return ack({ ok: false, error: 'Not authorised as host for a room.' });

      let changed = false;
      switch (action.type) {
        case 'startGame':
          if (!manager.startGame(room)) {
            return ack({ ok: false, error: 'Need at least 3 teams with players to start.' });
          }
          changed = true;
          break;
        case 'skipPhase':
          changed = manager.skipPhase(room, action.groupId ?? null);
          break;
        case 'nextRound':
          changed = manager.continueGame(room, action.groupId ?? null, null);
          break;
        case 'restartGame':
          changed = manager.restartGame(room, action.groupId ?? null);
          break;
        case 'updateConfig':
          manager.updateConfig(room, action.config);
          changed = true;
          break;
        case 'endRoom':
          io.to(room.code).emit('room:closed', { reason: 'The host ended the session.' });
          manager.closeRoom(room);
          io.socketsLeave(room.code);
          io.socketsLeave(hostChannel(room.code));
          return ack({ ok: true });
      }
      if (!changed) return ack({ ok: false, error: 'That action is not available right now.' });
      ack({ ok: true });
      broadcast(room);
    });

    /* ── Player ──────────────────────────────────────────────── */

    socket.on('player:join', ({ roomCode, name }, ack) => {
      const ip = socket.handshake.address;
      if (!joinLimiter.check(ip)) {
        return ack({ ok: false, error: `Too many join attempts. Try again in ${joinLimiter.retryAfter(ip)}s.` });
      }
      const room = manager.getRoom(roomCode);
      if (!room) return ack({ ok: false, error: 'Room not found. Check the code with your host.' });
      const player = manager.addPlayer(room, name ?? '');
      if ('error' in player) return ack({ ok: false, error: player.error });

      player.socketId = socket.id;
      socket.data = { roomCode: room.code, role: 'player', playerId: player.id };
      socket.join(room.code);
      // Auto-balance into a team on join (product §6.1) so players don't get
      // stuck in the lobby — they can still switch teams from the player page.
      manager.pickGroup(room, player, null);
      ack({ ok: true, playerId: player.id, playerToken: player.token, roomCode: room.code });
      broadcast(room);
    });

    socket.on('player:rejoin', ({ roomCode, playerId, playerToken }, ack) => {
      const room = manager.getRoom(roomCode);
      const player = room?.players.get(playerId);
      if (!room || !player) return ack({ ok: false, error: 'Session not found. Join again.' });
      if (player.token !== playerToken) return ack({ ok: false, error: 'Invalid session token.' });

      player.socketId = socket.id;
      player.connected = true;
      socket.data = { roomCode: room.code, role: 'player', playerId: player.id };
      socket.join(room.code);
      ack({ ok: true, groupId: player.groupId });
      socket.emit('room:state', manager.publicState(room));
      const secret = manager.secretFor(room, player.id);
      if (secret) socket.emit('you:secret', secret);
      broadcast(room);
    });

    socket.on('player:pickGroup', ({ groupId }, ack) => {
      const ctx = requirePlayer(socket, manager);
      if (!ctx) return ack({ ok: false, error: 'Join a room first.' });
      const result = manager.pickGroup(ctx.room, ctx.player, groupId ?? null);
      if (typeof result !== 'string') return ack({ ok: false, error: result.error });
      ack({ ok: true, groupId: result });
      broadcast(ctx.room);
    });

    socket.on('player:ready', () => {
      const ctx = requirePlayer(socket, manager);
      if (ctx && manager.playerReady(ctx.room, ctx.player.id)) broadcast(ctx.room);
    });

    socket.on('game:nextSpeaker', () => {
      const ctx = requirePlayer(socket, manager);
      if (ctx && manager.advanceSpeaker(ctx.room, ctx.player.id)) broadcast(ctx.room);
    });

    socket.on('vote:cast', ({ targetId }, ack) => {
      const ctx = requirePlayer(socket, manager);
      if (!ctx) return ack({ ok: false, error: 'Join a room first.' });
      const result = manager.castVote(ctx.room, ctx.player.id, targetId);
      if (result !== true) {
        return ack({ ok: false, error: result === false ? 'Vote failed.' : result.error });
      }
      ack({ ok: true });
      broadcast(ctx.room);
    });

    socket.on('group:continue', () => {
      const ctx = requirePlayer(socket, manager);
      if (ctx && manager.continueGame(ctx.room, null, ctx.player.id)) broadcast(ctx.room);
    });

    /* ── Disconnect ──────────────────────────────────────────── */

    socket.on('disconnect', () => {
      const { roomCode, role, playerId } = socket.data;
      if (role !== 'player' || !roomCode || !playerId) return;
      const room = manager.getRoom(roomCode);
      const player = room?.players.get(playerId);
      if (!room || !player) return;
      player.connected = false;
      if (player.socketId === socket.id) player.socketId = null;
      broadcast(room);
    });
  });

  return manager;
}

function requireHost(socket: Sock, manager: RoomManager): Room | null {
  const { roomCode, role } = socket.data;
  if (role !== 'host' || !roomCode) return null;
  return manager.getRoom(normaliseRoomCode(roomCode)) ?? null;
}

function requirePlayer(socket: Sock, manager: RoomManager) {
  const { roomCode, role, playerId } = socket.data;
  if (role !== 'player' || !roomCode || !playerId) return null;
  const room = manager.getRoom(roomCode);
  const player = room?.players.get(playerId);
  return room && player ? { room, player } : null;
}
