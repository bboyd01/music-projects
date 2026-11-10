import { error, json } from '@sveltejs/kit';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { oneOf, readJson, str } from '#lib/server/http.ts';

const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const STYLES = ['line', 'dotted', 'arrow', 'both'] as const;

/** Connect two items on the project canvas. */
export async function POST({ params, request, locals }) {
	requireProjectAccess(locals.user, params.id, 'editor');
	const body = await readJson(request);
	const fromId = str(body.fromId, 'From', { min: 1 });
	const toId = str(body.toId, 'To', { min: 1 });
	if (fromId === toId) error(400, 'An item can’t connect to itself');
	const fromSide = oneOf(body.fromSide, 'From side', SIDES) ?? 'right';
	const toSide = oneOf(body.toSide, 'To side', SIDES) ?? 'left';
	const style = oneOf(body.style, 'Style', STYLES) ?? 'line';

	// Both ends must be canvas items of this project.
	const found = db
		.select({ id: schema.inspirations.id })
		.from(schema.inspirations)
		.where(
			and(
				inArray(schema.inspirations.id, [fromId, toId]),
				eq(schema.inspirations.projectId, params.id),
				isNull(schema.inspirations.trackId)
			)
		)
		.all();
	if (found.length !== 2) error(400, 'Both items must be on this project’s canvas');

	const id = newId();
	db.insert(schema.connections).values({ id, projectId: params.id, fromId, fromSide, toId, toSide, style }).run();
	return json({ id, fromId, fromSide, toId, toSide, style }, { status: 201 });
}
