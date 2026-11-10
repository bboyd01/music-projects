import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { readJson, str } from '#lib/server/http.ts';

function loadChecklist(id: string) {
	const l = db.select().from(schema.checklists).where(eq(schema.checklists.id, id)).get();
	if (!l) error(404, 'Checklist not found');
	return l;
}

export async function PATCH({ params, request, locals }) {
	const l = loadChecklist(params.id);
	requireTrackAccess(locals.user, l.trackId, 'editor');
	const body = await readJson(request);
	db.update(schema.checklists)
		.set({ title: str(body.title, 'Title', { min: 1, max: 120 }) })
		.where(eq(schema.checklists.id, l.id))
		.run();
	return json({ ok: true });
}

export function DELETE({ params, locals }) {
	const l = loadChecklist(params.id);
	requireTrackAccess(locals.user, l.trackId, 'editor');
	db.delete(schema.checklists).where(eq(schema.checklists.id, l.id)).run();
	return json({ ok: true });
}
