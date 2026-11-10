import { asc, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { listInspirations } from '#lib/server/queries.ts';

export async function load({ params, parent }) {
	await parent();
	return {
		items: listInspirations(params.id),
		tracks: db
			.select({ id: schema.tracks.id, title: schema.tracks.title, icon: schema.tracks.icon })
			.from(schema.tracks)
			.where(eq(schema.tracks.projectId, params.id))
			.orderBy(asc(schema.tracks.sortOrder))
			.all()
	};
}
