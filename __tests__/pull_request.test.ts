import nock from 'nock';

process.env.GITHUB_EVENT_NAME = 'pull_request';

import { setupNockCommit, getTemplate, newInput, gitHubToken, slackToken } from './helper';
import { Client } from '../src/client';
import { SectionBlock } from '@slack/web-api';

beforeAll(() => {
  // Mock logs so they don't show up in test logs.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  jest.spyOn(require('@actions/core'), 'debug').mockImplementation(jest.fn());
  nock.disableNetConnect();
  setupNockCommit(process.env.GITHUB_REPOSITORY as string, process.env.GITHUB_SHA as string);
});
afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('pull request event', () => {
  test('works on pull request event', async () => {
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

    const message = 'some trigger comment';
    const input = {
      ...newInput(),
      status: 'success',
      text: message,
      mention: 'octocat',
      if_mention: 'success',
      fields: 'pr,ref',
    };
    const client = new Client(input, gitHubToken, slackToken);
    const payload = getTemplate(input, process.env, sha);
    const block: SectionBlock = {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `<@octocat> ${message}`,
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    payload.blocks!.unshift(block);
    expect(await client.composeMessage()).toStrictEqual(payload);
  });
});
