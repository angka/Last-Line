import type { Party, PartyMember, PlayerActivity, ChatMessage } from '../../types';
import { presenceManager } from './PresenceManager';
import { v4 as uuid } from 'uuid';

const MAX_PARTY_SIZE = 4;
const LEADER_DISCONNECT_TIMEOUT_MS = 120_000;

class PartyManager {
  private parties = new Map<string, Party>();           // partyId → Party
  private playerParty = new Map<string, string>();      // playerId → partyId

  /** playerId → pending invite (cleared on accept/decline) */
  pendingPartyInvites: Record<string, { partyId: string; fromName: string }> = {};

  // ─── Party creation ────────────────────────────────────────────────────────

  createParty(leaderId: string, leaderName: string): Party {
    const partyId = uuid();
    const member: PartyMember = {
      playerId: leaderId,
      playerName: leaderName,
      level: presenceManager.getSession(leaderId)?.currentState.stats.level ?? 1,
      hp: presenceManager.getSession(leaderId)?.currentState.stats.hp ?? 0,
      maxHp: presenceManager.getSession(leaderId)?.currentState.stats.maxHp ?? 0,
      mana: presenceManager.getSession(leaderId)?.currentState.stats.mana ?? 0,
      maxMana: presenceManager.getSession(leaderId)?.currentState.stats.maxMana ?? 0,
      activity: 'Exploring',
      areaId: presenceManager.getAreaOf(leaderId) ?? '',
      isLeader: true,
      isDowned: false,
      timedOutCount: 0,
    };

    const party: Party = {
      partyId,
      leaderId,
      leaderName,
      members: [member],
      partyChatHistory: [],
      createdAt: Date.now(),
    };

    this.parties.set(partyId, party);
    this.playerParty.set(leaderId, partyId);
    return party;
  }

  addMember(partyId: string, playerId: string, playerName: string): Party | null {
    const party = this.parties.get(partyId);
    if (!party) return null;
    if (party.members.length >= MAX_PARTY_SIZE) return null;
    if (this.playerParty.has(playerId)) return null; // already in a party

    const session = presenceManager.getSession(playerId);
    const member: PartyMember = {
      playerId,
      playerName,
      level: session?.currentState.stats.level ?? 1,
      hp: session?.currentState.stats.hp ?? 0,
      maxHp: session?.currentState.stats.maxHp ?? 0,
      mana: session?.currentState.stats.mana ?? 0,
      maxMana: session?.currentState.stats.maxMana ?? 0,
      activity: 'Exploring',
      areaId: presenceManager.getAreaOf(playerId) ?? '',
      isLeader: false,
      isDowned: false,
      timedOutCount: 0,
    };

    party.members.push(member);
    this.playerParty.set(playerId, partyId);

    // Update the new member's save with partyId
    if (session) {
      session.currentState = { ...session.currentState, partyId };
    }

    return party;
  }

  removeMember(partyId: string, playerId: string): Party | null {
    const party = this.parties.get(partyId);
    if (!party) return null;

    party.members = party.members.filter(m => m.playerId !== playerId);
    this.playerParty.delete(playerId);

    // Clear partyId from the removed member's save
    const removedSession = presenceManager.getSession(playerId);
    if (removedSession) {
      removedSession.currentState = { ...removedSession.currentState, partyId: undefined };
    }

    if (party.members.length === 0) {
      this.parties.delete(partyId);
      return null;
    }

    // Promote next member if leader left
    if (party.leaderId === playerId && party.members.length > 0) {
      party.leaderId = party.members[0].playerId;
      party.leaderName = party.members[0].playerName;
      party.members[0].isLeader = true;
    }

    return party;
  }

  disband(partyId: string): void {
    const party = this.parties.get(partyId);
    if (!party) return;
    for (const m of party.members) {
      this.playerParty.delete(m.playerId);
      const session = presenceManager.getSession(m.playerId);
      if (session) session.currentState = { ...session.currentState, partyId: undefined };
      this.notifyMember(m.playerId, `[Party] The party has been disbanded.`);
    }
    this.parties.delete(partyId);
  }

  // ─── Queries ──────────────────────────────────────────────────────────────

  getParty(partyId: string): Party | undefined {
    return this.parties.get(partyId);
  }

  getPartyOf(playerId: string): Party | undefined {
    const partyId = this.playerParty.get(playerId);
    return partyId ? this.parties.get(partyId) : undefined;
  }

  getPartyMembers(playerId: string): PartyMember[] {
    return this.getPartyOf(playerId)?.members ?? [];
  }

  isInParty(playerId: string): boolean {
    return this.playerParty.has(playerId);
  }

