import { PostMessageOptions, PostMessageResult } from './types';

export async function postMessage({ token, channel, text, blocks }: PostMessageOptions): Promise<PostMessageResult> {
  const payload: Record<string, unknown> = { channel, text };
  if (blocks?.length) payload.blocks = blocks;

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as { ok: boolean; error?: string; ts?: string; channel?: string };
  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }

  if (!result.ts || !result.channel) {
    throw new Error('Slack API error: missing ts or channel in response');
  }

  return { ts: result.ts, channel: result.channel };
}
