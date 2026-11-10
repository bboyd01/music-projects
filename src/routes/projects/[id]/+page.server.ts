import { and, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { listConnections, listInspirations, listTracks } from '#lib/server/queries.ts';

export async function load({ params, locals, parent }) {
	await parent(); // access check happens in the layout
	const prefs = db
		.select()
		.from(schema.projectViewPrefs)
		.where(and(eq(schema.projectViewPrefs.projectId, params.id), eq(schema.projectViewPrefs.userId, locals.user!.id)))
		.get();
	return {
		tracks: listTracks(params.id),
		view: prefs?.view ?? 'table',
		visibleFields: prefs?.visibleFields ?? null,
		inspirations: listInspirations(params.id),
		connections: listConnections(params.id)
	};
}
