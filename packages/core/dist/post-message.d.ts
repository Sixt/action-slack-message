import { PostMessageOptions, PostMessageResult } from './types';
export declare function postMessage({ token, channel, text, blocks }: PostMessageOptions): Promise<PostMessageResult>;
