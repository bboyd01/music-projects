import { json } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { readJson, str } from '#lib/server/http.ts';

export async function POST({ params, request, locals }) {
	requireTrackAccess(locals.user, params.id, 'editor');
	const body = await readJson(request);
	const title = str(body.title ?? 'Checklist', 'Title', { min: 1, max: 120 });
	const [{ max }] = db
		.select({ max: sql<number>`coalesce(max(${schema.checklists.sortOrder}), 0)` })
		.from(schema.checklists)
		.where(eq(schema.checklists.trackId, params.id))
		.all();
	const id = newId();
	db.insert(schema.checklists).values({ id, trackId: params.id, title, sortOrder: max + 1 }).run();
	return json({ id }, { status: 201 });
}
