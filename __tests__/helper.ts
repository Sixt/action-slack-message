import nock from 'nock';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { iconForStatus, Input } from '../src/client';
import { FieldFactory } from '../src/fields';
import { getOctokit } from '@actions/github';
import { ChatPostMessageArguments, MrkdwnElement } from '@slack/web-api';

export const gitHubToken = 'github-token';
export const slackToken = 'token';

export const setupNockCommit = (repo: string, sha: string): unknown =>
  nock('https://api.github.com')
    .persist()
    .get(`/repos/${repo}/commits/${sha}`)
    .reply(200, () => getApiFixture('repos.commits.get'));

export const setupNockJobs = (repo: string, runId: string, fixture: string): unknown =>
  nock('https://api.github.com')
    .persist()
    .get(`/repos/${repo}/actions/runs/${runId}/jobs`)
    .reply(200, () => {
      const obj = getApiFixture(fixture);
      const now = new Date();
      now.setHours(now.getHours() - 1);
      now.setMinutes(now.getMinutes() - 1);
      now.setSeconds(now.getSeconds() - 1);
      obj.jobs[0].started_at = now.toISOString();
      return obj;
    });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getApiFixture = (name: string): any =>
  JSON.parse(readFileSync(resolve(__dirname, 'fixtures', `${name}.json`)).toString());

export const newInput = (): Input => {
  return {
    channel: '',
    mention: '',
    if_mention: '',
    status: '',
    fields: '',
    text: '',
    header: '',
    changelog: '',
    buttons: '',
    custom_blocks: '',
  };
};

export const getTemplate = (input: Input, env: NodeJS.ProcessEnv, sha?: string): ChatPostMessageArguments => {
  return {
    channel: input.channel,
    text: input.text,
    blocks: [
      {
        type: 'section',
        fields: fixedFields(input.fields, env, sha),
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'image',
            image_url: 'https://github.githubassets.com/apple-touch-icon.png',
            alt_text: 'GitHub Logo',
          },
          {
            type: 'mrkdwn',
            text: `GitHub Action: ${env.GITHUB_WORKFLOW} <https://github.com/${env.GITHUB_REPOSITORY}/actions/runs/${
              env.GITHUB_RUN_ID
            }|#${env.GITHUB_RUN_NUMBER as string}> ${iconForStatus(input.status)}`,
          },
        ],
      },
    ],
  };
};

const fixedFields = (fields: string, env: NodeJS.ProcessEnv, sha?: string): MrkdwnElement[] => {
  const ff = new FieldFactory(fields, env.GITHUB_JOB as string, getOctokit(gitHubToken));
  return ff.filterFields([
    ff.includes('repo') ? repo(env.GITHUB_REPOSITORY as string) : undefined,
    ff.includes('message') ? message() : undefined,
    ff.includes('commit') ? commit(env.GITHUB_REPOSITORY as string, env.GITHUB_SHA as string) : undefined,
    ff.includes('actor') ? actor(env.GITHUB_ACTOR as string) : undefined,
    ff.includes('job') ? job(env.GITHUB_REPOSITORY as string, env.GITHUB_JOB as string) : undefined,
    ff.includes('duration') ? duration() : undefined,
    ff.includes('eventName') ? eventName(env.GITHUB_EVENT_NAME as string) : undefined,
    ff.includes('ref') ? ref(env.GITHUB_REPOSITORY as string) : undefined,
    ff.includes('pr') ? pr(env.GITHUB_REPOSITORY as string, '123') : undefined,
    ff.includes('workflow')
      ? workflow(env.GITHUB_REPOSITORY as string, (sha ?? env.GITHUB_SHA) as string, env.GITHUB_WORKFLOW as string)
      : undefined,
  ]);
};

const repo = (repo: string): MrkdwnElement => {
  return createField({
    title: 'Repository',
    value: `<https://github.com/${repo}|${repo}>`,
  });
};

const message = (): MrkdwnElement => {
  const obj = getApiFixture('repos.commits.get');
  return createField({
    title: 'Message',
    value: `<${obj.html_url}|Fix all the bugs>`,
  });
};

const commit = (repo: string, sha: string): MrkdwnElement => {
  return createField({
    title: 'Commit',
    value: `<https://github.com/${repo}/commit/${sha}|${sha.slice(0, 8)}>`,
  });
};

const actor = (actor: string): MrkdwnElement => {
  return createField({
    title: 'Actor',
    value: `<https://github.com/${actor}|${actor}>`,
  });
};

const job = (repo: string, jobName: string): MrkdwnElement => {
  return createField({
    title: 'Job',
    value: `<https://github.com/${repo}/runs/399444496|${jobName}>`,
  });
};

const duration = (): MrkdwnElement => {
  return createField({
    title: 'Duration',
    value: '1 hour 1 min 1 sec',
  });
};

const eventName = (eventName: string): MrkdwnElement => {
  return createField({
    title: 'Event',
    value: eventName,
  });
};

const ref = (repo: string): MrkdwnElement => {
  return createField({
    title: 'Branch',
    value: `\`<https://github.com/${repo}/tree/feature/something-new-and-shiny|feature/something-new-and-shiny>\``,
  });
};

const pr = (repo: string, prNumber: string): MrkdwnElement | undefined => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const github = require('@actions/github');
  if (github.context.payload.pull_request) {
    return createField({
      title: 'Pull request',
      value: `<https://github.com/${repo}/pull/${prNumber}|#${prNumber}>`,
    });
  } else {
    return undefined;
  }
};

const workflow = (repo: string, sha: string, workflow: string): MrkdwnElement => {
  return createField({
    title: 'Workflow',
    value: `<https://github.com/${repo}/commit/${sha}/checks|${workflow}>`,
  });
};

function createField(input: { title: string; value: string }): MrkdwnElement {
  return {
    type: 'mrkdwn',
    text: `*${input.title}*\n${input.value}`,
  };
}
