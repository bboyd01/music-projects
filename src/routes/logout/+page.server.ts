import { redirect } from '@sveltejs/kit';
import { destroySession, SESSION_COOKIE } from '#lib/server/auth.ts';

export const actions = {
	default: ({ cookies }) => {
		destroySession(cookies.get(SESSION_COOKIE), cookies);
		redirect(303, '/login');
	}
};
