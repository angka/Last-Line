import type { TradeSession, CounterOffer, Rarity } from '../../types';
import { presenceManager } from './PresenceManager';
import { inventoryRemove, inventoryAdd } from '../items/InventoryManager';
import { v4 as uuid } from 'uuid';

const TRADE_TIMEOUT_MS = 90_000;

function trySend(socket: import('ws').WebSocket, data: object): void {
  try {
    if (socket.readyState === 1) socket.send(JSON.stringify(data));
  } catch { /* closed */ }
}

function notify(socket: import('ws').WebSocket, channel: string, text: string): void {
  trySend(socket, { type: 'push', channel, text });
}

class TradeManager {
  private activeTrades = new Map<string, TradeSession>();   // tradeId → session
  private playerTrades = new Map<string, string>();          // playerId → tradeId (1 active per player)

  // ─── Offer ───────────────────────────────────────────────────────────────

  offer(
    sellerId: string,
    buyerName: string,
    itemId: string,
    itemName: string,
    itemRarity: Rarity,
    itemDescription: string,
    price: number,
  ): { session: TradeSession; buyerSession: import('../../types').GameSession | undefined } | { error: string; sellerSession: import('../../types').GameSession } {
    const sellerSession = presenceManager.getSession(sellerId);
    if (!sellerSession) return { error: 'Seller not found.', sellerSession: sellerSession as any };

    const buyerSession = presenceManager.getSessionByPlayerName(buyerName);
    if (!buyerSession) return { error: `Player "${buyerName}" is not online.`, sellerSession };

    // Same area check
    const sellerArea = presenceManager.getAreaOf(sellerId);
    const buyerArea = presenceManager.getAreaOf(buyerSession.playerId);
    if (sellerArea !== buyerArea) {
      return { error: `${buyerName} is not in the same area.`, sellerSession };
    }

    // Combat check
    if (sellerSession.combatState || buyerSession.combatState) {
      return { error: 'Cannot trade while in combat.', sellerSession };
    }

    // Already in a trade
    if (this.playerTrades.has(sellerId) || this.playerTrades.has(buyerSession.playerId)) {
      return { error: 'One of you is already in a trade.', sellerSession };
    }

    // Seller has the item (check equipped / tradelock)
    const invSlot = sellerSession.currentState.inventory.find(
      s => s.itemId === itemId && !s.equipped,
    );
    if (!invSlot) return { error: 'You do not have that item (or it is equipped).', sellerSession };

    const { getItem } = require('../../data/items');
    const itemDef = getItem(itemId);
    if (itemDef?.tradelock) return { error: 'That item cannot be traded.', sellerSession };

    const tradeId = uuid();
    const now = Date.now();
    const session: TradeSession = {
      tradeId,
      sellerId,
      sellerName: sellerSession.currentState.stats.name,
      buyerId: buyerSession.playerId,
      buyerName,
      areaId: sellerArea!,
      itemId,
      itemName,
      itemRarity,
      itemDescription,
      offeredPrice: price,
      agreedPrice: null,
      buyerConfirmed: false,
      sellerConfirmed: false,
      goldEscrowed: false,
      counterHistory: [],
      createdAt: now,
      expiresAt: now + TRADE_TIMEOUT_MS,
      status: 'pending',
    };

    // Start 90s timeout
    session.timeoutHandle = setTimeout(() => this.expireTrade(tradeId), TRADE_TIMEOUT_MS);

    this.activeTrades.set(tradeId, session);
    this.playerTrades.set(sellerId, tradeId);
    this.playerTrades.set(buyerSession.playerId, tradeId);

    // Notify buyer
    notify(buyerSession.socket, 'trade', this.formatOfferNotice(session));

    // Confirm to seller
    notify(sellerSession.socket, 'system', `[Trade] Offer sent to ${buyerName} for ${price}g.`);

    return { session, buyerSession };
  }

  // ─── Counter ──────────────────────────────────────────────────────────────

