import { listProjects, listStatuses } from '#lib/server/queries.ts';
import { builtInBackgrounds, globalBackground } from '#lib/server/backgrounds.ts';

export function load({ locals }) {
	if (!locals.user) {
		// Signed out: only built-ins (uploaded images need a session to load).
		return { user: null, statuses: [], projects: [], background: { setting: { mode: 'random' as const }, selected: null, pool: builtInBackgrounds() } };
	}
	return {
		user: locals.user,
		statuses: listStatuses(),
		projects: listProjects(locals.user.id).map((p) => ({ id: p.id, name: p.name, statusId: p.statusId })),
		background: globalBackground()
	};
}
