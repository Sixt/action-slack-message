/* eslint-disable @typescript-eslint/no-non-null-assertion */
import nock from 'nock';
import {
  setupNockCommit,
  setupNockJobs,
  getTemplate,
  getApiFixture,
  newInput,
  gitHubToken,
  slackToken,
} from './helper';

import { Client, Input } from '../src/client';
import { ActionsBlock, Button, HeaderBlock, SectionBlock } from '@slack/web-api';

beforeAll(() => {
  // Mock logs so they don't show up in test logs.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  jest.spyOn(require('@actions/core'), 'debug').mockImplementation(jest.fn());
  nock.disableNetConnect();
  setupNockCommit(process.env.GITHUB_REPOSITORY as string, process.env.GITHUB_SHA as string);
  setupNockJobs(process.env.GITHUB_REPOSITORY as string, process.env.GITHUB_RUN_ID as string, 'actions.runs.jobs');
});
afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('Client', () => {
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const github = require('@actions/github');
    github.context.payload = {};
  });

  describe('constructor', () => {
    afterEach(() => {
      delete process.env.MATRIX_CONTEXT;
    });

    test('init uses given fields', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        fields: 'workflow,branch,actor,duration',
      };
      const client = new Client(input, gitHubToken, slackToken);
      expect(client.input).toStrictEqual(input);
    });

    test('init uses default if_mention when none given', async () => {
      const input = {
        ...newInput(),
        status: 'success',
      };
      const client = new Client(input, gitHubToken, slackToken);
      expect(client.input.if_mention).toStrictEqual('always');
    });

    test('init uses correct job name', async () => {
      const input = {
        ...newInput(),
        status: 'success',
      };
      const client = new Client(input, gitHubToken, slackToken);
      expect(client.fieldFactory.jobName).toStrictEqual('build');
    });

    test('init uses correct job name when matrix build', async () => {
      process.env.MATRIX_CONTEXT = '{"os": "ubuntu-18.04"}';
      const input = {
        ...newInput(),
        status: 'success',
      };
      const client = new Client(input, gitHubToken, slackToken);
      expect(client.fieldFactory.jobName).toStrictEqual('build (ubuntu-18.04)');
    });
  });

  describe('specific fields combinations', () => {
    test('all individual fields when push event', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        fields: 'repo,message,commit,actor,job,duration,eventName,ref,pr,workflow',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('all individual fields when pull_request event', async () => {
      process.env.GITHUB_EVENT_NAME = 'pull_request';
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const github = require('@actions/github');
      const sha = 'expected-sha-for-pull_request_event';
      github.context.payload = {
        pull_request: {
          number: 123,
          head: { sha },
        },
      };
      github.context.eventName = 'pull_request';
      github.context.runNumber = process.env.GITHUB_RUN_NUMBER;
      const input = {
        ...newInput(),
        status: 'success',
        fields: 'repo,message,commit,actor,job,duration,eventName,ref,pr,workflow',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env, sha);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('all fields', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        fields: 'all',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('pr without pull_request event', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        fields: 'pr',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('no fields', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        fields: '',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });
  });

  describe('compose message', () => {
    test('with status', async () => {
      const input = {
        ...newInput(),
        status: 'success',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('with header', async () => {
      const input = {
        ...newInput(),
        header: 'Build success',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: HeaderBlock = {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${input.header}`,
          emoji: true,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('with message', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        text: '*Comment*\nLorem ipsum',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('with mention', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        if_mention: 'always',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '<!here>',
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('with mention and message', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        if_mention: 'always',
        text: 'Lorem ipsum',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '<!here> Lorem ipsum',
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('with mention and fake headline message', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        if_mention: 'always',
        text: '*Comment*\nLorem ipsum',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Comment*\n<!here> Lorem ipsum',
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('with changelog', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        changelog:
          '- Lorem ipsum dolor sit amet\n- consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Tincidunt ornare massa eget egestas purus viverra accumsan in nisl.',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Changelog*\n\`\`\`${input.changelog}\`\`\``,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('with buttons', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        buttons: 'Download|primary|https://example.com/file.txt',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: ActionsBlock = {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Download',
              emoji: true,
            },
            style: 'primary',
            url: 'https://example.com/file.txt',
          },
        ],
      };

      payload.blocks!.splice(1, 0, block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });
  });

  describe('mention requirements', () => {
    test('does not match the requirements of the mention', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        if_mention: 'failure',
        text: 'mention test',
      };
      let client = new Client(input, gitHubToken, slackToken);
      let payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);

      input.mention = '';
      input.status = 'failure';
      client = new Client(input, gitHubToken, slackToken);
      payload = getTemplate(input, process.env);

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('matches some of the conditions of the mention', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        if_mention: 'failure,success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!here> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('can be mentioned on success', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!here> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('can be mentioned on failure', async () => {
      const input = {
        ...newInput(),
        status: 'failure',
        mention: 'here',
        if_mention: 'failure',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!here> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('can be mentioned on cancelled', async () => {
      const input = {
        ...newInput(),
        status: 'cancelled',
        mention: 'here',
        if_mention: 'cancelled',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!here> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('can be mentioned on always', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        if_mention: 'always',
        text: 'mention test',
      };
      let client = new Client(input, gitHubToken, slackToken);
      let payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!here> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);

      input.status = 'failure';
      client = new Client(input, gitHubToken, slackToken);
      payload = getTemplate(input, process.env);
      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);

      input.status = 'cancelled';
      client = new Client(input, gitHubToken, slackToken);
      payload = getTemplate(input, process.env);
      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('can be mentioned without if_mention condition', async () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        text: 'mention test',
      };
      let client = new Client(input, gitHubToken, slackToken);
      let payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!here> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);

      input.status = 'failure';
      client = new Client(input, gitHubToken, slackToken);
      payload = getTemplate(input, process.env);
      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);

      input.status = 'cancelled';
      client = new Client(input, gitHubToken, slackToken);
      payload = getTemplate(input, process.env);
      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('mentions one user', async () => {
      const input: Input = {
        ...newInput(),
        status: 'success',
        mention: 'user_id',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@user_id> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('can be mentioned here', async () => {
      const input: Input = {
        ...newInput(),
        status: 'success',
        mention: 'here',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!here> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('can be mentioned channel', async () => {
      const input: Input = {
        ...newInput(),
        status: 'success',
        mention: 'channel',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!channel> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('mentions a user group', async () => {
      const input: Input = {
        ...newInput(),
        status: 'success',
        mention: 'subteam^user_group_id',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!subteam^user_group_id> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('mentions multiple user groups', async () => {
      const input: Input = {
        ...newInput(),
        status: 'success',
        mention: 'subteam^user_group_id,subteam^user_group_id2',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<!subteam^user_group_id> <!subteam^user_group_id2> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('mentions multiple users', async () => {
      const input: Input = {
        ...newInput(),
        status: 'success',
        mention: 'user_id,user_id2',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@user_id> <@user_id2> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('mentions mix of user and user group', async () => {
      const input: Input = {
        ...newInput(),
        status: 'success',
        mention: 'user_id,subteam^user_group_id',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@user_id> <!subteam^user_group_id> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });

    test('removes csv space', async () => {
      const input: Input = {
        ...newInput(),
        status: 'success',
        mention: 'user_id, user_id2',
        if_mention: 'success',
        text: 'mention test',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const payload = getTemplate(input, process.env);
      const block: SectionBlock = {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `<@user_id> <@user_id2> ${input.text}`,
        },
      };

      payload.blocks!.unshift(block);
      expect(await client.composeMessage()).toStrictEqual(payload);
    });
  });

  describe('custom blocks', () => {
    test('only contains given blocks and no fields', async () => {
      const input = {
        ...newInput(),
        status: 'custom',
        text: 'Lorem ipsum',
        fields: 'all',
      };
      const client = new Client(input, gitHubToken, slackToken);
      expect(
        await client.custom('[{"type": "section", "text": {"type": "mrkdwn", "text": "custom message"}}]'),
      ).toMatchObject({
        text: 'Lorem ipsum',
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: 'custom message',
            },
          },
        ],
      });
    });
  });

  test('send payload', async () => {
    const fn = jest.fn();
    nock('https://slack.com')
      .post('/api/chat.postMessage', body => {
        fn();
        expect(body).toMatchObject({ channel: 'C123', text: 'Lorem ipsum', token: 'token' });
        return body;
      })
      .reply(200, () => getApiFixture('chat.postmessage'));

    const input = newInput();
    const client = new Client(input, gitHubToken, 'token');

    await client.send({ channel: 'C123', text: 'Lorem ipsum' });

    expect(fn).toBeCalledTimes(1);
  });

  describe('injectMentionIntoMessage', () => {
    test('returns an exception that it is an unusual status', () => {
      const input = {
        ...newInput(),
        status: 'custom',
      };
      const client = new Client(input, gitHubToken, slackToken);
      expect(() => client.injectMentionIntoMessage('')).toThrow();
    });
  });

  describe('mentionText', () => {
    test('returns proper user and group mentions', () => {
      const input = {
        ...newInput(),
        status: 'success',
        mention: 'test1,test2, here',
        if_mention: 'success',
      };
      const client = new Client(input, gitHubToken, slackToken);
      expect(client.mentionText('success')).toStrictEqual('<@test1> <@test2> <!here>');
    });
  });

  describe('parseButtons', () => {
    test('with one button', () => {
      const input = {
        ...newInput(),
        status: 'success',
        buttons: 'Download|primary|https://example.com/file.txt',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const buttons: Button[] = [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Download',
            emoji: true,
          },
          style: 'primary',
          url: 'https://example.com/file.txt',
        },
      ];

      expect(client.parseButtons(input.buttons)).toStrictEqual(buttons);
    });

    test('with multiple buttons', () => {
      const input = {
        ...newInput(),
        status: 'success',
        buttons: 'Download|primary|https://example.com/file1.txt\nInstall|https://example.com/file2.txt\n',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const buttons: Button[] = [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Download',
            emoji: true,
          },
          style: 'primary',
          url: 'https://example.com/file1.txt',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Install',
            emoji: true,
          },
          url: 'https://example.com/file2.txt',
        },
      ];

      expect(client.parseButtons(input.buttons)).toStrictEqual(buttons);
    });

    test('with wrong format', () => {
      const input = {
        ...newInput(),
        status: 'success',
        buttons: '[Download](https://example.com/file.txt)',
      };
      const client = new Client(input, gitHubToken, slackToken);
      const buttons: Button[] = [];

      expect(client.parseButtons(input.buttons)).toStrictEqual(buttons);
    });
  });
});
