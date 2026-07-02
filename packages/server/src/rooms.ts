/**
 * In-memory room management — supports TWO modes (tech plan §2).
 *
 * - `team`  : ONE game per room; each group is a seat, members share their
 *             group's word, groups speak/vote as one (first vote locks).
 * - `groups`: each group plays its OWN internal game (1 undercover within the
 *             group); N groups run in parallel.
 *
 * The pure engine (`@arcade/shared/game/engine`) is reused by both. In team
 * mode the engine seat is the group (room.game + room.seatOrder); in groups
 * mode each group keeps its own game with members as seats (group.game +
 * group.memberOrder). Secrets only leave through the snapshot builders.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import {
  allVotesIn,
  castVote,
  confirmReveal,
  createGame,
  DEFAULT_ROOM_CONFIG,
  eligibleVoters,
  generateRoomCode,
  getWordPack,
  groupIdsFor,
  nextRound,
  nextSpeaker,
  normaliseRoomCode,
  pickAutoGroup,
  randomPair,
  resolveVotes,
  startVoting,
  type GroupsSecrets,
  type HostSecrets,
  type HostState,
  type LocalGame,
  type PublicGroupState,
  type PublicPlayer,
  type PublicRoomState,
  type Role,
  type RoomConfig,
  type SecretPayload,
  type TeamSecrets,
} from '@arcade/shared';

export interface RoomPlayer {
  id: string;
  name: string;
  token: string;
  groupId: string | null;
  connected: boolean;
  socketId: string | null;
}

interface ServerGroup {
  id: string;
  /** groups mode: this group's internal game (null before start). */
  game: LocalGame | null;
  /** Member ids in engine-seat order, fixed when the group's game starts. */
  memberOrder: string[];
  /** members who confirmed "memorised my word" this game (groups mode). */
  ready: Set<string>;
  phaseEndsAt: number | null;
  timer: NodeJS.Timeout | null;
}

export interface Room {
  code: string;
  hostToken: string;
  config: RoomConfig;
  players: Map<string, RoomPlayer>;
  groups: Map<string, ServerGroup>;
  /* team mode */
  game: LocalGame | null;
  seatOrder: string[]; // group ids in engine-seat order
  ready: Set<string>; // playerIds ready (team reveal)
  phaseEndsAt: number | null;
  timer: NodeJS.Timeout | null;
  usedPairIds: string[];
  createdAt: number;
}

const ROOM_TTL_MS = 6 * 60 * 60 * 1000;
const MIN_SEATS = 3; // engine needs ≥3 to seat 1 undercover (roles.ts)

export class RoomManager {
  private rooms = new Map<string, Room>();
  onRoomChanged: (room: Room) => void = () => {};
  onSecrets: (room: Room) => void = () => {};

  /* ── Lifecycle ─────────────────────────────────────────────── */

  createRoom(partial: Partial<RoomConfig>): Room {
    const config = this.sanitiseConfig(partial);
    let code = generateRoomCode();
    while (this.rooms.has(code)) code = generateRoomCode();

    const groups = new Map<string, ServerGroup>();
    for (const id of groupIdsFor(config)) {
      groups.set(id, { id, game: null, memberOrder: [], ready: new Set(), phaseEndsAt: null, timer: null });
    }
    const room: Room = {
      code,
      hostToken: randomBytes(24).toString('hex'),
      config,
      players: new Map(),
      groups,
      game: null,
      seatOrder: [],
      ready: new Set(),
      phaseEndsAt: null,
      timer: null,
      usedPairIds: [],
      createdAt: Date.now(),
    };
    this.rooms.set(code, room);
    this.sweep();
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(normaliseRoomCode(code));
  }

  closeRoom(room: Room): void {
    this.clearTimer(room);
    for (const g of room.groups.values()) this.clearGroupTimer(g);
    this.rooms.delete(room.code);
  }

  private sweep(): void {
    const now = Date.now();
    for (const room of this.rooms.values()) {
      if (now - room.createdAt > ROOM_TTL_MS) this.closeRoom(room);
    }
  }

