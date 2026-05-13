/**
 * Phase 9 — Rate Limiter
 * In-memory rate limiting per IP for admin API endpoints.
 * Uses a sliding window token bucket algorithm.
 */
export declare function checkRateLimit(ip: string): {
    allowed: boolean;
    remaining: number;
    resetIn: number;
};
export declare function rateLimitMiddleware(_req: {
    socket: {
        remoteAddress?: string;
    };
}, res: {
    status: (code: number) => {
        json: (body: object) => void;
    };
    setHeader: (k: string, v: string) => void;
}, next: () => void): void;
//# sourceMappingURL=RateLimiter.d.ts.map