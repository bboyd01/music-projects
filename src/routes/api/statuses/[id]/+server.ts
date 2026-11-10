import { error, json } from '@sveltejs/kit';
import { and, asc, count, eq, ne } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireAdmin } from '#lib/server/access.ts';
import { defined, optBool, optStr, readJson } from '#lib/server/http.ts';
import { statusPalette } from '#lib/palette.ts';

export async function PATCH({ params, request, locals }) {
	requireAdmin(locals.user);
	const body = await readJson(request);
	const colors = statusPalette.map((c) => c.value) as string[];
	if (body.color !== undefined && (typeof body.color !== 'string' || !colors.includes(body.color))) {
		error(400, 'Pick a color from the palette');
	}
	const update = defined({
		name: optStr(body.name, 'Name', { max: 40 }),
		color: body.color as string | undefined,
		isDone: optBool(body.isDone, 'Done')
	});
	if (update.name === '') error(400, 'Name is required');
	db.update(schema.statuses).set(update).where(eq(schema.statuses.id, params.id)).run();
	return json({ ok: true });
}

/** Items using a deleted status move to the first remaining status of that scope. */
export function DELETE({ params, locals }) {
	requireAdmin(locals.user);
	const s = db.select().from(schema.statuses).where(eq(schema.statuses.id, params.id)).get();
	if (!s) error(404, 'Status not found');
	const [{ n }] = db.select({ n: count() }).from(schema.statuses).where(eq(schema.statuses.scope, s.scope)).all();
	if (n <= 1) error(400, 'Keep at least one status');
	const fallback = db
		.select()
		.from(schema.statuses)
		.where(and(eq(schema.statuses.scope, s.scope), ne(schema.statuses.id, s.id)))
		.orderBy(asc(schema.statuses.sortOrder))
		.get()!;
	db.transaction((tx) => {
		if (s.scope === 'track') {
			tx.update(schema.tracks).set({ statusId: fallback.id }).where(eq(schema.tracks.statusId, s.id)).run();
		} else {
			tx.update(schema.projects).set({ statusId: fallback.id }).where(eq(schema.projects.statusId, s.id)).run();
		}
		tx.delete(schema.statuses).where(eq(schema.statuses.id, s.id)).run();
	});
	return json({ ok: true });
}
