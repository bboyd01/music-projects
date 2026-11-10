import { json } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { nullableNum, readJson, str } from '#lib/server/http.ts';
import { extractMentions } from '#lib/mentions.ts';
import { notifyDiscord } from '#lib/server/discord.ts';

export async function POST({ params, request, locals }) {
	// Viewers can comment: feedback is the point of sharing a project.
	const { user, track } = requireTrackAccess(locals.user, params.id, 'viewer');
	const body = await readJson(request);
	const text = str(body.body, 'Comment', { min: 1, max: 5000 });
	const ts = nullableNum(body.timestampSec, 'Timestamp');
	const timestampSec = ts == null ? null : Math.max(0, ts);

	// Mentions resolve only to members of this project.
	const handles = extractMentions(text);
	const mentioned = handles.length
		? db
				.select({ id: schema.users.id, discordUserId: schema.users.discordUserId })
				.from(schema.users)
				.innerJoin(
					schema.projectMembers,
					and(eq(schema.projectMembers.userId, schema.users.id), eq(schema.projectMembers.projectId, track.projectId))
				)
				.where(inArray(schema.users.username, handles))
				.all()
		: [];

	const id = newId();
	db.transaction((tx) => {
		tx.insert(schema.comments)
			.values({ id, projectId: track.projectId, trackId: track.id, authorId: user.id, body: text, timestampSec, createdAt: Date.now() })
			.run();
		if (mentioned.length) {
			tx.insert(schema.commentMentions).values(mentioned.map((m) => ({ commentId: id, userId: m.id }))).run();
		}
	});

	const project = db.select().from(schema.projects).where(eq(schema.projects.id, track.projectId)).get()!;
	notifyDiscord({
		webhookUrl: project.discordWebhookUrl,
		author: user.name,
		projectName: project.name,
		trackTitle: track.title,
		trackUrl: `/projects/${project.id}/tracks/${track.id}`,
		body: text,
		timestampSec,
		mentionDiscordIds: mentioned.map((m) => m.discordUserId).filter((d): d is string => !!d)
	});
	return json({ id }, { status: 201 });
}
