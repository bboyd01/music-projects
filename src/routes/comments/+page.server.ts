import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { accessibleProjectIds } from '#lib/server/access.ts';

const LIMIT = 100;

/**
 * Recent comments across the projects you can see.
 * ?mentions=me (default) | all | <userId> — filter by who was @mentioned.
 */
export function load({ locals, url }) {
	const me = locals.user!;
	const projectIds = accessibleProjectIds(me.id);
	const filter = url.searchParams.get('mentions') ?? 'me';
	const mentionedUser = filter === 'all' ? null : filter === 'me' ? me.id : filter;

	// People who share a project with you (for the filter menu).
	const people = projectIds.length
		? db
				.selectDistinct({ id: schema.users.id, name: schema.users.name, username: schema.users.username })
				.from(schema.projectMembers)
				.innerJoin(schema.users, eq(schema.users.id, schema.projectMembers.userId))
				.where(inArray(schema.projectMembers.projectId, projectIds))
				.all()
				.sort((a, b) => a.name.localeCompare(b.name))
		: [];

	if (!projectIds.length) return { comments: [], people, filter };

	const conditions = [inArray(schema.comments.projectId, projectIds)];
	if (mentionedUser) {
		const ids = db
			.select({ id: schema.commentMentions.commentId })
			.from(schema.commentMentions)
			.where(eq(schema.commentMentions.userId, mentionedUser))
			.all()
			.map((r) => r.id);
		if (!ids.length) return { comments: [], people, filter };
		conditions.push(inArray(schema.comments.id, ids));
	}

	const comments = db
		.select({
			id: schema.comments.id,
			body: schema.comments.body,
			timestampSec: schema.comments.timestampSec,
			createdAt: schema.comments.createdAt,
			trackId: schema.tracks.id,
			trackTitle: schema.tracks.title,
			trackIcon: schema.tracks.icon,
			projectId: schema.projects.id,
			projectName: schema.projects.name,
			authorName: schema.users.name,
			authorUsername: schema.users.username
		})
		.from(schema.comments)
		.innerJoin(schema.tracks, eq(schema.tracks.id, schema.comments.trackId))
		.innerJoin(schema.projects, eq(schema.projects.id, schema.comments.projectId))
		.innerJoin(schema.users, eq(schema.users.id, schema.comments.authorId))
		.where(and(...conditions))
		.orderBy(desc(schema.comments.createdAt))
		.limit(LIMIT)
		.all();

	return { comments, people, filter };
}
