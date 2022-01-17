import { debug } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import {
  ChatPostMessageArguments,
  WebClient,
  KnownBlock,
  Block,
  HeaderBlock,
  SectionBlock,
  Button,
  DividerBlock,
  ActionsBlock,
  ContextBlock,
} from '@slack/web-api';
import { FieldFactory } from './fields';

export type Octokit = InstanceType<typeof GitHub>;

export interface Input {
  channel: string;
  mention: string;
  if_mention: string;
  status: string;
  fields: string;
  text: string;
  header: string;
  changelog: string;
  buttons: string;
  custom_blocks: string;
}

export function iconForStatus(status: string): string {
  switch (status) {
    case 'success':
      return ':white_check_mark:';
    case 'failure':
      return ':no_entry:';
    case 'cancelled':
      return ':warning:';
    default:
      return ':arrows_counterclockwise:';
  }
}

export class Client {
  input: Input;
  fieldFactory: FieldFactory;
  private webclient: WebClient;
  private octokit: Octokit;

  constructor(input: Input, githubToken: string, slackToken: string) {
    this.input = input;
    if (this.input.if_mention === '') this.input.if_mention = 'always';

    this.octokit = getOctokit(githubToken);
    this.webclient = new WebClient(slackToken);
    this.fieldFactory = new FieldFactory(this.input.fields, this.jobName, this.octokit);
  }

  private get jobName() {
    const name = context.job;
    if (process.env.MATRIX_CONTEXT == null || process.env.MATRIX_CONTEXT === 'null') {
      return name;
    }

    const matrix = JSON.parse(process.env.MATRIX_CONTEXT);
    const value = Object.values(matrix).join(', ');
    return value !== '' ? `${name} (${value})` : name;
  }

  async composeMessage(): Promise<ChatPostMessageArguments> {
    const template = this.blocksTemplate();
    const blocks: (KnownBlock | Block)[] = [];

    if (this.input.header) {
      const block: HeaderBlock = {
        type: 'header',
        text: {
          type: 'plain_text',
          text: this.input.header,
          emoji: true,
        },
      };
      blocks.push(block);
    }

    if (this.input.text || this.input.mention) {
      const text = this.injectMentionIntoMessage(this.input.text);
      if (text) {
        const block: SectionBlock = {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: text,
          },
        };
        blocks.push(block);
      }
    }

    if (this.input.changelog) {
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Changelog*\n\`\`\`${this.input.changelog}\`\`\``,
        },
      };
      blocks.push(block);
    }

    const fields = await this.fieldFactory.fields();
    if (Array.isArray(fields) && fields.length !== 0) {
      const fieldsBlock: SectionBlock = {
        type: 'section',
        fields: await this.fieldFactory.fields(),
      };
      blocks.push(fieldsBlock);
    }

    if (this.input.buttons) {
      const buttonBlocks = this.parseButtons(this.input.buttons);
      if (Array.isArray(buttonBlocks) && buttonBlocks.length !== 0) {
        const block: ActionsBlock = {
          type: 'actions',
          elements: buttonBlocks,
        };
        blocks.push(block);
      }
    }

    const divider: DividerBlock = {
      type: 'divider',
    };
    blocks.push(divider);

    const messageContext: ContextBlock = {
      type: 'context',
      elements: [
        {
          type: 'image',
          image_url: 'https://github.githubassets.com/apple-touch-icon.png',
          alt_text: 'GitHub Logo',
        },
        {
          type: 'mrkdwn',
          text: `GitHub Action: ${context.workflow} <https://github.com/${context.repo.owner}/${
            context.repo.repo
          }/actions/runs/${context.runId}|#${context.runNumber}> ${iconForStatus(this.input.status)}`,
        },
      ],
    };
    blocks.push(messageContext);

    debug(JSON.stringify(blocks));

    template.blocks = blocks;

    return template;
  }

  custom(customBlocks: string): ChatPostMessageArguments {
    const blocks: (KnownBlock | Block)[] = JSON.parse(customBlocks);
    const postMessageArguments: ChatPostMessageArguments = {
      channel: this.input.channel,
      text: this.input.text,
      blocks,
    };
    return postMessageArguments;
  }

  async send(options: ChatPostMessageArguments): Promise<void> {
    debug(JSON.stringify(context, null, 2));
    await this.webclient.chat.postMessage(options);
    debug('send message');
  }

  injectMentionIntoMessage(message: string): string {
    switch (this.input.status) {
      case 'success':
      case 'failure':
      case 'cancelled': {
        const mention = this.mentionText(this.input.status);

        // Check if the message starts with a "fake headline" of bold text followed by a newline, e.g. *Comment*\n
        const regex = new RegExp('^\\*\\w+\\*\\n.*', 'g');
        const matches = regex.exec(message);
        if (mention && matches) {
          const position = message.indexOf('\n') + 1;
          return `${message.substring(0, position)}${mention} ${message.substring(position)}`.trim();
        } else if (mention) {
          return `${mention} ${message}`.trim();
        } else {
          return message.trim();
        }
      }
    }
    throw new Error(`invalid status: ${this.input.status}`);
  }

  mentionText(status: 'success' | 'failure' | 'cancelled' | 'always'): string {
    const { mention, if_mention } = this.input;
    if (!if_mention.includes(status) && if_mention !== 'always') {
      return '';
    }

    const normalized = mention.replace(/ /g, '');
    if (normalized !== '') {
      const text = normalized
        .split(',')
        .map(s => this.formatMentionString(s))
        .join(' ');
      return text;
    }
    return '';
  }

  parseButtons(buttons: string): Button[] {
    const lines = buttons.split('\n');
    const result: Button[] = lines.reduce((accumulator: Button[], currentValue: string) => {
      const components = currentValue.split('|', 3);
      if (components.length === 2 && components[0] && components[1]) {
        const block: Button = {
          type: 'button',
          text: {
            type: 'plain_text',
            text: components[0],
            emoji: true,
          },
          url: components[1],
        };
        accumulator.push(block);
      } else if (components.length === 3 && components[0] && components[1] && components[2]) {
        const block: Button = {
          type: 'button',
          text: {
            type: 'plain_text',
            text: components[0],
            emoji: true,
          },
          style: components[1] as Button['style'],
          url: components[2],
        };
        accumulator.push(block);
      }

      return accumulator;
    }, []);

    return result;
  }

  private formatMentionString(mention: string): string {
    const groupMention = ['here', 'channel'];
    const subteamMention = 'subteam^';
    if (mention.includes(subteamMention) || groupMention.includes(mention)) return `<!${mention}>`;

    return `<@${mention}>`;
  }

  private blocksTemplate(): ChatPostMessageArguments {
    const { channel, text } = this.input;

    return {
      channel,
      text,
      blocks: [],
    };
  }
}
