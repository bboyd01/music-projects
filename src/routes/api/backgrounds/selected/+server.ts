import { error, json } from '@sveltejs/kit';
import { requireAdmin } from '#lib/server/access.ts';
import { readJson } from '#lib/server/http.ts';
import { listBackgrounds, setBackgroundSetting } from '#lib/server/backgrounds.ts';

/** Body: { mode: 'random' } or { mode: 'fixed', id } (a built-in or uploaded background). */
export async function PUT({ request, locals }) {
	requireAdmin(locals.user);
	const body = await readJson(request);
	if (body.mode === 'random') {
		setBackgroundSetting({ mode: 'random' });
	} else if (body.mode === 'fixed' && typeof body.id === 'string') {
		if (!listBackgrounds().some((b) => b.id === body.id)) error(400, 'Unknown background');
		setBackgroundSetting({ mode: 'fixed', id: body.id });
	} else {
		error(400, 'Choose random or a background');
	}
	return json({ ok: true });
}
