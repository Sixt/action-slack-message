import { getInput, debug, setFailed } from '@actions/core';
import { Client } from './client';

async function run(): Promise<void> {
  try {
    const github_token = getInput('github_token', { required: true });
    const slack_token = getInput('slack_token', { required: true });
    const channel = getInput('channel', { required: true });
    const status = getInput('status', { required: true }).toLowerCase();
    const mention = getInput('mention');
    const if_mention = getInput('if_mention').toLowerCase();
    const fields = getInput('fields');
    const text = getInput('text');
    const header = getInput('header');
    const changelog = getInput('changelog');
    const buttons = getInput('buttons');
    const custom_blocks = getInput('custom_blocks');

    debug(`channel: ${channel}`);
    debug(`status: ${status}`);
    debug(`mention: ${mention}`);
    debug(`if_mention: ${if_mention}`);
    debug(`fields: ${fields}`);
    debug(`text: ${text}`);
    debug(`header: ${header}`);
    debug(`changelog: ${changelog}`);
    debug(`buttons: ${buttons}`);
    debug(`custom_blocks: ${custom_blocks}`);

    if (!header && !text && !custom_blocks) {
      throw new Error(`It is required to provide one of the following inputs: 'header', 'text' or 'custom_blocks'.`);
    }

    const client = new Client(
      {
        channel,
        mention,
        if_mention,
        status,
        fields,
        text,
        header,
        changelog,
        buttons,
        custom_blocks,
      },
      github_token,
      slack_token,
    );

    if (custom_blocks) {
      await client.send(await client.custom(custom_blocks));
    } else {
      await client.send(await client.composeMessage());
    }
  } catch (error) {
    setFailed(error.message);
  }
}

run();