  private sanitiseConfig(partial: Partial<RoomConfig>): RoomConfig {
    const merged = { ...DEFAULT_ROOM_CONFIG, ...partial };
    const clamp = (v: number, lo: number, hi: number) =>
      Math.min(Math.max(Math.round(v), lo), hi);
    const groupCount = clamp(merged.groupCount, 1, 6);
    return {
      sessionName: merged.sessionName.trim().slice(0, 40) || DEFAULT_ROOM_CONFIG.sessionName,
      groupCount,
      groupSize: clamp(merged.groupSize, 1, 10),
      groupNames: this.sanitiseGroupNames(merged.groupNames, groupCount),
      mode: merged.mode === 'groups' ? 'groups' : 'team',
      packId: getWordPack(merged.packId) ? merged.packId : DEFAULT_ROOM_CONFIG.packId,
      undercoverCount: 1,
      includeMrWhite: false,
      discussSeconds: clamp(merged.discussSeconds, 10, 300),
      voteSeconds: clamp(merged.voteSeconds, 10, 120),
    };
  }

  private sanitiseGroupNames(raw: string[] | undefined, groupCount: number): string[] {
    const src = Array.isArray(raw) ? raw : [];
    return Array.from({ length: groupCount }, (_, i) => {
      const v = (src[i] ?? `Group ${i + 1}`).trim().slice(0, 20);
      return v || `Group ${i + 1}`;
    });
  }

  /* ── Players ───────────────────────────────────────────────── */

  addPlayer(room: Room, rawName: string): RoomPlayer | { error: string } {
    const name = rawName.trim().slice(0, 20);
    if (!name) return { error: 'Please enter a name.' };
    for (const p of room.players.values()) {
      if (p.name.toLowerCase() === name.toLowerCase()) {
        return { error: 'That name is already taken in this room.' };
      }
    }
    const player: RoomPlayer = {
      id: randomUUID(),
      name,
      token: randomBytes(16).toString('hex'),
      groupId: null,
      connected: true,
      socketId: null,
    };
    room.players.set(player.id, player);
    return player;
  }

  pickGroup(room: Room, player: RoomPlayer, groupId: string | null): string | { error: string } {
    const counts: Record<string, number> = {};
    for (const p of room.players.values()) {
      if (p.groupId && p.id !== player.id) counts[p.groupId] = (counts[p.groupId] ?? 0) + 1;
    }
    const ids = [...room.groups.keys()];
    const target = groupId ?? pickAutoGroup(counts, ids, room.config.groupSize);
    if (!target) return { error: 'All groups are full.' };
    const group = room.groups.get(target);
    if (!group) return { error: 'That group does not exist.' };
    if ((counts[target] ?? 0) >= room.config.groupSize) return { error: 'That group is full.' };
    player.groupId = target;
    return target;
  }

  groupMembers(room: Room, groupId: string): RoomPlayer[] {
    return [...room.players.values()].filter((p) => p.groupId === groupId);
  }

  private seatedGroupIds(room: Room): string[] {
    return groupIdsFor(room.config).filter((id) => this.groupMembers(room, id).length > 0);
  }

  /* ── Start (both modes) ────────────────────────────────────── */

  canStartGame(room: Room): boolean {
    if (room.config.mode === 'team') {
      return room.game === null && this.seatedGroupIds(room).length >= MIN_SEATS;
    }
    // groups: at least one group with enough members
    return [...room.groups.values()].some(
      (g) => g.game === null && this.groupMembers(room, g.id).length >= MIN_SEATS,
    );
  }

  startGame(room: Room): boolean {
    if (!this.canStartGame(room)) return false;
    return room.config.mode === 'team' ? this.startTeamGame(room) : this.startAllGroupGames(room);
  }

  private startTeamGame(room: Room): boolean {
    const seated = this.seatedGroupIds(room);
    if (seated.length < MIN_SEATS) return false;
    const pack = getWordPack(room.config.packId)!;
    const pair = randomPair(pack, room.usedPairIds);
    room.usedPairIds.push(pair.id);
    room.seatOrder = seated;
    try {
      room.game = createGame({
        playerNames: seated,
        wordPair: pair,
        undercoverCount: room.config.undercoverCount,
        includeMrWhite: room.config.includeMrWhite,
        discussSeconds: room.config.discussSeconds,
        voteSeconds: room.config.voteSeconds,
      });
    } catch {
      room.seatOrder = [];
      return false;
    }
    room.ready = new Set();
    this.setTimer(room);
    this.onSecrets(room);
    return true;
  }

