import { json } from '@sveltejs/kit';
import { requireTrackAccess } from '#lib/server/access.ts';
import { trackDetail } from '#lib/server/queries.ts';

export function GET({ params, locals }) {
	const { track, role } = requireTrackAccess(locals.user, params.id, 'viewer');
	return json(trackDetail(track, role));
}
