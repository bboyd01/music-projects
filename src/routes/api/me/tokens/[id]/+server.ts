import { error, json } from '@sveltejs/kit';
import { requireUser } from '#lib/server/access.ts';
import { revokeApiToken } from '#lib/server/tokens.ts';

export function DELETE({ params, locals }) {
	const user = requireUser(locals.user);
	if (locals.authVia !== 'session') error(403, 'Manage tokens from the app, not with a token');
	if (!revokeApiToken(user.id, params.id)) error(404, 'Token not found');
	return json({ ok: true });
}
