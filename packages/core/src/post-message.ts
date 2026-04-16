import { PostMessageOptions } from './types';

export async function postMessage({ token, channel, text, blocks }: PostMessageOptions): Promise<void> {
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

  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }
}
