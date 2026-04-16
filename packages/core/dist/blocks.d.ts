import { SlackBlock, ButtonDefinition, ComposeOptions } from './types';
export declare function header(text: string): SlackBlock;
export declare function section(mrkdwn: string): SlackBlock;
export declare function changelog(text: string): SlackBlock;
export declare function buttons(defs: ButtonDefinition[]): SlackBlock;
export declare function divider(): SlackBlock;
export declare function field(title: string, value: string): {
    type: string;
    text: string;
};
export declare function link(url: string, text: string): string;
export declare function contextFooter(opts: {
    icon?: string;
    text: string;
}): SlackBlock;
export declare function iconForStatus(status: string): string;
export declare function mention(target: string, status: string, ifMention: string): string | undefined;
export declare function injectMention(message: string, mentionText: string | undefined): string;
export declare function compose(options: ComposeOptions): SlackBlock[];
