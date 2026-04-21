import type { TradeSession, Rarity } from '../../types';
declare class TradeManager {
    private activeTrades;
    private playerTrades;
    offer(sellerId: string, buyerName: string, itemId: string, itemName: string, itemRarity: Rarity, itemDescription: string, price: number): {
        session: TradeSession;
        buyerSession: import('../../types').GameSession | undefined;
    } | {
        error: string;
        sellerSession: import('../../types').GameSession;
    };
    counter(tradeId: string, playerId: string, newPrice: number): {
        error?: string;
    };
    acceptBuyer(tradeId: string, buyerId: string): {
        error?: string;
    };
    confirmSeller(tradeId: string, sellerId: string): {
        error?: string;
    };
    cancel(tradeId: string, playerId: string): {
        error?: string;
    };
    private expireTrade;
    getActiveTrade(playerId: string): TradeSession | undefined;
    formatTradeView(trade: TradeSession, viewerId: string): string;
    formatPendingStatus(trade: TradeSession, forPlayerId: string): string;
    private cleanupTrade;
    private formatOfferNotice;
}
export declare const tradeManager: TradeManager;
export {};
//# sourceMappingURL=TradeManager.d.ts.map