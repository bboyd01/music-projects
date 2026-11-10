import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { readJson } from '#lib/server/http.ts';

/** Body: { ids: string[] } — the full new order of the project's tracks. */
export async function POST({ params, request, locals }) {
	requireProjectAccess(locals.user, params.id, 'editor');
	const { ids } = await readJson(request);
	if (!Array.isArray(ids) || !ids.every((i) => typeof i === 'string')) error(400, 'ids must be a list');
	db.transaction((tx) => {
		ids.forEach((id, i) =>
			tx
				.update(schema.tracks)
				.set({ sortOrder: i + 1 })
				.where(and(eq(schema.tracks.id, id), eq(schema.tracks.projectId, params.id)))
				.run()
		);
	});
	return json({ ok: true });
}