  private startAllGroupGames(room: Room): boolean {
    let any = false;
    for (const id of groupIdsFor(room.config)) {
      if (this.startGroupGame(room, id)) any = true;
    }
    if (any) this.onSecrets(room);
    return any;
  }

  /** groups mode: start one group's internal game (members as seats). */
  private startGroupGame(room: Room, groupId: string): boolean {
    const group = room.groups.get(groupId);
    const members = group ? this.groupMembers(room, groupId) : [];
    if (!group || group.game || members.length < MIN_SEATS) return false;
    const pack = getWordPack(room.config.packId)!;
    const pair = randomPair(pack, room.usedPairIds);
    room.usedPairIds.push(pair.id);
    group.memberOrder = members.map((p) => p.id);
    try {
      group.game = createGame({
        playerNames: members.map((p) => p.name),
        wordPair: pair,
        undercoverCount: room.config.undercoverCount,
        includeMrWhite: room.config.includeMrWhite,
        discussSeconds: room.config.discussSeconds,
        voteSeconds: room.config.voteSeconds,
      });
    } catch {
      group.memberOrder = [];
      return false;
    }
    group.ready = new Set();
    this.setGroupTimer(room, group);
    return true;
  }

  restartGame(room: Room, groupId: string | null): boolean {
    if (room.config.mode === 'team') {
      if (!room.game || room.game.phase !== 'ended') return false;
      room.game = null;
      room.seatOrder = [];
      room.ready = new Set();
      this.clearTimer(room);
      room.phaseEndsAt = null;
      return this.startTeamGame(room);
    }
    // groups: restart one group
    const group = groupId ? room.groups.get(groupId) : null;
    if (!group?.game || group.game.phase !== 'ended') return false;
    group.game = null;
    group.memberOrder = [];
    group.ready = new Set();
    this.clearGroupTimer(group);
    group.phaseEndsAt = null;
    const ok = this.startGroupGame(room, group.id);
    if (ok) this.onSecrets(room);
    return ok;
  }

  /* ── Player game actions ───────────────────────────────────── */

  playerReady(room: Room, playerId: string): boolean {
    const player = room.players.get(playerId);
    if (!player?.groupId) return false;
    if (room.config.mode === 'team') return this.teamPlayerReady(room, player);
    return this.groupPlayerReady(room, player);
  }

  private teamPlayerReady(room: Room, player: RoomPlayer): boolean {
    if (!room.game || room.game.phase !== 'reveal') return false;
    if (!this.seatOfGroup(room, player.groupId!)) return false;
    room.ready.add(player.id);
    const allMembers = room.seatOrder
      .flatMap((gid) => this.groupMembers(room, gid))
      .map((p) => p.id);
    if (allMembers.every((id) => room.ready.has(id))) {
      let game = room.game;
      while (game.phase === 'reveal') game = confirmReveal(game);
      room.game = game;
      this.setTimer(room);
    }
    return true;
  }

  private groupPlayerReady(room: Room, player: RoomPlayer): boolean {
    const group = room.groups.get(player.groupId!);
    if (!group?.game || group.game.phase !== 'reveal') return false;
    group.ready.add(player.id);
    if (group.memberOrder.every((id) => group.ready.has(id))) {
      let game = group.game;
      while (game.phase === 'reveal') game = confirmReveal(game);
      group.game = game;
      this.setGroupTimer(room, group);
    }
    return true;
  }

  advanceSpeaker(room: Room, playerId: string): boolean {
    const player = room.players.get(playerId);
    if (!player?.groupId) return false;
    if (room.config.mode === 'team') {
      if (!room.game || (room.game.phase !== 'clue' && room.game.phase !== 'runoff')) return false;
      if (this.teamSpeakerGroupId(room) !== player.groupId) return false;
      room.game = nextSpeaker(room.game);
      this.setTimer(room);
      return true;
    }
    const group = room.groups.get(player.groupId);
    if (!group?.game || (group.game.phase !== 'clue' && group.game.phase !== 'runoff')) return false;
    if (this.groupSpeakerMemberId(group) !== player.id) return false;
    group.game = nextSpeaker(group.game);
    this.setGroupTimer(room, group);
    return true;
  }

