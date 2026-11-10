import { config } from './config';
import { formatTime } from '#lib/time.ts';

type CommentEvent = {
	webhookUrl: string | null;
	author: string;
	projectName: string;
	trackTitle: string;
	trackUrl: string;
	body: string;
	timestampSec: number | null;
	mentionDiscordIds: string[];
};

/** Fire-and-forget: Discord problems must never break commenting in the app. */
export function notifyDiscord(ev: CommentEvent) {
	const url = ev.webhookUrl || config.discordWebhookUrl;
	if (!url) return;
	const mentions = ev.mentionDiscordIds.map((id) => `<@${id}>`).join(' ');
	const stamp = ev.timestampSec != null ? `\`${formatTime(ev.timestampSec)}\` ` : '';
	const payload = {
		username: 'Music Projects',
		content: mentions || undefined,
		allowed_mentions: { users: ev.mentionDiscordIds },
		embeds: [
			{
				author: { name: ev.author },
				title: `${ev.projectName} — ${ev.trackTitle}`.slice(0, 256),
				url: config.publicUrl ? config.publicUrl + ev.trackUrl : undefined,
				description: (stamp + ev.body).slice(0, 4000),
				color: 0xc9a35c,
				timestamp: new Date().toISOString()
			}
		]
	};
	fetch(url, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(payload),
		signal: AbortSignal.timeout(8000)
	})
		.then((r) => {
			if (!r.ok) console.warn(`[discord] webhook responded ${r.status}`);
		})
		.catch((e) => console.warn('[discord] webhook failed:', e.message));
}
