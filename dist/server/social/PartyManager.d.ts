import type { Party, PartyMember, PlayerActivity } from '../../types';
declare class PartyManager {
    private parties;
    private playerParty;
    /** playerId → pending invite (cleared on accept/decline) */
    pendingPartyInvites: Record<string, {
        partyId: string;
        fromName: string;
    }>;
    createParty(leaderId: string, leaderName: string): Party;
    addMember(partyId: string, playerId: string, playerName: string): Party | null;
    removeMember(partyId: string, playerId: string): Party | null;
    disband(partyId: string): void;
    getParty(partyId: string): Party | undefined;
    getPartyOf(playerId: string): Party | undefined;
    getPartyMembers(playerId: string): PartyMember[];
    isInParty(playerId: string): boolean;
    isLeader(playerId: string): boolean;
    syncMember(playerId: string): void;
    updateActivity(playerId: string, activity: PlayerActivity): void;
    setDowned(playerId: string, downed: boolean): void;
    cancelDownedTimer(playerId: string): void;
    incrementTimedOut(playerId: string): number;
    resetTimedOut(playerId: string): void;
    getPartyMembersForCombat(playerId: string): PartyMember[];
    notifyMember(playerId: string, message: string): void;
    notifyAllMembers(partyId: string, message: string, excludeId?: string): void;
    formatPartyInfo(party: Party, forPlayerId: string): string;
    private getActivityFromState;
}
export declare const partyManager: PartyManager;
export {};
//# sourceMappingURL=PartyManager.d.ts.map