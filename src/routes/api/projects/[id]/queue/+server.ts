import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { projectBackdrop, projectQueue } from '#lib/server/queries.ts';

export function GET({ params, locals }) {
	requireProjectAccess(locals.user, params.id, 'viewer');
	const project = db.select().from(schema.projects).where(eq(schema.projects.id, params.id)).get()!;
	return json({
		project: { id: project.id, name: project.name, backdrop: projectBackdrop(project) },
		tracks: projectQueue(params.id)
	});
}
