// Online rooms for Find The Imposter.
//
// The host's browser is the server: it owns the room state, assigns roles,
// tallies votes and broadcasts a sanitised snapshot to everyone. Guests connect
// peer-to-peer over WebRTC using PeerJS's public signalling server, so the game
// stays a static site (Vercel-friendly) with no backend to run.
//
// Room state is authoritative on the host and never leaves it in a raw form:
// roles and the secret word are only sent to the player they belong to.

// Vendored, self-contained build of peerjs (see main/vendor/peerjs.mjs).
// Vercel serves main/ straight to the browser with no bundler, so a bare
// "peerjs" specifier would fail to resolve there.
import Peer from './vendor/peerjs.mjs';
import { WORD_DATABASE, getWordSelection } from './words.js';
import {
  ID_PREFIX,
  MAX_PLAYERS,
  MIN_PLAYERS,
  DEFAULT_ONLINE_SETTINGS,
  normalizeCode,
  cleanName
} from './online-shared.js';

// Re-exported so existing importers keep working after the split.
export { DEFAULT_ONLINE_SETTINGS, makeRoomCode, normalizeCode, roomLink, codeFromUrl, cleanName } from './online-shared.js';

function shuffle(list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function isHostIntent(type) {
  return ['start', 'startVoting', 'nextRound', 'playAgain', 'settings', 'kick'].includes(type);
}

const REJOIN_DELAYS = [800, 1500, 3000, 5000, 8000, 8000, 8000, 8000];

function cleanGuess(value) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

function normalizeWord(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------- host room

export class HostRoom {
  constructor({ code, name, settings, bannedPairs, onState, onStatus, onError }) {
    this.code = normalizeCode(code);
    this.hostName = cleanName(name) || 'Host';
    this.bannedPairs = Array.isArray(bannedPairs) ? bannedPairs : [];
    this.settings = { ...DEFAULT_ONLINE_SETTINGS, ...(settings || {}) };
    if (!Array.isArray(this.settings.categoryIds) || !this.settings.categoryIds.length) {
      this.settings.categoryIds = Object.keys(WORD_DATABASE);
    }
    this.onState = onState;
    this.onStatus = onStatus;
    this.onError = onError;

    this.players = [this.makePlayer('host', this.hostName, true)];
    this.screen = 'lobby';
    this.round = 1;
    this.secretWord = '';
    this.imposterWord = null;
    this.category = '';
    this.turnOrder = [];
    this.deadline = 0;
    this.result = null;
    this.winner = null;
    this.usedWords = [];

    this.conns = new Map(); // peerId -> DataConnection
    this.destroyed = false;
    this.peer = null;
    this.discussionTimer = null;
    this.openPeer();
  }

  makePlayer(id, name, isHost = false) {
    return {
      id,
      name,
      isHost,
      connected: true,
      ready: false,
      eliminated: false,
      role: null,
      isGuardian: false,
      vote: null
    };
  }

  openPeer() {
    this.onStatus?.('connecting');
    const peer = new Peer(ID_PREFIX + this.code, { debug: 0 });
    this.peer = peer;

    peer.on('open', () => {
      this.onStatus?.('online');
      this.publish();
    });
    peer.on('connection', (conn) => this.attach(conn));
    peer.on('error', (error) => this.handlePeerError(error));
    peer.on('disconnected', () => {
      if (this.destroyed) return;
      this.onStatus?.('reconnecting');
      setTimeout(() => {
        if (this.destroyed) return;
        try { peer.reconnect(); } catch (e) { /* ignore */ }
      }, 1200);
    });
  }

  handlePeerError(error) {
    const type = error?.type;
    if (type === 'unavailable-id') {
      this.onError?.({ code: 'id-taken', message: 'That room code is already in use.' });
      return;
    }
    if (type === 'peer-unavailable') return;
    if (type === 'network' || type === 'server-error' || type === 'socket-error') {
      this.onStatus?.('offline');
      return;
    }
    this.onError?.({ code: type || 'peer-error', message: error?.message || 'Connection error.' });
  }

  attach(conn) {
    conn.on('data', (msg) => this.handleMessage(conn, msg));
    conn.on('close', () => this.drop(conn.peer));
    conn.on('error', () => this.drop(conn.peer));
    conn.on('open', () => {
      if (!this.conns.has(conn.peer)) this.conns.set(conn.peer, conn);
    });
    if (conn.open) this.conns.set(conn.peer, conn);
  }

  handleMessage(conn, msg) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'hello') {
      this.addGuest(conn, msg.name, !!msg.resume);
      return;
    }

    if (msg.type === 'leave') {
      if (this.screen === 'lobby') {
        this.conns.delete(conn.peer);
        this.players = this.players.filter((p) => p.id !== conn.peer);
        this.publish();
      }
      return;
    }

    const player = this.players.find((p) => p.id === conn.peer);
    if (!player) return;
    if (isHostIntent(msg.type)) return; // guests cannot drive the room

    if (msg.type === 'ready') {
      if (this.screen !== 'reveal' || player.eliminated) return;
      player.ready = true;
      this.maybeStartDiscussion();
      this.publish();
      return;
    }

    if (msg.type === 'vote') {
      if (this.screen !== 'vote' || player.eliminated) return;
      if (player.vote) return;
      const target = this.players.find((p) => p.name === msg.accused && !p.eliminated);
      if (!target || target.id === player.id) return;
      player.vote = target.name;
      this.maybeResolveVotes();
      this.publish();
      return;
    }

    if (msg.type === 'guess') {
      if (this.screen !== 'guess' || !player.isMrWhite) return;
      this.finishGuess(player, msg.word);
    }
  }

  addGuest(conn, rawName, resume = false) {
    const name = cleanName(rawName);

    // One player per peer: a duplicate hello from the same connection is ignored.
    if (this.players.some((p) => p.id === conn.peer)) return;

    // A reconnecting guest keeps their seat (and their role) when the name
    // matches a player who dropped out. This works mid-game too.
    if (resume) {
      const seat = this.players.find(
        (p) => !p.isHost && !p.connected && p.name.toLowerCase() === name.toLowerCase()
      );
      if (seat) {
        this.conns.forEach((existing, peerId) => {
          if (peerId === seat.id) this.conns.delete(peerId);
        });
        this.conns.set(conn.peer, conn);
        seat.id = conn.peer;
        seat.connected = true;
        seat.ready = false;
        seat.vote = null;
        conn.send({ type: 'welcome', code: this.code, resumed: true });
        this.publish();
        return;
      }
    }

    if (this.screen !== 'lobby') {
      conn.send({ type: 'denied', reason: 'in-progress' });
      setTimeout(() => conn.close(), 100);
      return;
    }
    if (!name) {
      conn.send({ type: 'denied', reason: 'name-required' });
      return;
    }
    if (this.players.length >= MAX_PLAYERS) {
      conn.send({ type: 'denied', reason: 'room-full' });
      setTimeout(() => conn.close(), 100);
      return;
    }
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      conn.send({ type: 'denied', reason: 'name-taken' });
      return;
    }

    this.conns.set(conn.peer, conn);
    this.players.push(this.makePlayer(conn.peer, name));
    conn.send({ type: 'welcome', code: this.code });
    this.publish();
  }

  // A dropped guest keeps their seat so they can rejoin with the same name.
  // The host decides whether to remove them, and the lobby shows them offline.
  drop(peerId) {
    this.conns.delete(peerId);
    const player = this.players.find((p) => p.id === peerId);
    if (!player) return;

    player.connected = false;
    player.ready = false;
    player.vote = null;
    this.maybeStartDiscussion();
    this.maybeResolveVotes();
    this.publish();
  }

  kick(name) {
    if (this.screen !== 'lobby') return;
    const player = this.players.find(
      (p) => !p.isHost && p.name.toLowerCase() === String(name || '').toLowerCase()
    );
    if (!player) return;
    const conn = this.conns.get(player.id);
    if (conn?.open) {
      try { conn.send({ type: 'denied', reason: 'kicked' }); } catch (error) { /* ignore */ }
      setTimeout(() => { try { conn.close(); } catch (error) { /* ignore */ } }, 100);
    }
    this.conns.delete(player.id);
    this.players = this.players.filter((p) => p !== player);
    this.publish();
  }

  // --- host actions ---

  setSettings(patch) {
    if (this.screen !== 'lobby' || !patch) return;
    const next = { ...this.settings, ...patch };
    next.mode = ['classic', 'mrwhite', 'undercover'].includes(next.mode) ? next.mode : 'classic';
    next.difficulty = ['easy', 'medium', 'hard'].includes(next.difficulty) ? next.difficulty : 'medium';
    next.timeLimit = [0, 120, 180, 300, 420].includes(Number(next.timeLimit)) ? Number(next.timeLimit) : 300;
    next.numImposters = Math.max(1, Math.min(3, Number(next.numImposters) || 1));
    if (next.mode === 'mrwhite') next.numImposters = 1;
    if (Array.isArray(patch.categoryIds) && patch.categoryIds.length) {
      next.categoryIds = patch.categoryIds;
    }
    this.settings = next;
    this.publish();
  }

  startGame() {
    if (this.screen !== 'lobby') return;
    const connected = this.players.filter((p) => p.connected);
    if (connected.length < MIN_PLAYERS) {
      this.onError?.({ code: 'need-players', message: `You need at least ${MIN_PLAYERS} players to start.` });
      return;
    }

    const selection = getWordSelection(
      this.settings.categoryIds,
      this.settings.mode === 'undercover',
      this.settings.difficulty,
      this.usedWords,
      [],
      this.bannedPairs
    );

    this.secretWord = selection.secretWord;
    this.imposterWord = selection.imposterWord;
    this.category = selection.category;
    this.usedWords.push(selection.secretWord);
    if (selection.imposterWord) this.usedWords.push(selection.imposterWord);

    const maxImposters = Math.max(1, Math.floor(connected.length / 2));
    const imposterCount = this.settings.mode === 'mrwhite'
      ? 1
      : Math.max(1, Math.min(this.settings.numImposters, maxImposters));
    const shuffled = shuffle(connected);

    this.players.forEach((p) => {
      p.role = null;
      p.eliminated = !p.connected;
      p.ready = false;
      p.vote = null;
      p.isGuardian = false;
      p.isMrWhite = false;
    });
    shuffled.forEach((p, index) => {
      p.role = index < imposterCount ? 'imposter' : 'crew';
      p.eliminated = false;
    });
    if (this.settings.mode === 'mrwhite') shuffled[0].isMrWhite = true;

    this.round = 1;
    this.winner = null;
    this.result = null;
    this.deadline = 0;
    this.turnOrder = shuffle(connected).map((p) => p.name);
    this.screen = 'reveal';
    this.publish();
  }

  maybeStartDiscussion() {
    if (this.screen !== 'reveal') return;
    const connected = this.players.filter((p) => p.connected);
    if (!connected.length || !connected.every((p) => p.ready)) return;
    this.enterDiscussion();
  }

  enterDiscussion() {
    this.screen = 'discussion';
    this.deadline = this.settings.timeLimit > 0 ? Date.now() + this.settings.timeLimit * 1000 : 0;
    this.players.forEach((p) => { p.vote = null; });
    this.startDiscussionTimer();
    this.publish();
  }

  startDiscussionTimer() {
    this.clearDiscussionTimer();
    if (this.screen !== 'discussion' || !(this.settings.timeLimit > 0)) return;
    this.discussionTimer = setTimeout(() => {
      this.discussionTimer = null;
      if (this.screen === 'discussion') this.startVoting();
    }, this.settings.timeLimit * 1000);
  }

  clearDiscussionTimer() {
    if (this.discussionTimer) {
      clearTimeout(this.discussionTimer);
      this.discussionTimer = null;
    }
  }

  startVoting() {
    if (this.screen !== 'discussion') return;
    this.clearDiscussionTimer();
    this.screen = 'vote';
    this.deadline = 0;
    this.players.forEach((p) => { p.vote = null; });
    this.publish();
  }

  maybeResolveVotes() {
    if (this.screen !== 'vote') return;
    const alive = this.players.filter((p) => !p.eliminated && p.connected);
    if (!alive.length) return;
    if (alive.every((p) => p.vote)) this.resolveVotes();
  }

  resolveVotes() {
    const alive = this.players.filter((p) => !p.eliminated && p.connected);
    const tallies = {};
    alive.forEach((p) => { tallies[p.name] = 0; });
    alive.forEach((p) => {
      if (p.vote && tallies[p.vote] !== undefined) tallies[p.vote] += 1;
    });

    const ranked = Object.entries(tallies).sort((a, b) => b[1] - a[1]);

    if (this.settings.mode === 'classic') {
      // One ballot decides a Classic round: the accused group is the top vote
      // positions, including everyone tied at the cutoff. The crew wins only
      // when that group is exactly the imposter team.
      const slots = Math.max(1, this.settings.numImposters || 1);
      const cutoff = ranked.length >= slots ? ranked[slots - 1][1] : 0;
      const accused = cutoff > 0
        ? ranked.filter(([, count]) => count >= cutoff).map(([name]) => name)
        : [];
      const imposters = alive.filter((p) => p.role === 'imposter').map((p) => p.name);
      const crewWin = accused.length === imposters.length
        && accused.every((name) => imposters.includes(name));

      this.winner = crewWin ? 'crew' : 'imposters';
      this.result = {
        tallies,
        leaders: accused,
        eliminated: [],
        tie: false,
        classic: true,
        roles: accused.map((name) => ({
          name,
          role: this.players.find((p) => p.name === name)?.role || 'crew'
        })),
        winner: this.winner
      };
      this.screen = 'results';
      this.publish();
      return;
    }

    // Mr. White / Undercover: vote one player out, then check the survivors.
    const top = ranked.length ? ranked[0][1] : 0;
    const leaders = top > 0 ? ranked.filter(([, count]) => count === top).map(([name]) => name) : [];
    const tie = leaders.length !== 1;
    const eliminated = tie ? [] : leaders;

    eliminated.forEach((name) => {
      const player = this.players.find((p) => p.name === name);
      if (player) player.eliminated = true;
    });

    const living = this.players.filter((p) => !p.eliminated);
    const livingImposters = living.filter((p) => p.role === 'imposter');
    const livingCrew = living.filter((p) => p.role === 'crew');
    const caughtMrWhite = eliminated.some((name) => this.players.find((p) => p.name === name)?.isMrWhite);

    let winner = null;
    if (livingImposters.length === 0) winner = 'crew';
    else if (livingImposters.length >= livingCrew.length) winner = 'imposters';

    this.winner = caughtMrWhite ? null : winner;
    this.result = {
      tallies,
      leaders,
      eliminated,
      tie,
      roles: eliminated.map((name) => {
        const player = this.players.find((p) => p.name === name);
        return { name, role: player?.role || 'crew', isMrWhite: !!player?.isMrWhite };
      }),
      winner: this.winner
    };
    this.screen = caughtMrWhite ? 'guess' : 'results';
    this.publish();
  }

  submitGuess(rawWord) {
    if (this.screen !== 'guess') return;
    const host = this.players.find((p) => p.isHost);
    if (!host?.isMrWhite) return;
    this.finishGuess(host, rawWord);
  }

  skipGuess() {
    if (this.screen !== 'guess') return;
    this.winner = 'crew';
    this.result = {
      ...(this.result || { tallies: {}, eliminated: [], tie: false, roles: [] }),
      guess: { by: '', word: '', correct: false, skipped: true }
    };
    this.screen = 'results';
    this.publish();
  }

  finishGuess(player, rawWord) {
    if (this.screen !== 'guess' || !player.isMrWhite) return;
    const guess = cleanGuess(rawWord);
    if (!guess) return;
    const correct = normalizeWord(guess) === normalizeWord(this.secretWord);
    this.winner = correct ? 'imposters' : 'crew';
    this.result = {
      ...(this.result || { tallies: {}, eliminated: [], tie: false, roles: [] }),
      guess: { by: player.name, word: guess, correct }
    };
    this.screen = 'results';
    this.publish();
  }

  nextRound() {
    if (this.screen !== 'results' || this.winner) return;
    this.round += 1;
    this.players.forEach((p) => { p.vote = null; p.ready = false; });
    this.turnOrder = shuffle(this.players.filter((p) => p.connected && !p.eliminated)).map((p) => p.name);
    this.screen = 'discussion';
    this.deadline = this.settings.timeLimit > 0 ? Date.now() + this.settings.timeLimit * 1000 : 0;
    this.startDiscussionTimer();
    this.publish();
  }

  showVictory() {
    if (this.screen !== 'results' || !this.winner) return;
    this.screen = 'victory';
    this.deadline = 0;
    this.publish();
  }

  playAgain() {
    if (this.screen !== 'victory') return;
    this.clearDiscussionTimer();
    this.screen = 'lobby';
    this.round = 1;
    this.secretWord = '';
    this.imposterWord = null;
    this.category = '';
    this.result = null;
    this.winner = null;
    this.deadline = 0;
    this.turnOrder = [];
    this.players = this.players.filter((p) => p.connected);
    this.players.forEach((p) => {
      p.role = null;
      p.eliminated = false;
      p.ready = false;
      p.vote = null;
      p.isGuardian = false;
      p.isMrWhite = false;
    });
    this.publish();
  }

  // --- snapshots ---

  setReady() {
    if (this.screen !== 'reveal') return;
    const host = this.players.find((p) => p.isHost);
    if (!host || host.eliminated || host.ready) return;
    host.ready = true;
    this.maybeStartDiscussion();
    this.publish();
  }

  castVote(accusedName) {
    if (this.screen !== 'vote') return;
    const host = this.players.find((p) => p.isHost);
    if (!host || host.eliminated || host.vote) return;
    const target = this.players.find((p) => p.name === accusedName && !p.eliminated && p.connected);
    if (!target || target.id === host.id) return;
    host.vote = target.name;
    this.maybeResolveVotes();
    this.publish();
  }

  forceDiscussion() {
    if (this.screen !== 'reveal') return;
    this.enterDiscussion();
  }

  forceResolveVotes() {
    if (this.screen !== 'vote') return;
    this.resolveVotes();
  }

  publicState() {
    const alive = this.players.filter((p) => !p.eliminated);
    const votesNeeded = alive.filter((p) => p.connected).length;
    const votesIn = alive.filter((p) => p.vote).length;
    const finished = this.screen === 'victory';

    return {
      code: this.code,
      hostId: 'host',
      screen: this.screen,
      round: this.round,
      players: this.players.map((p) => ({
        id: p.id,
        name: p.name,
        isHost: !!p.isHost,
        connected: p.connected,
        ready: p.ready,
        eliminated: p.eliminated,
        hasVoted: !!p.vote,
        role: finished ? p.role : null,
        isGuardian: finished ? p.isGuardian : false,
        isMrWhite: finished ? !!p.isMrWhite : false
      })),
      settings: { ...this.settings },
      category: this.category,
      turnOrder: this.turnOrder,
      votesNeeded,
      votesIn,
      deadline: this.deadline,
      result: this.result,
      winner: this.winner,
      minPlayers: MIN_PLAYERS,
      maxPlayers: MAX_PLAYERS,
      ...(finished ? { secretWord: this.secretWord, imposterWord: this.imposterWord } : {})
    };
  }

  privateFor(playerId) {
    const player = this.players.find((p) => p.id === playerId);
    if (!player) return null;

    return {
      id: player.id,
      name: player.name,
      role: player.role,
      isImposter: player.role === 'imposter',
      isMrWhite: !!player.isMrWhite,
      canGuess: this.screen === 'guess' && !!player.isMrWhite,
      isGuardian: player.isGuardian,
      eliminated: player.eliminated,
      word: player.role === 'imposter'
        ? (this.settings.mode === 'undercover' ? this.imposterWord : null)
        : this.secretWord,
      category: this.category,
      ready: player.ready,
      vote: player.vote
    };
  }

  publish() {
    if (this.destroyed) return;
    const state = this.publicState();
    this.onState?.(state, this.privateFor('host'));

    this.conns.forEach((conn, peerId) => {
      if (!conn?.open) return;
      try {
        conn.send({ type: 'state', state });
        conn.send({ type: 'you', you: this.privateFor(peerId) });
      } catch (error) {
        // A dead connection will be removed by its close event.
      }
    });
  }

  close() {
    this.destroyed = true;
    this.clearDiscussionTimer();
    this.conns.forEach((conn) => {
      // Tell guests this was deliberate, so they do not sit in a retry loop.
      try { if (conn?.open) conn.send({ type: 'closed' }); } catch (e) { /* ignore */ }
      try { conn.close(); } catch (e) { /* ignore */ }
    });
    this.conns.clear();
    try { this.peer?.destroy(); } catch (e) { /* ignore */ }
  }
}

