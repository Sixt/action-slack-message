import { SlackBlock, ButtonDefinition, ComposeOptions } from './types';

export function header(text: string): SlackBlock {
  return {
    type: 'header',
    text: {
      type: 'plain_text',
      text,
      emoji: true,
    },
  };
}

export function section(mrkdwn: string): SlackBlock {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: mrkdwn,
    },
  };
}

export function changelog(text: string): SlackBlock {
  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Changelog*\n\`\`\`${text}\`\`\``,
    },
  };
}

export function buttons(defs: ButtonDefinition[]): SlackBlock {
  return {
    type: 'actions',
    elements: defs.map(def => {
      const btn: Record<string, unknown> = {
        type: 'button',
        text: {
          type: 'plain_text',
          text: def.title,
          emoji: true,
        },
        url: def.url,
      };
      if (def.style) {
        btn.style = def.style;
      }
      return btn;
    }),
  };
}

export function divider(): SlackBlock {
  return { type: 'divider' };
}

export function contextFooter(opts: { icon?: string; text: string }): SlackBlock {
  const elements: Record<string, unknown>[] = [];
  if (opts.icon) {
    elements.push({
      type: 'image',
      image_url: opts.icon,
      alt_text: 'GitHub Logo',
    });
  }
  elements.push({
    type: 'mrkdwn',
    text: opts.text,
  });
  return {
    type: 'context',
    elements,
  };
}

export function iconForStatus(status: string): string {
  switch (status) {
    case 'success':
      return ':white_check_mark:';
    case 'failure':
      return ':no_entry:';
    case 'cancelled':
      return ':warning:';
    default:
      return ':arrows_counterclockwise:';
  }
}

export function mention(target: string, status: string, ifMention: string): string | undefined {
  const effectiveIfMention = ifMention || 'always';
  if (!effectiveIfMention.includes(status) && effectiveIfMention !== 'always') {
    return undefined;
  }

  const normalized = target.replace(/ /g, '');
  if (normalized === '') {
    return undefined;
  }

  return normalized
    .split(',')
    .map(s => formatMentionString(s))
    .join(' ');
}

function formatMentionString(m: string): string {
  const groupMention = ['here', 'channel'];
  const subteamMention = 'subteam^';
  if (m.includes(subteamMention) || groupMention.includes(m)) return `<!${m}>`;
  return `<@${m}>`;
}

export function injectMention(message: string, mentionText: string | undefined): string {
  if (!mentionText) {
    return message.trim();
  }

  // Check if the message starts with a "fake headline" of bold text followed by a newline, e.g. *Comment*\n
  const regex = new RegExp('^\\*\\w+\\*\\n.*', 'g');
  const matches = regex.exec(message);
  if (matches) {
    const position = message.indexOf('\n') + 1;
    return `${message.substring(0, position)}${mentionText} ${message.substring(position)}`.trim();
  }

  return `${mentionText} ${message}`.trim();
}

export function compose(options: ComposeOptions): SlackBlock[] {
  const blocks: SlackBlock[] = [];

  if (options.header) {
    blocks.push(header(options.header));
  }

  if (options.text || options.mention) {
    const mentionText =
      options.mention && options.status
        ? mention(options.mention, options.status, options.ifMention || '')
        : undefined;
    const text = injectMention(options.text || '', mentionText);
    if (text) {
      blocks.push(section(text));
    }
  }

  if (options.changelog) {
    blocks.push(changelog(options.changelog));
  }

  if (options.fields && options.fields.length > 0) {
    blocks.push({
      type: 'section',
      fields: options.fields,
    });
  }

  if (options.buttons && options.buttons.length > 0) {
    blocks.push(buttons(options.buttons));
  }

  blocks.push(divider());

  if (options.footerText) {
    blocks.push(
      contextFooter({
        icon: options.footerIcon,
        text: options.footerText,
      }),
    );
  }

  return blocks;
}
