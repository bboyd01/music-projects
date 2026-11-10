import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { projectBackdrop, projectMembers } from '#lib/server/queries.ts';

export function load({ params, locals }) {
	const { role } = requireProjectAccess(locals.user, params.id, 'viewer');
	const project = db.select().from(schema.projects).where(eq(schema.projects.id, params.id)).get();
	if (!project) error(404, 'Project not found');
	return {
		project: {
			id: project.id,
			name: project.name,
			description: project.description,
			statusId: project.statusId,
			coverInspirationId: project.coverInspirationId,
			hasUploadedCover: !!project.coverFull,
			discordWebhookUrl: role === 'owner' ? project.discordWebhookUrl : null
		},
		role,
		backdrop: projectBackdrop(project),
		members: projectMembers(project.id)
	};
}