// --------------------------------------------------------------- guest client

export class GuestClient {
  constructor({ code, name, onState, onYou, onStatus, onError }) {
    this.code = normalizeCode(code);
    this.name = cleanName(name);
    this.onState = onState;
    this.onYou = onYou;
    this.onStatus = onStatus;
    this.onError = onError;
    this.lastState = null;
    this.lastYou = null;
    this.conn = null;
    this.destroyed = false;
    this.attempts = 0;
    this.retryTimer = null;
    this.rejoinable = false;
    this.stopped = false;

    this.onStatus?.('connecting');
    this.openPeer();
  }

  openPeer() {
    const peer = new Peer(undefined, { debug: 0 });
    this.peer = peer;

    peer.on('open', () => this.connect());
    peer.on('error', (error) => {
      const type = error?.type;
      if (type === 'peer-unavailable') {
        // While retrying, a missing host id means the room is gone, not a typo.
        if (this.attempts > 0) {
          this.stopped = true;
          this.onStatus?.('closed');
          this.onError?.({ code: 'host-left', message: 'The host closed the room.' });
          return;
        }
        this.onError?.({ code: 'not-found', message: 'No room found with that code.' });
        this.onStatus?.('error');
        return;
      }
      if (type === 'network' || type === 'server-error') {
        this.onStatus?.('offline');
        return;
      }
      this.onError?.({ code: type || 'peer-error', message: error?.message || 'Connection error.' });
    });
    peer.on('disconnected', () => {
      if (this.destroyed) return;
      this.onStatus?.('reconnecting');
      try { peer.reconnect(); } catch (e) { /* ignore */ }
    });
  }