  /** targetId: team = group id, groups = member id. */
  castVote(room: Room, playerId: string, targetId: string): boolean | { error: string } {
    const player = room.players.get(playerId);
    if (!player?.groupId) return { error: 'Join a team first.' };
    if (room.config.mode === 'team') return this.teamCastVote(room, player, targetId);
    return this.groupCastVote(room, player, targetId);
  }

  private teamCastVote(room: Room, player: RoomPlayer, targetGroupId: string): boolean | { error: string } {
    if (!room.game || room.game.phase !== 'vote') return { error: 'Voting is not open right now.' };
    const voter = this.seatOfGroup(room, player.groupId!);
    const target = this.seatOfGroup(room, targetGroupId);
    if (!voter || !target) return { error: 'Unknown team.' };
    if (room.game.votes[voter] !== undefined) return { error: 'Your team has already voted.' };
    const before = room.game;
    const next = castVote(before, voter, target);
    if (next === before) return { error: 'That vote is not allowed.' };
    room.game = next;
    if (allVotesIn(room.game)) this.resolveTeamVotes(room);
    else this.setTimer(room);
    return true;
  }

  private groupCastVote(room: Room, player: RoomPlayer, targetMemberId: string): boolean | { error: string } {
    const group = room.groups.get(player.groupId!);
    if (!group?.game || group.game.phase !== 'vote') return { error: 'Voting is not open right now.' };
    const voter = this.seatOfMember(group, player.id);
    const target = this.seatOfMember(group, targetMemberId);
    if (!voter) return { error: 'You are not in this game.' };
    if (!target) return { error: 'Unknown player.' };
    const before = group.game;
    const next = castVote(before, voter, target);
    if (next === before) return { error: 'That vote is not allowed.' };
    group.game = next;
    if (allVotesIn(group.game)) this.resolveGroupVotes(room, group);
    else this.setGroupTimer(room, group);
    return true;
  }

  /** groupId: groups mode target group (host); player triggers own group. */
  continueGame(room: Room, groupId: string | null, playerId: string | null): boolean {
    if (room.config.mode === 'team') {
      if (!room.game || room.game.phase !== 'elimination') return false;
      room.game = nextRound(room.game);
      this.setTimer(room);
      return true;
    }
    const gid = groupId ?? this.groupOfPlayer(room, playerId);
    const group = gid ? room.groups.get(gid) : null;
    if (!group?.game || group.game.phase !== 'elimination') return false;
    group.game = nextRound(group.game);
    this.setGroupTimer(room, group);
    return true;
  }

  skipPhase(room: Room, groupId: string | null): boolean {
    if (room.config.mode === 'team') return this.teamSkipPhase(room);
    const group = groupId ? room.groups.get(groupId) : null;
    if (!group?.game) return false;
    return this.groupSkip(room, group);
  }

  private teamSkipPhase(room: Room): boolean {
    const game = room.game;
    if (!game) return false;
    switch (game.phase) {
      case 'reveal': {
        let g = game;
        while (g.phase === 'reveal') g = confirmReveal(g);
        room.game = g;
        break;
      }
      case 'clue':
      case 'runoff':
        room.game = nextSpeaker(game);
        break;
      case 'discuss':
        room.game = startVoting(game);
        break;
      case 'vote':
        this.resolveTeamVotes(room);
        return true;
      case 'elimination':
        room.game = nextRound(game);
        break;
      default:
        return false;
    }
    this.setTimer(room);
    return true;
  }

  private groupSkip(room: Room, group: ServerGroup): boolean {
    const game = group.game;
    if (!game) return false;
    switch (game.phase) {
      case 'reveal': {
        let g = game;
        while (g.phase === 'reveal') g = confirmReveal(g);
        group.game = g;
        break;
      }
      case 'clue':
      case 'runoff':
        group.game = nextSpeaker(game);
        break;
      case 'discuss':
        group.game = startVoting(game);
        break;
      case 'vote':
        this.resolveGroupVotes(room, group);
        return true;
      case 'elimination':
        group.game = nextRound(game);
        break;
      default:
        return false;
    }
    this.setGroupTimer(room, group);
    return true;
  }

  private resolveTeamVotes(room: Room): void {
    if (!room.game || room.game.phase !== 'vote') return;
    room.game = resolveVotes(room.game);
    this.setTimer(room);
  }

  private resolveGroupVotes(room: Room, group: ServerGroup): void {
    if (!group.game || group.game.phase !== 'vote') return;
    group.game = resolveVotes(group.game);
    this.setGroupTimer(room, group);
  }

