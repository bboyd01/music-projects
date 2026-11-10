import { error, json } from '@sveltejs/kit';
import { asc, eq, sql } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { nullableStr, readJson, str } from '#lib/server/http.ts';

export async function POST({ params, request, locals }) {
	requireProjectAccess(locals.user, params.id, 'editor');
	const body = await readJson(request);
	const title = str(body.title, 'Title', { min: 1, max: 200 });
	let statusId = nullableStr(body.statusId, 'Status');
	if (statusId) {
		const s = db.select().from(schema.statuses).where(eq(schema.statuses.id, statusId)).get();
		if (!s || s.scope !== 'track') error(400, 'Unknown status');
	} else {
		statusId =
			db
				.select({ id: schema.statuses.id })
				.from(schema.statuses)
				.where(eq(schema.statuses.scope, 'track'))
				.orderBy(asc(schema.statuses.sortOrder))
				.get()?.id ?? null;
	}
	const [{ max }] = db
		.select({ max: sql<number>`coalesce(max(${schema.tracks.sortOrder}), 0)` })
		.from(schema.tracks)
		.where(eq(schema.tracks.projectId, params.id))
		.all();
	const id = newId();
	db.transaction((tx) => {
		tx.insert(schema.tracks).values({ id, projectId: params.id, title, statusId, sortOrder: max + 1 }).run();
		tx.insert(schema.checklists).values({ id: newId(), trackId: id, title: 'Todo' }).run();
	});
	return json({ id }, { status: 201 });
}
