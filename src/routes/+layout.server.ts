import { listProjects, listStatuses } from '#lib/server/queries.ts';

export function load({ locals }) {
	if (!locals.user) return { user: null, statuses: [], projects: [] };
	return {
		user: locals.user,
		statuses: listStatuses(),
		projects: listProjects(locals.user.id).map((p) => ({ id: p.id, name: p.name, statusId: p.statusId }))
	};
}