  /* ── Timers ────────────────────────────────────────────────── */

  private setTimer(room: Room): void {
    this.clearTimer(room);
    room.phaseEndsAt = null;
    const game = room.game;
    if (!game) return;
    const seconds = this.phaseSeconds(room.config, game.phase);
    if (!seconds) return;
    room.phaseEndsAt = Date.now() + seconds * 1000;
    room.timer = setTimeout(() => {
      room.timer = null;
      if (!room.game) return;
      if (room.game.phase === 'discuss') {
        room.game = startVoting(room.game);
        this.setTimer(room);
      } else if (room.game.phase === 'vote') {
        this.resolveTeamVotes(room);
      }
      this.onRoomChanged(room);
    }, seconds * 1000);
  }

  private setGroupTimer(room: Room, group: ServerGroup): void {
    this.clearGroupTimer(group);
    group.phaseEndsAt = null;
    const game = group.game;
    if (!game) return;
    const seconds = this.phaseSeconds(room.config, game.phase);
    if (!seconds) return;
    group.phaseEndsAt = Date.now() + seconds * 1000;
    group.timer = setTimeout(() => {
      group.timer = null;
      if (!group.game) return;
      if (group.game.phase === 'discuss') {
        group.game = startVoting(group.game);
        this.setGroupTimer(room, group);
      } else if (group.game.phase === 'vote') {
        this.resolveGroupVotes(room, group);
      }
      this.onRoomChanged(room);
    }, seconds * 1000);
  }

  private phaseSeconds(config: RoomConfig, phase: string | null): number | undefined {
    if (phase === 'discuss') return config.discussSeconds;
    if (phase === 'vote') return config.voteSeconds;
    return undefined;
  }

  private clearTimer(room: Room): void {
    if (room.timer) clearTimeout(room.timer);
    room.timer = null;
  }

  private clearGroupTimer(group: ServerGroup): void {
    if (group.timer) clearTimeout(group.timer);
    group.timer = null;
  }

  /* ── Seat mapping ──────────────────────────────────────────── */

  /** A player's group id (null if not seated). */
  private groupOfPlayer(room: Room, playerId: string | null): string | null {
    if (!playerId) return null;
    return room.players.get(playerId)?.groupId ?? null;
  }

  /** team mode: groupId -> engine seat id. */
  private seatOfGroup(room: Room, groupId: string): string | null {
    const i = room.seatOrder.indexOf(groupId);
    return i === -1 ? null : `p${i + 1}`;
  }
  private groupOfSeat(room: Room, seat: string): string | null {
    return room.seatOrder[Number(seat.slice(1)) - 1] ?? null;
  }
  private teamSpeakerGroupId(room: Room): string | null {
    const game = room.game;
    if (!game || (game.phase !== 'clue' && game.phase !== 'runoff')) return null;
    const order = game.phase === 'runoff' && game.runoffCandidates ? game.runoffCandidates : game.speakingOrder;
    const seat = order[game.speakerIndex] ?? null;
    return seat ? this.groupOfSeat(room, seat) : null;
  }
  private teamGroupAlive(room: Room, groupId: string): boolean {
    if (!room.game) return true;
    const ep = room.game.players.find((p) => p.id === this.seatOfGroup(room, groupId));
    return ep ? ep.alive : true;
  }

  /** groups mode: memberId -> engine seat id within its group. */
  private seatOfMember(group: ServerGroup, memberId: string): string | null {
    const i = group.memberOrder.indexOf(memberId);
    return i === -1 ? null : `p${i + 1}`;
  }
  private memberOfSeat(group: ServerGroup, seat: string): string | null {
    return group.memberOrder[Number(seat.slice(1)) - 1] ?? null;
  }
  private groupSpeakerMemberId(group: ServerGroup): string | null {
    const game = group.game;
    if (!game || (game.phase !== 'clue' && game.phase !== 'runoff')) return null;
    const order = game.phase === 'runoff' && game.runoffCandidates ? game.runoffCandidates : game.speakingOrder;
    const seat = order[game.speakerIndex] ?? null;
    return seat ? this.memberOfSeat(group, seat) : null;
  }

  /* ── Snapshots ─────────────────────────────────────────────── */

