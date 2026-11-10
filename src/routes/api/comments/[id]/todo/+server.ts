import { error, json } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireProjectAccess } from '#lib/server/access.ts';

/** One-click: turn a comment into a todo in the track's first checklist (keeps its timestamp). */
export function POST({ params, locals }) {
	const c = db.select().from(schema.comments).where(eq(schema.comments.id, params.id)).get();
	if (!c) error(404, 'Comment not found');
	requireProjectAccess(locals.user, c.projectId, 'editor');

	const existing = db.select({ id: schema.todos.id }).from(schema.todos).where(eq(schema.todos.sourceCommentId, c.id)).get();
	if (existing) return json({ id: existing.id, existed: true });

	let list = db
		.select()
		.from(schema.checklists)
		.where(eq(schema.checklists.trackId, c.trackId))
		.orderBy(asc(schema.checklists.sortOrder), asc(schema.checklists.createdAt))
		.get();
	if (!list) {
		list = { id: newId(), trackId: c.trackId, title: 'Todo', sortOrder: 0, createdAt: Date.now() };
		db.insert(schema.checklists).values(list).run();
	}
	const id = newId();
	db.insert(schema.todos)
		.values({ id, checklistId: list.id, text: c.body, timestampSec: c.timestampSec, sourceCommentId: c.id })
		.run();
	return json({ id }, { status: 201 });
}
