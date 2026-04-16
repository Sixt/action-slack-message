import {
  header,
  section,
  changelog,
  buttons,
  divider,
  field,
  link,
  contextFooter,
  iconForStatus,
  mention,
  injectMention,
  compose,
} from '../src/blocks';

describe('block builders', () => {
  test('header', () => {
    expect(header('Hello')).toStrictEqual({
      type: 'header',
      text: { type: 'plain_text', text: 'Hello', emoji: true },
    });
  });

  test('header with emoji syntax', () => {
    expect(header(':rocket: Deploy')).toStrictEqual({
      type: 'header',
      text: { type: 'plain_text', text: ':rocket: Deploy', emoji: true },
    });
  });

  test('section', () => {
    expect(section('some *bold* text')).toStrictEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: 'some *bold* text' },
    });
  });

  test('changelog', () => {
    expect(changelog('abc123 fix: bug')).toStrictEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Changelog*\n```abc123 fix: bug```' },
    });
  });

  test('divider', () => {
    expect(divider()).toStrictEqual({ type: 'divider' });
  });

  test('field', () => {
    expect(field('Repository', 'Sixt/repo')).toStrictEqual({
      type: 'mrkdwn',
      text: '*Repository*\nSixt/repo',
    });
  });

  test('link', () => {
    expect(link('https://github.com/Sixt', 'Sixt')).toBe('<https://github.com/Sixt|Sixt>');
  });

  test('field + link compose nicely', () => {
    const f = field('Repo', link('https://github.com/Sixt/repo', 'Sixt/repo'));
    expect(f.text).toBe('*Repo*\n<https://github.com/Sixt/repo|Sixt/repo>');
  });
});

describe('buttons', () => {
  test('single button without style', () => {
    expect(buttons([{ title: 'View', url: 'https://example.com' }])).toStrictEqual({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View', emoji: true },
          url: 'https://example.com',
        },
      ],
    });
  });

  test('button with style', () => {
    const result = buttons([{ title: 'Install', url: 'https://example.com', style: 'primary' }]);
    expect(result.elements![0]).toMatchObject({ style: 'primary' });
  });

  test('button without style omits style key', () => {
    const result = buttons([{ title: 'View', url: 'https://example.com' }]);
    expect(result.elements![0]).not.toHaveProperty('style');
  });

  test('multiple buttons', () => {
    const result = buttons([
      { title: 'A', url: 'https://a.com' },
      { title: 'B', url: 'https://b.com', style: 'danger' },
    ]);
    expect(result.elements).toHaveLength(2);
  });
});

describe('contextFooter', () => {
  test('with icon and text', () => {
    expect(contextFooter({ icon: 'https://img.png', text: 'footer' })).toStrictEqual({
      type: 'context',
      elements: [
        { type: 'image', image_url: 'https://img.png', alt_text: 'GitHub Logo' },
        { type: 'mrkdwn', text: 'footer' },
      ],
    });
  });

  test('without icon', () => {
    expect(contextFooter({ text: 'footer only' })).toStrictEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: 'footer only' }],
    });
  });
});

describe('iconForStatus', () => {
  test('success', () => expect(iconForStatus('success')).toBe(':white_check_mark:'));
  test('failure', () => expect(iconForStatus('failure')).toBe(':no_entry:'));
  test('cancelled', () => expect(iconForStatus('cancelled')).toBe(':warning:'));
  test('unknown', () => expect(iconForStatus('custom')).toBe(':arrows_counterclockwise:'));
});

