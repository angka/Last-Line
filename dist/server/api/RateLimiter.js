"use strict";
/**
 * Phase 9 — Rate Limiter
 * In-memory rate limiting per IP for admin API endpoints.
 * Uses a sliding window token bucket algorithm.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
exports.rateLimitMiddleware = rateLimitMiddleware;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_TOKENS = 100; // 100 requests per window
const store = new Map();
function checkRateLimit(ip) {
    const now = Date.now();
    const entry = store.get(ip);
    if (!entry) {
        store.set(ip, { tokens: MAX_TOKENS - 1, lastRefill: now });
        return { allowed: true, remaining: MAX_TOKENS - 1, resetIn: WINDOW_MS };
    }
    // Refill tokens based on elapsed time
    const elapsed = now - entry.lastRefill;
    const refill = Math.floor((elapsed / WINDOW_MS) * MAX_TOKENS);
    if (refill > 0) {
        entry.tokens = Math.min(MAX_TOKENS, entry.tokens + refill);
        entry.lastRefill = now;
    }
    if (entry.tokens <= 0) {
        const resetIn = WINDOW_MS - (elapsed % WINDOW_MS);
        return { allowed: false, remaining: 0, resetIn };
    }
    entry.tokens--;
    return { allowed: true, remaining: entry.tokens, resetIn: WINDOW_MS };
}
function rateLimitMiddleware(_req, res, next) {
    const ip = _req.socket?.remoteAddress ?? 'unknown';
    const { allowed, remaining, resetIn } = checkRateLimit(ip);
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetIn / 1000)));
    if (!allowed) {
        res.status(429).json({ error: 'Too many requests. Try again later.', retryAfter: Math.ceil(resetIn / 1000) });
        return;
    }
    next();
}
//# sourceMappingURL=RateLimiter.js.map