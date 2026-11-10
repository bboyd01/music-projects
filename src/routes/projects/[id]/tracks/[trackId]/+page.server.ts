import { error } from '@sveltejs/kit';
import { requireTrackAccess } from '#lib/server/access.ts';
import { trackDetail } from '#lib/server/queries.ts';

export async function load({ params, locals, depends }) {
	depends('app:track');
	const { track, role } = requireTrackAccess(locals.user, params.trackId, 'viewer');
	if (track.projectId !== params.id) error(404, 'Track not found');
	return { detail: trackDetail(track, role) };
}
