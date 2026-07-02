import { defineStore } from 'pinia';
import type {
  GameMode,
  LocalPhase,
  PublicGroupState,
  PublicPlayer,
  PublicRoomState,
  Role,
  SecretPayload,
  Winner,
} from '@arcade/shared';
import { getSocket, request } from '../lib/socket';

const STORAGE_KEY = 'arcade:player';

interface StoredPlayer {
  roomCode: string;
  playerId: string;
  playerToken: string;
  name: string;
}

interface OnlinePlayerState {
  roomCode: string | null;
  playerId: string | null;
  playerToken: string | null;
  name: string;
  room: PublicRoomState | null;
  secret: SecretPayload | null;
  /** team: target group id; groups: target member id (first vote locks). */
  myVote: string | null;
  error: string;
  closedReason: string | null;
  listening: boolean;
}

function loadStored(): StoredPlayer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredPlayer) : null;
  } catch {
    return null;
  }
}

export const useOnlinePlayerStore = defineStore('onlinePlayer', {
  state: (): OnlinePlayerState => ({
    roomCode: null,
    playerId: null,
    playerToken: null,
    name: '',
    room: null,
    secret: null,
    myVote: null,
    error: '',
    closedReason: null,
    listening: false,
  }),

  getters: {
    me(): PublicPlayer | null {
      return this.room?.players.find((p) => p.id === this.playerId) ?? null;
    },
    myGroup(): PublicGroupState | null {
      const gid = this.me?.groupId;
      return gid && this.room ? this.room.groups[gid] ?? null : null;
    },
    groupMembers(): PublicPlayer[] {
      const gid = this.me?.groupId;
      return gid ? (this.room?.players ?? []).filter((p) => p.groupId === gid) : [];
    },
    playerById(): (id: string) => PublicPlayer | undefined {
      const map = new Map((this.room?.players ?? []).map((p) => [p.id, p]));
      return (id: string) => map.get(id);
    },
    hasSession: (s) => !!(s.roomCode && s.playerId && s.playerToken),
    mode: (s): GameMode | null => s.room?.config.mode ?? null,

    /* mode-aware game state (team reads room-level, groups reads my group) */
    phase(): LocalPhase | null {
      if (!this.room) return null;
      return this.mode === 'team' ? this.room.phase : this.myGroup?.phase ?? null;
    },
    round(): number {
      if (!this.room) return 0;
      return this.mode === 'team' ? this.room.round : this.myGroup?.round ?? 0;
    },
    phaseEndsAt(): number | null {
      if (!this.room) return null;
      return this.mode === 'team' ? this.room.phaseEndsAt : this.myGroup?.phaseEndsAt ?? null;
    },
    isRunoffVote(): boolean {
      if (!this.room) return false;
      return this.mode === 'team' ? this.room.isRunoffVote : this.myGroup?.isRunoffVote ?? false;
    },
    iHaveMemorised(): boolean {
      const me = this.me;
      return !!(me && this.myGroup?.readyMemberIds.includes(me.id));
    },
    /** Speaking order as labelled seats (team: groups; groups: members). */
    speakOrder(): { id: string; name: string }[] {
      if (!this.room) return [];
      const ids = this.mode === 'team' ? this.room.speakingOrder : this.myGroup?.speakingOrder ?? [];
      return ids.map((id) => ({ id, name: this.nameOf(id) }));
    },
    isMyTurn(): boolean {
      const me = this.me;
      if (!me || !this.room) return false;
      return this.mode === 'team'
        ? this.room.currentSpeakerGroupId === me.groupId
        : this.myGroup?.currentSpeakerId === me.id;
    },
    myAlive(): boolean {
      if (!this.room) return false;
      return this.mode === 'team' ? this.myGroup?.alive ?? false : this.me?.alive ?? false;
    },
    votesIn(): number {
      if (!this.room) return 0;
      return this.mode === 'team' ? this.room.votesIn : this.myGroup?.votesIn ?? 0;
    },
    votersTotal(): number {
      if (!this.room) return 0;
      return this.mode === 'team' ? this.room.votersTotal : this.myGroup?.votersTotal ?? 0;
    },
    canIVote(): boolean {
      return this.phase === 'vote' && this.myAlive && this.myVote === null;
    },
    voteTargets(): { id: string; name: string }[] {
      if (!this.room || this.phase !== 'vote') return [];
      if (this.mode === 'team') {
        const myGid = this.me?.groupId;
        return Object.values(this.room.groups)
          .filter((g) => g.alive && g.id !== myGid)
          .map((g) => ({ id: g.id, name: g.name }));
      }
      const g = this.myGroup;
      if (!g) return [];
      return (this.room.players ?? [])
        .filter((p) => p.groupId === g.id && p.alive && p.id !== this.playerId)
        .map((p) => ({ id: p.id, name: p.name }));
    },
    winner(): Winner | null {
      if (!this.room) return null;
      return this.mode === 'team' ? this.room.winner : this.myGroup?.winner ?? null;
    },
    eliminated(): { id: string; role: Role } | null {
      if (!this.room) return null;
      if (this.mode === 'team') {
        return this.room.lastElimination
          ? { id: this.room.lastElimination.groupId, role: this.room.lastElimination.role }
          : null;
      }
      const e = this.myGroup?.lastElimination;
      return e ? { id: e.playerId, role: e.role } : null;
    },
    undercoverId(): string | null {
      const roles = this.mode === 'team' ? this.room?.revealedRoles : this.myGroup?.revealedRoles;
      if (!roles) return null;
      return Object.keys(roles).find((id) => roles[id] === 'undercover') ?? null;
    },
    civiliansWin(): boolean {
      return this.winner === 'civilians';
    },
    civilianWord(): string | null {
      if (!this.room) return null;
      return this.mode === 'team' ? this.room.civilianWord : this.myGroup?.civilianWord ?? null;
    },
    undercoverWord(): string | null {
      if (!this.room) return null;
      return this.mode === 'team' ? this.room.undercoverWord : this.myGroup?.undercoverWord ?? null;
    },
    /** team: group display name; groups: member name. */
    nameOf(): (id: string) => string {
      if (this.mode === 'team') {
        return (id: string) => this.room?.groups[id]?.name ?? id;
      }
      return (id: string) => this.playerById(id)?.name ?? '—';
    },
  },

  actions: {
    listen() {
      if (this.listening) return;
      this.listening = true;
      const socket = getSocket();
      socket.on('room:state', (state) => {
        const prevPhase = this.phase;
        this.room = state;
        // A new ballot (or any non-vote phase) clears the local vote echo.
        if (this.phase !== 'vote' || prevPhase !== 'vote') this.myVote = null;
      });
      socket.on('you:secret', (secret) => {
        this.secret = secret;
      });
      socket.on('room:closed', ({ reason }) => {
        this.closedReason = reason;
        localStorage.removeItem(STORAGE_KEY);
      });
      socket.on('connect', () => {
        if (this.hasSession) void this.rejoin();
      });
    },

    async join(roomCode: string, name: string) {
      this.listen();
      this.error = '';
      const socket = getSocket();
      const res = await request<{ playerId: string; playerToken: string; roomCode: string }>(
        (ack) => socket.emit('player:join', { roomCode, name }, ack),
      );
      this.roomCode = res.roomCode;
      this.playerId = res.playerId;
      this.playerToken = res.playerToken;
      this.name = name;
      this.closedReason = null;
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ ...res, name } satisfies StoredPlayer),
      );
    },

    async rejoin(): Promise<boolean> {
      this.listen();
      const stored = this.hasSession
        ? {
            roomCode: this.roomCode!,
            playerId: this.playerId!,
            playerToken: this.playerToken!,
            name: this.name,
          }
        : loadStored();
      if (!stored) return false;
      const socket = getSocket();
      try {
        await request((ack) =>
          socket.emit(
            'player:rejoin',
            { roomCode: stored.roomCode, playerId: stored.playerId, playerToken: stored.playerToken },
            ack,
          ),
        );
        this.roomCode = stored.roomCode;
        this.playerId = stored.playerId;
        this.playerToken = stored.playerToken;
        this.name = stored.name;
        this.closedReason = null;
        return true;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
        return false;
      }
    },

    async pickGroup(groupId: string | null) {
      this.error = '';
      const socket = getSocket();
      try {
        await request((ack) => socket.emit('player:pickGroup', { groupId }, ack));
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      }
    },

    ready() {
      getSocket().emit('player:ready');
    },

    clueDone() {
      getSocket().emit('game:nextSpeaker');
    },

    async vote(targetId: string) {
      this.error = '';
      const socket = getSocket();
      try {
        await request((ack) => socket.emit('vote:cast', { targetId }, ack));
        this.myVote = targetId;
      } catch (err) {
        this.error = err instanceof Error ? err.message : String(err);
      }
    },

    continueRound() {
      getSocket().emit('group:continue');
    },

    leave() {
      localStorage.removeItem(STORAGE_KEY);
      this.$reset();
    },
  },
});
