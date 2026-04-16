"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.header = header;
exports.section = section;
exports.changelog = changelog;
exports.buttons = buttons;
exports.divider = divider;
exports.field = field;
exports.link = link;
exports.contextFooter = contextFooter;
exports.iconForStatus = iconForStatus;
exports.mention = mention;
exports.injectMention = injectMention;
exports.compose = compose;
function header(text) {
    return {
        type: 'header',
        text: {
            type: 'plain_text',
            text,
            emoji: true,
        },
    };
}
function section(mrkdwn) {
    return {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: mrkdwn,
        },
    };
}
function changelog(text) {
    return {
        type: 'section',
        text: {
            type: 'mrkdwn',
            text: `*Changelog*\n\`\`\`${text}\`\`\``,
        },
    };
}
function buttons(defs) {
    return {
        type: 'actions',
        elements: defs.map(def => {
            const btn = {
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
function divider() {
    return { type: 'divider' };
}
function field(title, value) {
    return { type: 'mrkdwn', text: `*${title}*\n${value}` };
}
function link(url, text) {
    return `<${url}|${text}>`;
}
function contextFooter(opts) {
    const elements = [];
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
function iconForStatus(status) {
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
function mention(target, status, ifMention) {
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
function formatMentionString(m) {
    const groupMention = ['here', 'channel'];
    const subteamMention = 'subteam^';
    if (m.includes(subteamMention) || groupMention.includes(m))
        return `<!${m}>`;
    return `<@${m}>`;
}
function injectMention(message, mentionText) {
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
function compose(options) {
    const blocks = [];
    if (options.header) {
        blocks.push(header(options.header));
    }
    if (options.text || options.mention) {
        const mentionText = options.mention && options.status
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
    if (options.footerText) {
        blocks.push(divider());
        blocks.push(contextFooter({
            icon: options.footerIcon,
            text: options.footerText,
        }));
    }
    return blocks;
}