  counter(tradeId: string, playerId: string, newPrice: number): { error?: string } {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return { error: 'Trade not found.' };
    if (playerId !== trade.buyerId && playerId !== trade.sellerId) {
      return { error: 'You are not part of this trade.' };
    }

    const counter: CounterOffer = { from: playerId, price: newPrice, timestamp: Date.now() };
    trade.counterHistory.push(counter);
    trade.agreedPrice = null;
    trade.buyerConfirmed = false;
    trade.sellerConfirmed = false;
    trade.expiresAt = Date.now() + TRADE_TIMEOUT_MS;

    // Reset timeout
    if (trade.timeoutHandle) clearTimeout(trade.timeoutHandle);
    trade.timeoutHandle = setTimeout(() => this.expireTrade(tradeId), TRADE_TIMEOUT_MS);

    const fromName = presenceManager.getSession(playerId)?.currentState.stats.name ?? playerId;
    const otherId = playerId === trade.sellerId ? trade.buyerId : trade.sellerId;
    const otherSession = presenceManager.getSession(otherId);

    if (otherSession) {
      const isBuyerCountering = playerId === trade.buyerId;
      const message = isBuyerCountering
        ? `[Trade] ${fromName} counters your offer: ${newPrice}g for "${trade.itemName}".\n    Type 'trade accept' to agree, 'trade counter <price>' to counter, or 'trade decline' to cancel.`
        : `[Trade] ${fromName} accepts your offer of ${newPrice}g for "${trade.itemName}".\n    Type 'trade confirm' to complete the sale.`;
      notify(otherSession.socket, 'trade', message);
    }

    return {};
  }

  // ─── Buyer accept (locks gold in escrow) ───────────────────────────────────

  acceptBuyer(tradeId: string, buyerId: string): { error?: string } {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return { error: 'Trade not found.' };
    if (trade.buyerId !== buyerId) return { error: 'You are not the buyer in this trade.' };

    const buyerSession = presenceManager.getSession(buyerId);
    if (!buyerSession) return { error: 'Buyer session not found.' };

    const price = trade.agreedPrice ?? trade.offeredPrice;
    if (buyerSession.currentState.stats.gold < price) {
      return { error: `You only have ${buyerSession.currentState.stats.gold}g.` };
    }
    if (buyerSession.currentState.inventory.length >= 30) {
      return { error: 'Your inventory is full.' };
    }

    trade.buyerConfirmed = true;
    trade.agreedPrice = price;
    trade.goldEscrowed = true;
    trade.status = 'buyer_confirmed';

    // Deduct gold (escrow)
    buyerSession.currentState = {
      ...buyerSession.currentState,
      stats: { ...buyerSession.currentState.stats, gold: buyerSession.currentState.stats.gold - price },
    };

    const sellerSession = presenceManager.getSession(trade.sellerId);
    if (sellerSession) {
      notify(sellerSession.socket, 'trade',
        `[Trade] ${trade.buyerName} accepted at ${price}g. Type 'trade confirm' to complete.`);
    }

    notify(buyerSession.socket, 'trade', `[Trade] You locked in ${price}g. Waiting for seller to confirm...`);
    return {};
  }

  // ─── Seller confirm (executes atomic transfer) ───────────────────────────

  confirmSeller(tradeId: string, sellerId: string): { error?: string } {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return { error: 'Trade not found.' };
    if (trade.sellerId !== sellerId) return { error: 'You are not the seller.' };
    if (!trade.goldEscrowed) return { error: 'Buyer has not accepted yet.' };

    const sellerSession = presenceManager.getSession(sellerId);
    const buyerSession = presenceManager.getSession(trade.buyerId);
    if (!sellerSession || !buyerSession) return { error: 'Session not found.' };

    const price = trade.agreedPrice ?? trade.offeredPrice;

    // Remove item from seller
    const newSellerSave = inventoryRemove(sellerSession.currentState, trade.itemId);
    if (newSellerSave === sellerSession.currentState) {
      return { error: 'You no longer have that item.' };
    }

    // Add gold to seller
    sellerSession.currentState = {
      ...newSellerSave,
      stats: { ...newSellerSave.stats, gold: newSellerSave.stats.gold + price },
    };

    // Add item to buyer
    const { save: newBuyerSave } = inventoryAdd(buyerSession.currentState, trade.itemId, 1);
    buyerSession.currentState = newBuyerSave;

    trade.status = 'complete';
    const finalMessage = `[Trade] ✓ Trade complete! ${trade.sellerName} sold "${trade.itemName}" to ${trade.buyerName} for ${price}g.`;
    notify(sellerSession.socket, 'trade', finalMessage);
    notify(buyerSession.socket, 'trade', finalMessage);

    this.cleanupTrade(tradeId);
    return {};
  }

  // ─── Cancel ────────────────────────────────────────────────────────────────

  cancel(tradeId: string, playerId: string): { error?: string } {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return { error: 'Trade not found.' };
    if (playerId !== trade.sellerId && playerId !== trade.buyerId) {
      return { error: 'You are not part of this trade.' };
    }

    const sellerSession = presenceManager.getSession(trade.sellerId);
    const buyerSession = presenceManager.getSession(trade.buyerId);
    const cancelledBy = sellerSession?.currentState.stats.name ?? playerId;

    // Return escrowed gold
    if (trade.goldEscrowed && buyerSession) {
      buyerSession.currentState = {
        ...buyerSession.currentState,
        stats: {
          ...buyerSession.currentState.stats,
          gold: buyerSession.currentState.stats.gold + (trade.agreedPrice ?? trade.offeredPrice),
        },
      };
    }

    const msg = `[Trade] Trade with ${cancelledBy} was cancelled.`;
    if (buyerSession) notify(buyerSession.socket, 'trade', msg);
    if (sellerSession) notify(sellerSession.socket, 'trade', msg);

    this.cleanupTrade(tradeId);
    return {};
  }