  // Returns true when a live peer is ready to dial the host; a destroyed peer
  // is replaced (it fires 'open' and reconnects on its own).
  ensurePeer() {
    if (!this.peer || this.peer.destroyed) {
      this.openPeer();
      return false;
    }
    if (this.peer.disconnected) {
      try { this.peer.reconnect(); } catch (error) { /* ignore */ }
    }
    return true;
  }

  connect() {
    if (this.destroyed) return;
    const conn = this.peer.connect(ID_PREFIX + this.code, { reliable: true });
    this.conn = conn;

    conn.on('open', () => {
      this.onStatus?.('online');
      // Always offer to resume: the host only reuses a seat that is offline,
      // so a live player with the same name still gets "name taken".
      conn.send({ type: 'hello', name: this.name, resume: true });
    });
    conn.on('data', (msg) => this.handleMessage(msg));
    conn.on('close', () => {
      if (this.destroyed) return;
      this.scheduleReconnect();
    });
    conn.on('error', () => {
      if (this.destroyed) return;
      this.scheduleReconnect();
    });
  }

  // A phone that sleeps or walks out of Wi-Fi range should come back into the
  // same seat instead of ending the game for that player.
  scheduleReconnect() {
    if (this.destroyed || this.stopped || this.retryTimer) return;
    this.onStatus?.('reconnecting');
    if (this.attempts >= REJOIN_DELAYS.length) {
      this.onStatus?.('closed');
      this.onError?.({ code: 'host-left', message: 'Lost the room. The host may have closed it.' });
      return;
    }
    const delay = REJOIN_DELAYS[this.attempts];
    this.attempts += 1;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      if (this.destroyed || this.stopped) return;
      if (this.ensurePeer()) this.connect();
    }, delay);
  }

  reconnectNow() {
    if (this.destroyed) return;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    this.onStatus?.('reconnecting');
    this.attempts = 0;
    if (this.ensurePeer()) this.connect();
  }

  handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'state') {
      this.lastState = msg.state;
      this.onState?.(msg.state, this.lastYou);
      return;
    }
    if (msg.type === 'you') {
      this.lastYou = msg.you;
      this.onYou?.(msg.you, this.lastState);
      return;
    }
    if (msg.type === 'denied') {
      const messages = {
        'name-taken': 'That name is already in the room. Try another one.',
        'room-full': 'This room is full.',
        'in-progress': 'That game has already started.',
        'name-required': 'Enter a name first.',
        'kicked': 'The host removed you from the room.'
      };
      // Refusals are final: stop retrying so the message stays on screen.
      this.rejoinable = false;
      this.stopped = true;
      this.onError?.({ code: msg.reason, message: messages[msg.reason] || 'The host refused the connection.' });
      return;
    }
    if (msg.type === 'closed') {
      this.stopped = true;
      this.onStatus?.('closed');
      this.onError?.({ code: 'host-left', message: 'The host closed the room.' });
      return;
    }
    if (msg.type === 'welcome') {
      this.attempts = 0;
      this.rejoinable = true;
      this.onStatus?.('online');
      this.onResumed?.(!!msg.resumed);
    }
  }

  send(message) {
    if (!this.conn?.open) return false;
    try {
      this.conn.send(message);
      return true;
    } catch (error) {
      return false;
    }
  }

  close() {
    this.destroyed = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    // Tell the host this is a deliberate exit so the seat is freed straight away.
    try { if (this.conn?.open) this.conn.send({ type: 'leave' }); } catch (e) { /* ignore */ }
    try { this.conn?.close(); } catch (e) { /* ignore */ }
    try { this.peer?.destroy(); } catch (e) { /* ignore */ }
  }
}
