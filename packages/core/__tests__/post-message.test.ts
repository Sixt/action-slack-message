import nock from 'nock';
import { postMessage } from '../src/post-message';

beforeAll(() => {
  nock.disableNetConnect();
});

afterAll(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('postMessage', () => {
  test('sends message and returns ts + channel', async () => {
    nock('https://slack.com')
      .post('/api/chat.postMessage', body => {
        expect(body).toMatchObject({ channel: '#test', text: 'hello' });
        expect(body).not.toHaveProperty('blocks');
        return true;
      })
      .reply(200, { ok: true, ts: '1234.5678', channel: 'C123' });

    const result = await postMessage({ token: 'xoxb-token', channel: '#test', text: 'hello' });
    expect(result).toStrictEqual({ ts: '1234.5678', channel: 'C123' });
  });

  test('includes blocks when provided', async () => {
    nock('https://slack.com')
      .post('/api/chat.postMessage', body => {
        expect(body.blocks).toHaveLength(1);
        expect(body.blocks[0].type).toBe('section');
        return true;
      })
      .reply(200, { ok: true, ts: '1234.5678', channel: 'C123' });

    await postMessage({
      token: 'xoxb-token',
      channel: '#test',
      text: 'hello',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'hi' } }],
    });
  });

  test('throws on Slack API error', async () => {
    nock('https://slack.com').post('/api/chat.postMessage').reply(200, { ok: false, error: 'channel_not_found' });

    await expect(postMessage({ token: 'xoxb-token', channel: '#bad', text: 'hi' })).rejects.toThrow(
      'Slack API error: channel_not_found',
    );
  });

  test('sends token in Authorization header', async () => {
    nock('https://slack.com', {
      reqheaders: {
        authorization: 'Bearer xoxb-my-token',
      },
    })
      .post('/api/chat.postMessage')
      .reply(200, { ok: true, ts: '1', channel: 'C1' });

    await postMessage({ token: 'xoxb-my-token', channel: '#test', text: 'hi' });
  });
});
