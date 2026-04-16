import nock from 'nock';

process.env.GITHUB_RUN_ID = '2';
process.env.MATRIX_CONTEXT = '{}';

import { getTemplate, gitHubToken, newInput, setupNockCommit, setupNockJobs, slackToken } from './helper';
import { Client } from '../src/client';
import { SlackBlock } from '@sixt/slack-message';

beforeAll(() => {
  // Mock logs so they don't show up in test logs.
  jest.spyOn(require('@actions/core'), 'warning').mockImplementation(jest.fn());
  jest.spyOn(require('@actions/core'), 'debug').mockImplementation(jest.fn());
  nock.disableNetConnect();
  setupNockCommit(process.env.GITHUB_REPOSITORY as string, process.env.GITHUB_SHA as string);
  setupNockJobs(
    process.env.GITHUB_REPOSITORY as string,
    process.env.GITHUB_RUN_ID as string,
    'actions.matrix-runs.jobs',
  );
});
afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('MATRIX_CONTEXT', () => {
  beforeEach(() => {
    process.env.GITHUB_EVENT_NAME = 'push';
    const github = require('@actions/github');
    github.context.payload = {};
  });

  test('not runs in matrix', async () => {
    const input = {
      ...newInput(),
      status: 'success',
      fields: 'job,duration',
    };
    const client = new Client(input, gitHubToken, slackToken);
    const payload = getTemplate(input, process.env);
    const block: SlackBlock = {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: '*Job*\nJob is not found.',
        },
        { type: 'mrkdwn', text: '*Duration*\nJob is not found.' },
      ],
    };

    // replace fields block with custom block
    payload.blocks = payload.blocks!.slice(1);
    payload.blocks!.unshift(block);
    expect(await client.composeMessage()).toStrictEqual(payload);
  });
});
