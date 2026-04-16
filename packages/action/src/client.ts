import { debug } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import {
  compose,
  iconForStatus,
  injectMention,
  mention,
  postMessage,
  SlackBlock,
  ButtonDefinition,
  ButtonStyle,
} from '@sixt/slack-message';
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



export class Client {
  input: Input;
  fieldFactory: FieldFactory;
  private slackToken: string;
  private octokit: Octokit;

  constructor(input: Input, githubToken: string, slackToken: string) {
    this.input = input;
    if (this.input.if_mention === '') this.input.if_mention = 'always';

    this.slackToken = slackToken;
    this.octokit = getOctokit(githubToken);
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

  async composeMessage(): Promise<{ channel: string; text: string; blocks: SlackBlock[] }> {
    const fields = await this.fieldFactory.fields();

    const buttonDefs = this.input.buttons ? this.parseButtons(this.input.buttons) : undefined;

    const footerText = `GitHub Action: ${context.workflow} <https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${context.runId}|#${context.runNumber}> ${iconForStatus(this.input.status)}`;

    const blocks = compose({
      header: this.input.header || undefined,
      text: this.input.text || undefined,
      changelog: this.input.changelog || undefined,
      buttons: buttonDefs,
      mention: this.input.mention || undefined,
      status: this.input.status as 'success' | 'failure' | 'cancelled',
      ifMention: this.input.if_mention || undefined,
      fields: Array.isArray(fields) && fields.length !== 0 ? fields : undefined,
      footerIcon: 'https://github.githubassets.com/apple-touch-icon.png',
      footerText,
    });

    debug(JSON.stringify(blocks));

    return {
      channel: this.input.channel,
      text: this.input.text,
      blocks,
    };
  }

  custom(customBlocks: string): { channel: string; text: string; blocks: SlackBlock[] } {
    const blocks: SlackBlock[] = JSON.parse(customBlocks);
    return {
      channel: this.input.channel,
      text: this.input.text,
      blocks,
    };
  }

  async send(options: { channel: string; text: string; blocks?: SlackBlock[] }): Promise<void> {
    debug(JSON.stringify(context, null, 2));
    await postMessage({
      token: this.slackToken,
      channel: options.channel,
      text: options.text,
      blocks: options.blocks,
    });
    debug('send message');
  }

  injectMentionIntoMessage(message: string): string {
    switch (this.input.status) {
      case 'success':
      case 'failure':
      case 'cancelled': {
        const mentionText = mention(this.input.mention, this.input.status, this.input.if_mention);
        return injectMention(message, mentionText);
      }
    }
    throw new Error(`invalid status: ${this.input.status}`);
  }

  mentionText(status: 'success' | 'failure' | 'cancelled' | 'always'): string {
    return mention(this.input.mention, status, this.input.if_mention) || '';
  }

  parseButtons(buttonsStr: string): ButtonDefinition[] {
    const lines = buttonsStr.split('\n');
    return lines.reduce((accumulator: ButtonDefinition[], currentValue: string) => {
      const components = currentValue.split('|', 3);
      if (components.length === 2 && components[0] && components[1]) {
        accumulator.push({
          title: components[0],
          url: components[1],
        });
      } else if (components.length === 3 && components[0] && components[1] && components[2]) {
        accumulator.push({
          title: components[0],
          url: components[2],
          style: components[1] as ButtonStyle,
        });
      }
      return accumulator;
    }, []);
  }
}
