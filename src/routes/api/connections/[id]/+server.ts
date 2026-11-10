import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { oneOf, readJson } from '#lib/server/http.ts';

function load(id: string) {
	const c = db.select().from(schema.connections).where(eq(schema.connections.id, id)).get();
	if (!c) error(404, 'Connection not found');
	return c;
}

/** Change the line style, or reverse it with { reverse: true }. */
export async function PATCH({ params, request, locals }) {
	const c = load(params.id);
	requireProjectAccess(locals.user, c.projectId, 'editor');
	const body = await readJson(request);
	const style = oneOf(body.style, 'Style', ['line', 'dotted', 'arrow', 'both'] as const);
	const update: Partial<typeof schema.connections.$inferInsert> = {};
	if (style) update.style = style;
	if (body.reverse === true) {
		Object.assign(update, { fromId: c.toId, fromSide: c.toSide, toId: c.fromId, toSide: c.fromSide });
	}
	if (Object.keys(update).length) db.update(schema.connections).set(update).where(eq(schema.connections.id, c.id)).run();
	return json({ ok: true });
}

export function DELETE({ params, locals }) {
	const c = load(params.id);
	requireProjectAccess(locals.user, c.projectId, 'editor');
	db.delete(schema.connections).where(eq(schema.connections.id, c.id)).run();
	return json({ ok: true });
}
