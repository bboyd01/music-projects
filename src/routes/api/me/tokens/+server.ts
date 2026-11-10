import { error, json } from '@sveltejs/kit';
import { requireUser } from '#lib/server/access.ts';
import { readJson, str } from '#lib/server/http.ts';
import { createApiToken, listApiTokens } from '#lib/server/tokens.ts';

/** Tokens are managed from a signed-in browser only, never with a token. */
function sessionUser(locals: App.Locals) {
	const user = requireUser(locals.user);
	if (locals.authVia !== 'session') error(403, 'Manage tokens from the app, not with a token');
	if (user.readOnly) error(403, 'Read-only accounts can’t create API tokens');
	return user;
}

export function GET({ locals }) {
	return json({ tokens: listApiTokens(sessionUser(locals).id) });
}

export async function POST({ request, locals }) {
	const user = sessionUser(locals);
	const body = await readJson(request);
	const name = str(body.name ?? 'REAPER', 'Name', { min: 1, max: 60 });
	const { id, token } = createApiToken(user.id, name);
	return json({ id, name, token }, { status: 201 });
}
