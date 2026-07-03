/**
 * Single shared Socket.IO connection. The client always connects to its own
 * origin (tech plan §6.0) — in dev, Vite proxies /socket.io to the server.
 */
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@arcade/shared';

export type ArcadeSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ArcadeSocket | null = null;

export function getSocket(): ArcadeSocket {
  if (!socket) {
    // Polling first, then upgrade to WebSocket. Some mobile carriers, school
    // Wi-Fi and proxies stall the WebSocket handshake instead of failing fast;
    // starting with polling connects immediately and upgrades transparently,
    // so the first request never hangs waiting on a blocked WS upgrade.
    socket = io({ path: '/socket.io', transports: ['polling', 'websocket'] });
  }
  return socket;
}

/** Promise wrapper around an ack-style emit, with a safety timeout. */
export function request<T>(
  emit: (ack: (res: ({ ok: true } & T) | { ok: false; error: string }) => void) => void,
  timeoutMs = 12000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('The server did not respond. Check your connection.')), timeoutMs);
    emit((res) => {
      clearTimeout(timer);
      if (res.ok) {
        const { ok: _ok, ...rest } = res;
        resolve(rest as T);
      } else {
        reject(new Error(res.error));
      }
    });
  });
}