  publicState(room: Room): PublicRoomState {
    const groupIds = groupIdsFor(room.config);
    const players = [...room.players.values()].map((p) => this.publicPlayer(room, p));
    const groups: Record<string, PublicGroupState> = {};
    for (const g of room.groups.values()) {
      const idx = groupIds.findIndex((x) => x === g.id);
      const memberIds = this.groupMembers(room, g.id).map((p) => p.id);
      groups[g.id] = {
        id: g.id,
        name: room.config.groupNames[idx] ?? g.id,
        playerCount: memberIds.length,
        memberIds,
        readyMemberIds: memberIds.filter((id) => (room.config.mode === 'team' ? room.ready : g.ready).has(id)),
        alive: room.config.mode === 'team' ? this.teamGroupAlive(room, g.id) : true,
        // groups-mode internal game (null in team mode)
        phase: room.config.mode === 'groups' ? g.game?.phase ?? null : null,
        round: room.config.mode === 'groups' ? g.game?.round ?? 0 : 0,
        speakingOrder: g.game ? g.game.speakingOrder.map((s) => this.memberOfSeat(g, s) ?? '').filter(Boolean) : [],
        currentSpeakerId: g.game ? this.groupSpeakerMemberId(g) : null,
        speakerIndex: g.game?.speakerIndex ?? 0,
        votesIn: g.game ? Object.keys(g.game.votes).length : 0,
        votersTotal: g.game?.phase === 'vote' ? eligibleVoters(g.game).length : 0,
        runoffCandidateIds: g.game?.runoffCandidates
          ? g.game.runoffCandidates.map((s) => this.memberOfSeat(g, s) ?? '').filter(Boolean)
          : null,
        isRunoffVote: g.game?.isRunoffVote ?? false,
        phaseEndsAt: room.config.mode === 'groups' ? g.phaseEndsAt : null,
        lastElimination:
          room.config.mode === 'groups' && g.game?.lastElimination
            ? { playerId: this.memberOfSeat(g, g.game.lastElimination.playerId) ?? '', role: g.game.lastElimination.role }
            : null,
        winner: room.config.mode === 'groups' ? g.game?.winner ?? null : null,
        revealedRoles: this.groupRevealedRoles(g),
        civilianWord: this.groupEndedWord(g, 'civilian'),
        undercoverWord: this.groupEndedWord(g, 'undercover'),
      };
    }

    if (room.config.mode === 'groups' || !room.game) {
      const started = room.config.mode === 'groups' && [...room.groups.values()].some((g) => g.game);
      return this.emptyTeamRoomState(room, players, groups, started);
    }
    return this.teamRoomState(room, players, groups);
  }

  private emptyTeamRoomState(
    room: Room,
    players: PublicPlayer[],
    groups: Record<string, PublicGroupState>,
    started: boolean,
  ): PublicRoomState {
    return {
      code: room.code,
      config: room.config,
      players,
      groups,
      started,
      phase: null,
      round: 0,
      speakingOrder: [],
      speakerIndex: 0,
      currentSpeakerGroupId: null,
      votesIn: 0,
      votersTotal: 0,
      runoffCandidateIds: null,
      isRunoffVote: false,
      phaseEndsAt: null,
      lastElimination: null,
      winner: null,
      revealedRoles: null,
      civilianWord: null,
      undercoverWord: null,
    };
  }

