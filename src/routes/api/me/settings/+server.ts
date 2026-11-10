import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireUser } from '#lib/server/access.ts';
import { oneOf, readJson } from '#lib/server/http.ts';

/** Appearance & preference settings — applied instantly from the client. */
export async function PATCH({ request, locals }) {
	const user = requireUser(locals.user);
	const body = await readJson(request);
	const next = {
		...user.settings,
		...defined({
			theme: oneOf(body.theme, 'Theme', ['system', 'dark', 'light'] as const),
			motion: oneOf(body.motion, 'Animations', ['on', 'mobile-off', 'off'] as const),
			musicService: oneOf(body.musicService, 'Music service', ['apple', 'spotify'] as const)
		})
	};
	db.update(schema.users).set({ settings: next }).where(eq(schema.users.id, user.id)).run();
	return json({ settings: next });
}

function defined<T extends Record<string, unknown>>(o: T) {
	return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
