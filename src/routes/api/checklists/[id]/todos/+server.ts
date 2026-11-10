import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { nullableNum, readJson, str } from '#lib/server/http.ts';

export async function POST({ params, request, locals }) {
	const l = db.select().from(schema.checklists).where(eq(schema.checklists.id, params.id)).get();
	if (!l) error(404, 'Checklist not found');
	requireTrackAccess(locals.user, l.trackId, 'editor');
	const body = await readJson(request);
	const id = newId();
	const ts = nullableNum(body.timestampSec, 'Timestamp');
	db.insert(schema.todos)
		.values({
			id,
			checklistId: l.id,
			text: str(body.text, 'Todo', { min: 1, max: 2000 }),
			timestampSec: ts == null ? null : Math.max(0, ts),
			createdAt: Date.now()
		})
		.run();
	return json({ id }, { status: 201 });
}
