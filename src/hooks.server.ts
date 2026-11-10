import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { bootstrap } from '#lib/server/bootstrap.ts';
import { SESSION_COOKIE, toSafeUser, validateSession } from '#lib/server/auth.ts';

const PUBLIC_PATHS = ['/login', '/api/health'];

export const handle: Handle = async ({ event, resolve }) => {
	await bootstrap();

	const token = event.cookies.get(SESSION_COOKIE);
	const user = validateSession(token);
	event.locals.user = user ? toSafeUser(user) : null;

	const path = event.url.pathname;
	const isPublic =
		PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/')) ||
		path.startsWith('/backgrounds/') ||
		path.startsWith('/_app/');

	if (!event.locals.user && !isPublic) {
		if (path.startsWith('/api/') || path.startsWith('/files/')) {
			return new Response(JSON.stringify({ message: 'Not signed in' }), {
				status: 401,
				headers: { 'content-type': 'application/json' }
			});
		}
		redirect(303, `/login?next=${encodeURIComponent(path + event.url.search)}`);
	}

	// Read-only accounts can't change anything except their own view settings.
	if (event.locals.user?.readOnly && !['GET', 'HEAD', 'OPTIONS'].includes(event.request.method)) {
		const allowed = path === '/logout' || path === '/api/me/settings' || /^\/api\/projects\/[^/]+\/prefs$/.test(path);
		if (!allowed) {
			return new Response(JSON.stringify({ message: 'This is a read-only account' }), {
				status: 403,
				headers: { 'content-type': 'application/json' }
			});
		}
	}

	const settings = event.locals.user?.settings ?? {};
	const theme = settings.theme ?? 'system';
	const motion = settings.motion ?? 'on';

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%mp.theme%', theme).replace('%mp.motion%', motion)
	});
};
