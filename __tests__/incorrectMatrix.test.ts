/* eslint-disable @typescript-eslint/no-non-null-assertion */
import nock from 'nock';

process.env.GITHUB_RUN_ID = '2';
process.env.MATRIX_CONTEXT = '{}';

import { getTemplate, gitHubToken, newInput, setupNockCommit, setupNockJobs, slackToken } from './helper';
import { Client } from '../src/client';
import { SectionBlock } from '@slack/web-api';

beforeAll(() => {
  // Mock logs so they don't show up in test logs.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  jest.spyOn(require('@actions/core'), 'warning').mockImplementation(jest.fn());
  // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
    const block: SectionBlock = {
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
