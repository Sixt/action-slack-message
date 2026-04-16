"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.postMessage = postMessage;
function postMessage(_a) {
    return __awaiter(this, arguments, void 0, function* ({ token, channel, text, blocks }) {
        const payload = { channel, text };
        if (blocks === null || blocks === void 0 ? void 0 : blocks.length)
            payload.blocks = blocks;
        const response = yield fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
        });
        const result = (yield response.json());
        if (!result.ok) {
            throw new Error(`Slack API error: ${result.error}`);
        }
    });
}
//# sourceMappingURL=post-message.js.map