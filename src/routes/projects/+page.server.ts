import { listProjects } from '#lib/server/queries.ts';

export function load({ locals }) {
	return { list: listProjects(locals.user!.id) };
}
