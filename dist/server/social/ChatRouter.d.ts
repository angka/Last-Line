import type { ChatMessage } from '../../types';
declare class ChatRouter {
    private shoutCooldowns;
    /** Route a chat message to the correct recipients */
    route(msg: ChatMessage): void;
    private routeArea;
    routePartyChatMsg(msg: ChatMessage): void;
    private routeWhisper;
    private routeShout;
}
export declare const chatRouter: ChatRouter;
export {};
//# sourceMappingURL=ChatRouter.d.ts.map