  // ─── Timeout ──────────────────────────────────────────────────────────────

  private expireTrade(tradeId: string): void {
    const trade = this.activeTrades.get(tradeId);
    if (!trade || trade.status === 'complete' || trade.status === 'cancelled') return;

    // Return escrowed gold
    if (trade.goldEscrowed) {
      const buyerSession = presenceManager.getSession(trade.buyerId);
      if (buyerSession) {
        buyerSession.currentState = {
          ...buyerSession.currentState,
          stats: {
            ...buyerSession.currentState.stats,
            gold: buyerSession.currentState.stats.gold + (trade.agreedPrice ?? trade.offeredPrice),
          },
        };
      }
    }

    const msg = `[Trade] Trade expired (90s timeout).`;
    const sellerSession = presenceManager.getSession(trade.sellerId);
    const buyerSession = presenceManager.getSession(trade.buyerId);
    if (buyerSession) notify(buyerSession.socket, 'trade', msg);
    if (sellerSession) notify(sellerSession.socket, 'trade', msg);

    this.cleanupTrade(tradeId);
  }

  // ─── View / status ────────────────────────────────────────────────────────

  getActiveTrade(playerId: string): TradeSession | undefined {
    const tradeId = this.playerTrades.get(playerId);
    return tradeId ? this.activeTrades.get(tradeId) : undefined;
  }

  formatTradeView(trade: TradeSession, viewerId: string): string {
    const { getItem } = require('../../data/items');
    const itemDef = getItem(trade.itemId);
    const viewerSession = presenceManager.getSession(viewerId);
    const viewerGold = viewerSession?.currentState.stats.gold ?? 0;
    const price = trade.agreedPrice ?? trade.offeredPrice;
    const afterGold = viewerId === trade.buyerId ? viewerGold - price : viewerGold + price;

    const box = [
      `  ╔════════════════════════════════════════════════╗`,
      `  ║  ${trade.itemName.padEnd(44)}║`,
      `  ║  [${trade.itemRarity.toUpperCase().padEnd(11)}] [Crafting Material?]              ║`,
      `  ╠════════════════════════════════════════════════╣`,
      `  ║  ${trade.itemDescription.substring(0, 44).padEnd(44)}║`,
      `  ╠════════════════════════════════════════════════╣`,
      `  ║  Seller: ${trade.sellerName.padEnd(37)}║`,
      `  ║  Asking: ${String(trade.offeredPrice + 'g').padEnd(37)}║`,
      `  ║  Your gold: ${String(viewerGold + 'g').padEnd(32)}║`,
      `  ║  After trade: ${String(afterGold + 'g').padEnd(29)}║`,
      `  ╚════════════════════════════════════════════════╝`,
    ].join('\n');

    const actions = viewerId === trade.buyerId
      ? `  Type 'trade accept', 'trade counter <price>', or 'trade decline'.`
      : trade.buyerConfirmed
        ? `  Buyer accepted. Type 'trade confirm' to complete.`
        : `  Waiting for buyer to accept...`;

    return `${box}\n${actions}`;
  }

  formatPendingStatus(trade: TradeSession, forPlayerId: string): string {
    const price = trade.agreedPrice ?? trade.offeredPrice;
    const role = forPlayerId === trade.sellerId ? 'You are selling' : 'You are buying';
    const status = trade.status;
    return `${role} "${trade.itemName}" for ${price}g. [${status}]`;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private cleanupTrade(tradeId: string): void {
    const trade = this.activeTrades.get(tradeId);
    if (!trade) return;
    if (trade.timeoutHandle) clearTimeout(trade.timeoutHandle);
    this.activeTrades.delete(tradeId);
    this.playerTrades.delete(trade.sellerId);
    this.playerTrades.delete(trade.buyerId);
  }

  private formatOfferNotice(trade: TradeSession): string {
    return [
      `[Trade] ${trade.sellerName} offers you "${trade.itemName}" [${trade.itemRarity}] for ${trade.offeredPrice}g.`,
      `  [Trade expires in 90s]`,
      `  Type 'trade view' to inspect, 'trade accept' to buy,`,
      `  'trade counter <price>' to negotiate, or 'trade decline' to refuse.`,
    ].join('\n');
  }
}

export const tradeManager = new TradeManager();
