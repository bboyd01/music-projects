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

	const settings = event.locals.user?.settings ?? {};
	const theme = settings.theme ?? 'system';
	const motion = settings.motion ?? 'on';

	return resolve(event, {
		transformPageChunk: ({ html }) =>
			html.replace('%mp.theme%', theme).replace('%mp.motion%', motion)
	});
};
