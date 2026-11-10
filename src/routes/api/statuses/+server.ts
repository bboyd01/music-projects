import { json } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireAdmin } from '#lib/server/access.ts';
import { oneOf, readJson, str } from '#lib/server/http.ts';
import { statusPalette } from '#lib/palette.ts';

export async function POST({ request, locals }) {
	requireAdmin(locals.user);
	const body = await readJson(request);
	const scope = oneOf(body.scope, 'Scope', ['project', 'track'] as const) ?? 'track';
	const colors = statusPalette.map((c) => c.value) as string[];
	const color = typeof body.color === 'string' && colors.includes(body.color) ? body.color : colors[0];
	const [{ max }] = db
		.select({ max: sql<number>`coalesce(max(${schema.statuses.sortOrder}), 0)` })
		.from(schema.statuses)
		.where(eq(schema.statuses.scope, scope))
		.all();
	const id = newId();
	db.insert(schema.statuses)
		.values({ id, scope, name: str(body.name, 'Name', { min: 1, max: 40 }), color, sortOrder: max + 1, isDone: body.isDone === true })
		.run();
	return json({ id }, { status: 201 });
}