describe('mention', () => {
  test('returns formatted user mention', () => {
    expect(mention('user123', 'success', 'success')).toBe('<@user123>');
  });

  test('returns group mention for here', () => {
    expect(mention('here', 'success', 'success')).toBe('<!here>');
  });

  test('returns group mention for channel', () => {
    expect(mention('channel', 'failure', 'failure')).toBe('<!channel>');
  });

  test('returns subteam mention', () => {
    expect(mention('subteam^ABC', 'success', 'always')).toBe('<!subteam^ABC>');
  });

  test('multiple mentions', () => {
    expect(mention('user1,user2', 'success', 'success')).toBe('<@user1> <@user2>');
  });

  test('mixed user and group mentions', () => {
    expect(mention('user1,here', 'success', 'always')).toBe('<@user1> <!here>');
  });

  test('strips spaces from csv', () => {
    expect(mention('user1, user2', 'success', 'always')).toBe('<@user1> <@user2>');
  });

  test('returns undefined when status does not match ifMention', () => {
    expect(mention('here', 'success', 'failure')).toBeUndefined();
  });

  test('returns undefined for empty target', () => {
    expect(mention('', 'success', 'always')).toBeUndefined();
  });

  test('defaults to always when ifMention is empty', () => {
    expect(mention('here', 'success', '')).toBe('<!here>');
  });

  test('matches one of multiple ifMention conditions', () => {
    expect(mention('here', 'success', 'failure,success')).toBe('<!here>');
  });
});

describe('injectMention', () => {
  test('prepends mention to plain message', () => {
    expect(injectMention('hello', '<!here>')).toBe('<!here> hello');
  });

  test('injects mention after fake headline', () => {
    expect(injectMention('*Title*\nbody text', '<!here>')).toBe('*Title*\n<!here> body text');
  });

  test('returns trimmed message when no mention', () => {
    expect(injectMention('  hello  ', undefined)).toBe('hello');
  });

  test('returns just mention when message is empty', () => {
    expect(injectMention('', '<!here>')).toBe('<!here>');
  });
});

describe('compose', () => {
  test('minimal: header only', () => {
    const blocks = compose({ header: 'Test' });
    expect(blocks).toStrictEqual([{ type: 'header', text: { type: 'plain_text', text: 'Test', emoji: true } }]);
  });

  test('text only', () => {
    const blocks = compose({ text: 'hello' });
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: 'section', text: { text: 'hello' } });
  });

  test('full message with all options', () => {
    const blocks = compose({
      header: 'Build',
      text: 'passed',
      changelog: 'abc fix',
      fields: [{ type: 'mrkdwn', text: '*Repo*\ntest' }],
      buttons: [{ title: 'View', url: 'https://example.com' }],
      footerIcon: 'https://icon.png',
      footerText: 'Footer',
    });

    const types = blocks.map(b => b.type);
    expect(types).toStrictEqual(['header', 'section', 'section', 'section', 'actions', 'divider', 'context']);
  });

  test('no divider when no footer', () => {
    const blocks = compose({ header: 'Test', text: 'hello' });
    expect(blocks.find(b => b.type === 'divider')).toBeUndefined();
  });

  test('divider present when footer provided', () => {
    const blocks = compose({ text: 'hello', footerText: 'Footer' });
    const types = blocks.map(b => b.type);
    expect(types).toContain('divider');
    expect(types).toContain('context');
    expect(types.indexOf('divider')).toBeLessThan(types.indexOf('context'));
  });

  test('mention is injected into text', () => {
    const blocks = compose({
      text: 'hello',
      mention: 'here',
      status: 'success',
      ifMention: 'success',
    });
    expect(blocks[0]).toMatchObject({ type: 'section', text: { text: '<!here> hello' } });
  });

  test('mention without matching status is not injected', () => {
    const blocks = compose({
      text: 'hello',
      mention: 'here',
      status: 'success',
      ifMention: 'failure',
    });
    expect(blocks[0]).toMatchObject({ type: 'section', text: { text: 'hello' } });
  });

  test('empty fields are not included', () => {
    const blocks = compose({ text: 'hello', fields: [] });
    expect(blocks.find(b => b.fields)).toBeUndefined();
  });

  test('empty buttons are not included', () => {
    const blocks = compose({ text: 'hello', buttons: [] });
    expect(blocks.find(b => b.type === 'actions')).toBeUndefined();
  });
});
