import { defineStore } from 'pinia';
import type { HostAction, HostState, PublicRoomState, RoomConfig } from '@arcade/shared';
import { getSocket, request } from '../lib/socket';

const STORAGE_KEY = 'arcade:host';

interface StoredHost {
  roomCode: string;
  hostToken: string;
}

interface OnlineHostState {
  roomCode: string | null;
  hostToken: string | null;
  room: PublicRoomState | null;
  secrets: HostState['secrets'];
  /** LAN join URL shown next to the QR code. */
  joinUrl: string | null;
  error: string;
  closedReason: string | null;
  listening: boolean;
}

function loadStored(): StoredHost | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredHost) : null;
  } catch {
    return null;
  }
}

export const useOnlineHostStore = defineStore('onlineHost', {
  state: (): OnlineHostState => ({
    roomCode: null,
    hostToken: null,
    room: null,
    secrets: null,
    joinUrl: null,
    error: '',
    closedReason: null,
    listening: false,
  }),

  getters: {
    groups: (s) => (s.room ? Object.values(s.room.groups) : []),
    playerById: (s) => {
      const map = new Map((s.room?.players ?? []).map((p) => [p.id, p]));
      return (id: string) => map.get(id);
    },
    unassignedPlayers: (s) => (s.room?.players ?? []).filter((p) => !p.groupId),
  },

  actions: {
    listen() {
      if (this.listening) return;
      this.listening = true;
      const socket = getSocket();
      socket.on('host:fullState', (state) => {
        this.room = state.room;
        this.secrets = state.secrets;
      });
      socket.on('room:closed', ({ reason }) => {
        this.closedReason = reason;
      });
      // The server keeps host state; on transport reconnect just reclaim.
      socket.on('connect', () => {
        if (this.roomCode && this.hostToken) void this.reclaim();
      });
    },

    async create(config: Partial<RoomConfig>) {
      this.listen();
      this.error = '';
      const socket = getSocket();
      const res = await request<{ roomCode: string; hostToken: string }>((ack) =>
        socket.emit('host:create', config, ack),
      );
      this.roomCode = res.roomCode;
      this.hostToken = res.hostToken;
      this.closedReason = null;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(res satisfies StoredHost));
      await this.resolveJoinUrl();
    },

    /** Re-authenticate this browser as the room's admin (tech plan §6.1b). */
    async reclaim(): Promise<boolean> {
      this.listen();
      const stored = this.roomCode && this.hostToken
        ? { roomCode: this.roomCode, hostToken: this.hostToken }
        : loadStored();
      if (!stored) return false;
      const socket = getSocket();
      try {
        await request((ack) => socket.emit('host:reclaim', stored, ack));
        this.roomCode = stored.roomCode;
        this.hostToken = stored.hostToken;
        this.closedReason = null;
        await this.resolveJoinUrl();
        return true;
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
        return false;
      }
    },

    async action(action: HostAction) {
      this.error = '';
      const socket = getSocket();
      try {
        await request((ack) => socket.emit('host:action', action, ack));
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      }
    },

    async endRoom() {
      await this.action({ type: 'endRoom' });
      localStorage.removeItem(STORAGE_KEY);
      this.$reset();
    },

    /**
     * Build the URL students should open. If the host page is already open
     * on a reachable address, reuse it; on localhost, ask the server for a
     * LAN IP and keep the current port (works for dev :5173 and prod :3000).
     */
    async resolveJoinUrl() {
      if (!this.roomCode) return;
      const { hostname, origin, protocol, port } = window.location;
      let base = origin;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        try {
          const res = await fetch('/api/endpoints');
          const data = (await res.json()) as { ips: string[]; port: number };
          const ip = data.ips[0];
          if (ip) base = `${protocol}//${ip}${port ? `:${port}` : ''}`;
        } catch {
          /* keep origin — better than nothing */
        }
      }
      this.joinUrl = `${base}/join/${this.roomCode}`;
    },
  },
});
