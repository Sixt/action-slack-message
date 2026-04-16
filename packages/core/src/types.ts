export interface SlackBlock {
  type: string;
  text?: { type: string; text: string; emoji?: boolean };
  elements?: Record<string, unknown>[];
  fields?: { type: string; text: string }[];
}

export type ButtonStyle = 'primary' | 'danger';

export interface ButtonDefinition {
  title: string;
  url: string;
  style?: ButtonStyle;
}

export interface PostMessageOptions {
  token: string;
  channel: string;
  text: string;
  blocks?: SlackBlock[];
}

export interface PostMessageResult {
  ts: string;
  channel: string;
}

export interface ComposeOptions {
  header?: string;
  text?: string;
  changelog?: string;
  buttons?: ButtonDefinition[];
  mention?: string;
  status?: 'success' | 'failure' | 'cancelled';
  ifMention?: string;
  fields?: { type: string; text: string }[];
  footerIcon?: string;
  footerText?: string;
  customBlocks?: SlackBlock[];
}
