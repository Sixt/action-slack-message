import { warning } from '@actions/core';
import { context } from '@actions/github';
import { MrkdwnElement } from '@slack/web-api';
import { env } from 'process';
import { Octokit } from './client';

export class FieldFactory {
  requestedFields: string[];
  jobName: string;
  private octokit: Octokit;

  constructor(fields: string, jobName: string, octokit: Octokit) {
    this.requestedFields = fields.replace(/ /g, '').split(',');
    this.jobName = jobName;
    this.octokit = octokit;
  }

  includes(field: string): boolean {
    return this.requestedFields.includes(field) || this.requestedFields.includes('all');
  }

  filterFields(fields: (MrkdwnElement | undefined)[]): MrkdwnElement[] {
    return fields.filter(element => element !== undefined) as MrkdwnElement[];
  }

  async fields(): Promise<MrkdwnElement[]> {
    return this.filterFields([
      this.includes('repo') ? createField('Repository', await this.repo()) : undefined,
      this.includes('message') ? createField('Message', await this.message()) : undefined,
      this.includes('commit') ? createField('Commit', await this.commit()) : undefined,
      this.includes('actor') ? createField('Actor', await this.actor()) : undefined,
      this.includes('job') ? createField('Job', await this.job()) : undefined,
      this.includes('duration') ? createField('Duration', await this.duration()) : undefined,
      this.includes('eventName') ? createField('Event', await this.eventName()) : undefined,
      this.includes('ref') ? createField(context.ref.includes('tags') ? 'Tag' : 'Branch', await this.ref()) : undefined,
      this.includes('pr') ? createField('Pull request', await this.pr()) : undefined,
      this.includes('workflow') ? createField('Workflow', await this.workflow()) : undefined,
    ]);
  }

  private async message(): Promise<string> {
    const resp = await this.getCommit(this.octokit);

    const value = `<${resp.data.html_url}|${resp.data.commit.message.split('\n')[0]}>`;
    return value;
  }

  private async actor(): Promise<string> {
    const value = `<https://github.com/${context.actor}|${context.actor}>`;
    return value;
  }

  private async duration(): Promise<string> {
    const resp = await this.octokit?.actions.listJobsForWorkflowRun({
      owner: context.repo.owner,
      repo: context.repo.repo,
      run_id: context.runId,
    });
    const currentJob = resp?.data.jobs.find(job => job.name === this.jobName);
    if (currentJob === undefined) {
      return this.jobIsNotFound;
    }

    let time = new Date().getTime() - new Date(currentJob.started_at).getTime();
    const h = Math.floor(time / (1000 * 60 * 60));
    time -= h * 1000 * 60 * 60;
    const m = Math.floor(time / (1000 * 60));
    time -= m * 1000 * 60;
    const s = Math.floor(time / 1000);

    let value = '';
    if (h > 0) {
      value += `${h} hour `;
    }
    if (m > 0) {
      value += `${m} min `;
    }
    if (s > 0) {
      value += `${s} sec`;
    }

    return value;
  }

  private async job(): Promise<string> {
    const { owner } = context.repo;
    const resp = await this.octokit?.actions.listJobsForWorkflowRun({
      owner,
      repo: context.repo.repo,
      run_id: context.runId,
    });
    const currentJob = resp?.data.jobs.find(job => job.name === this.jobName);
    if (currentJob === undefined) {
      return this.jobIsNotFound;
    }

    const jobId = currentJob.id;
    const value = `<https://github.com/${owner}/${context.repo.repo}/runs/${jobId}|${this.jobName}>`;

    return value;
  }

  private async commit(): Promise<string> {
    const { sha } = context;
    const { owner, repo } = context.repo;

    const value = `<https://github.com/${owner}/${repo}/commit/${sha}|${sha.slice(0, 8)}>`;
    return value;
  }

  private async repo(): Promise<string> {
    const { owner, repo } = context.repo;

    const value = `<https://github.com/${owner}/${repo}|${owner}/${repo}>`;
    return value;
  }

  private async eventName(): Promise<string> {
    const value = context.eventName;
    return value;
  }

  private async ref(): Promise<string> {
    const { owner, repo } = context.repo;
    const ref = context.ref;
    let value = ref;
    if (ref.includes('tags')) {
      const tag = extractName(ref);
      value = `\`<https://github.com/${owner}/${repo}/releases/tag/${tag}|${tag}>\``;
    } else if (ref.includes('heads')) {
      const branch = extractName(ref);
      value = `\`<https://github.com/${owner}/${repo}/tree/${branch}|${branch}>\``;
    } else if (ref.includes('pulls')) {
      const headRefEnvVar = env['GITHUB_HEAD_REF'];
      if (headRefEnvVar) {
        const branch = extractName(headRefEnvVar);
        value = `\`<https://github.com/${owner}/${repo}/tree/${branch}|${branch}>\``;
      }
    }

    return value;
  }

  private async pr(): Promise<string | undefined> {
    const { owner, repo } = context.repo;
    const { number: pull_number } = context.issue;
    if (pull_number) {
      const value = `<https://github.com/${owner}/${repo}/pull/${pull_number}|#${pull_number}>`;
      return value;
    } else {
      return undefined;
    }
  }

  private async workflow(): Promise<string> {
    const sha = context.payload.pull_request?.head.sha ?? context.sha;
    const { owner, repo } = context.repo;

    const value = `<https://github.com/${owner}/${repo}/commit/${sha}/checks|${context.workflow}>`;
    return value;
  }

  private async getCommit(octokit: Octokit) {
    const { owner, repo } = context.repo;
    const { sha: ref } = context;
    return await octokit.repos.getCommit({ owner, repo, ref });
  }

  private get jobIsNotFound() {
    warning(
      'Job is not found. This can happen if the job is part of a matrix build, but the matrix context was not passed as env variable. Please pass it as MATRIX_CONTEXT: ${{ toJson(matrix) }}.',
    );

    return 'Job is not found.';
  }
}

function createField(title: string, value: string | undefined): MrkdwnElement | undefined {
  if (value) {
    return {
      type: 'mrkdwn',
      text: `*${title}*\n${value}`,
    };
  } else {
    return undefined;
  }
}

function extractName(envVar: string): string {
  return envVar.replace(RegExp('^refs/(heads|tags)/'), '');
}