  private teamRoomState(room: Room, players: PublicPlayer[], groups: Record<string, PublicGroupState>): PublicRoomState {
    const game = room.game!;
    const mapGroups = (seats: readonly string[]) =>
      seats.map((s) => this.groupOfSeat(room, s)).filter((x): x is string => !!x);
    const order = game.phase === 'runoff' && game.runoffCandidates ? game.runoffCandidates : game.speakingOrder;
    const currentSeat = game.phase === 'clue' || game.phase === 'runoff' ? order[game.speakerIndex] ?? null : null;
    const ended = game.phase === 'ended';
    const revealedRoles: Record<string, Role> | null = ended ? {} : null;
    if (ended && revealedRoles) {
      for (const ep of game.players) {
        const gid = this.groupOfSeat(room, ep.id);
        if (gid) revealedRoles[gid] = ep.role;
      }
    }
    const civilian = game.players.find((p) => p.role === 'civilian');
    const undercover = game.players.find((p) => p.role === 'undercover');
    return {
      code: room.code,
      config: room.config,
      players,
      groups,
      started: true,
      phase: game.phase,
      round: game.round,
      speakingOrder: mapGroups(game.speakingOrder),
      speakerIndex: game.speakerIndex,
      currentSpeakerGroupId: currentSeat ? this.groupOfSeat(room, currentSeat) : null,
      votesIn: Object.keys(game.votes).length,
      votersTotal: game.phase === 'vote' ? eligibleVoters(game).length : 0,
      runoffCandidateIds: game.runoffCandidates ? mapGroups(game.runoffCandidates) : null,
      isRunoffVote: game.isRunoffVote,
      phaseEndsAt: room.phaseEndsAt,
      lastElimination:
        game.lastElimination === null
          ? null
          : { groupId: this.groupOfSeat(room, game.lastElimination.playerId) ?? '', role: game.lastElimination.role },
      winner: game.winner,
      revealedRoles,
      civilianWord: ended ? civilian?.word ?? null : null,
      undercoverWord: ended ? undercover?.word ?? null : null,
    };
  }

  private groupRevealedRoles(g: ServerGroup): Record<string, Role> | null {
    if (!g.game || g.game.phase !== 'ended') return null;
    const roles: Record<string, Role> = {};
    for (const ep of g.game.players) {
      const mid = this.memberOfSeat(g, ep.id);
      if (mid) roles[mid] = ep.role;
    }
    return roles;
  }

  private groupEndedWord(g: ServerGroup, role: Role): string | null {
    if (!g.game || g.game.phase !== 'ended') return null;
    return g.game.players.find((p) => p.role === role)?.word ?? null;
  }

  hostState(room: Room): HostState {
    const roomState = this.publicState(room);
    if (room.config.mode === 'team') {
      if (!room.game) return { room: roomState, secrets: null };
      const roles: Record<string, Role> = {};
      let civilianWord = '';
      let undercoverWord = '';
      for (const ep of room.game.players) {
        const gid = this.groupOfSeat(room, ep.id);
        if (gid) roles[gid] = ep.role;
        if (ep.role === 'civilian' && ep.word) civilianWord = ep.word;
        if (ep.role === 'undercover' && ep.word) undercoverWord = ep.word;
      }
      const secrets: TeamSecrets = { kind: 'team', civilianWord, undercoverWord, roles };
      return { room: roomState, secrets };
    }
    // groups
    const groups: GroupsSecrets['groups'] = {};
    for (const g of room.groups.values()) {
      if (!g.game) {
        groups[g.id] = null;
        continue;
      }
      const roles: Record<string, Role> = {};
      let civilianWord = '';
      let undercoverWord = '';
      for (const ep of g.game.players) {
        const mid = this.memberOfSeat(g, ep.id);
        if (mid) roles[mid] = ep.role;
        if (ep.role === 'civilian' && ep.word) civilianWord = ep.word;
        if (ep.role === 'undercover' && ep.word) undercoverWord = ep.word;
      }
      groups[g.id] = { civilianWord, undercoverWord, roles };
    }
    return { room: roomState, secrets: { kind: 'groups', groups } };
  }

  secretFor(room: Room, playerId: string): SecretPayload | null {
    const player = room.players.get(playerId);
    if (!player?.groupId) return null;
    if (room.config.mode === 'team') {
      if (!room.game) return null;
      const ep = room.game.players.find((p) => p.id === this.seatOfGroup(room, player.groupId!));
      if (!ep) return null;
      return { groupId: player.groupId, round: room.game.round, word: ep.word };
    }
    const group = room.groups.get(player.groupId);
    if (!group?.game) return null;
    const ep = group.game.players.find((p) => p.id === this.seatOfMember(group, player.id));
    if (!ep) return null;
    return { groupId: player.groupId, round: group.game.round, word: ep.word };
  }

  private publicPlayer(room: Room, p: RoomPlayer): PublicPlayer {
    let alive = true;
    if (room.config.mode === 'groups' && p.groupId) {
      const g = room.groups.get(p.groupId);
      const ep = g?.game ? g.game.players.find((x) => x.id === this.seatOfMember(g, p.id)) : undefined;
      if (ep) alive = ep.alive;
    }
    return { id: p.id, name: p.name, groupId: p.groupId, connected: p.connected, alive };
  }
}
