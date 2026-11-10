import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireAdmin } from '#lib/server/access.ts';
import { readJson } from '#lib/server/http.ts';

export async function POST({ request, locals }) {
	requireAdmin(locals.user);
	const { ids } = await readJson(request);
	if (!Array.isArray(ids)) error(400, 'ids must be a list');
	db.transaction((tx) => {
		ids.forEach((id, i) => tx.update(schema.statuses).set({ sortOrder: i }).where(eq(schema.statuses.id, String(id))).run());
	});
	return json({ ok: true });
}
