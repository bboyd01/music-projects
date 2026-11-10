import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { defined, nullableNum, optBool, optStr, readJson } from '#lib/server/http.ts';

function load(id: string) {
	const row = db
		.select({ todo: schema.todos, trackId: schema.checklists.trackId })
		.from(schema.todos)
		.innerJoin(schema.checklists, eq(schema.checklists.id, schema.todos.checklistId))
		.where(eq(schema.todos.id, id))
		.get();
	if (!row) error(404, 'Todo not found');
	return row;
}

export async function PATCH({ params, request, locals }) {
	const { todo, trackId } = load(params.id);
	requireTrackAccess(locals.user, trackId, 'editor');
	const body = await readJson(request);
	const update = defined({
		text: optStr(body.text, 'Todo', { max: 2000 }),
		done: optBool(body.done, 'Done'),
		timestampSec: nullableNum(body.timestampSec, 'Timestamp')
	});
	if (update.text === '') error(400, 'Todo text is required');
	if (Object.keys(update).length) db.update(schema.todos).set(update).where(eq(schema.todos.id, todo.id)).run();
	return json({ ok: true });
}

export function DELETE({ params, locals }) {
	const { todo, trackId } = load(params.id);
	requireTrackAccess(locals.user, trackId, 'editor');
	db.delete(schema.todos).where(eq(schema.todos.id, todo.id)).run();
	return json({ ok: true });
}