  isLeader(playerId: string): boolean {
    const party = this.getPartyOf(playerId);
    return party?.leaderId === playerId;
  }

  // ─── Member sync ─────────────────────────────────────────────────────────

  syncMember(playerId: string): void {
    const partyId = this.playerParty.get(playerId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;

    const session = presenceManager.getSession(playerId);
    if (!session) return;

    const m = party.members.find(m => m.playerId === playerId);
    if (!m) return;

    const s = session.currentState.stats;
    m.level = s.level;
    m.hp = s.hp;
    m.maxHp = s.maxHp;
    m.mana = s.mana;
    m.maxMana = s.maxMana;
    m.activity = this.getActivityFromState(session);
    m.areaId = presenceManager.getAreaOf(playerId) ?? m.areaId;
  }

  updateActivity(playerId: string, activity: PlayerActivity): void {
    const partyId = this.playerParty.get(playerId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;
    const m = party.members.find(m => m.playerId === playerId);
    if (m) m.activity = activity;
  }

  setDowned(playerId: string, downed: boolean): void {
    const partyId = this.playerParty.get(playerId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;
    const m = party.members.find(m => m.playerId === playerId);
    if (!m) return;
    m.isDowned = downed;
    if (downed) m.downedAt = Date.now();
    else { m.downedAt = undefined; m.downedTimeout?.refresh?.(); }
  }

  cancelDownedTimer(playerId: string): void {
    const partyId = this.playerParty.get(playerId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    if (!party) return;
    const m = party.members.find(m => m.playerId === playerId);
    if (m?.downedTimeout) {
      clearTimeout(m.downedTimeout);
      m.downedTimeout = undefined;
    }
  }

  incrementTimedOut(playerId: string): number {
    const partyId = this.playerParty.get(playerId);
    if (!partyId) return 0;
    const party = this.parties.get(partyId);
    const m = party?.members.find(m => m.playerId === playerId);
    if (m) { m.timedOutCount++; return m.timedOutCount; }
    return 0;
  }

  resetTimedOut(playerId: string): void {
    const partyId = this.playerParty.get(playerId);
    if (!partyId) return;
    const party = this.parties.get(partyId);
    const m = party?.members.find(m => m.playerId === playerId);
    if (m) m.timedOutCount = 0;
  }

  getPartyMembersForCombat(playerId: string): PartyMember[] {
    this.syncMember(playerId);
    return this.getPartyMembers(playerId);
  }

  // ─── Notifications ────────────────────────────────────────────────────────

  notifyMember(playerId: string, message: string): void {
    const session = presenceManager.getSession(playerId);
    if (session) trySend(session.socket, { type: 'push', channel: 'party', text: message });
  }

  notifyAllMembers(partyId: string, message: string, excludeId?: string): void {
    const party = this.parties.get(partyId);
    if (!party) return;
    for (const m of party.members) {
      if (m.playerId === excludeId) continue;
      this.notifyMember(m.playerId, message);
    }
  }

  // ─── Formatting helpers ────────────────────────────────────────────────────

  formatPartyInfo(party: Party, forPlayerId: string): string {
    const header = `  ════════════════════════════════════════════\n`;
    const title = `  Party: ${party.leaderName}'s Group  [${party.members.length}/${MAX_PARTY_SIZE} members]\n`;
    const subheader = `  ${'─'.repeat(43)}\n`;

    const lines = party.members.map(m => {
      const areaLabel = m.playerId === forPlayerId ? '[Your area]' : `[${m.areaId.replace(/_/g, ' ')}]`;
      const status = m.isDowned ? ' [DOWNED]' : '';
      const leader = m.isLeader ? '★' : ' ';
      return `  ${leader} ${m.playerName.padEnd(12)} Lv ${String(m.level).padStart(2)}  HP ${String(m.hp).padStart(4)}/${String(m.maxHp).padStart(4)}  MP ${String(m.mana).padStart(3)}/${String(m.maxMana).padStart(3)}  [${m.activity}]${status}  ${areaLabel}`;
    });

    const inviteHint = party.members.length < MAX_PARTY_SIZE
      ? `  Type 'party invite <name>' to add a ${MAX_PARTY_SIZE - party.members.length}th member.`
      : '  Party is full.';

    return `${header}${title}${subheader}${lines.join('\n')}\n${subheader}${inviteHint}`;
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private getActivityFromState(session: import('../../types').GameSession): PlayerActivity {
    if (session.combatState) return 'In Combat';
    if (session.regenState === 'inn') return 'Resting';
    return 'Exploring';
  }
}

function trySend(socket: import('ws').WebSocket, data: object): void {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(data));
  } catch { /* closed */ }
}

export const partyManager = new PartyManager();
