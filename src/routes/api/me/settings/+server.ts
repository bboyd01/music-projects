import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireUser } from '#lib/server/access.ts';
import { error } from '@sveltejs/kit';
import { oneOf, optBool, optStr, readJson } from '#lib/server/http.ts';
import { normalizeExt } from '#lib/daw.ts';

/** Appearance & preference settings — applied instantly from the client. */
export async function PATCH({ request, locals }) {
	const user = requireUser(locals.user);
	const body = await readJson(request);
	const next = {
		...user.settings,
		...defined({
			theme: oneOf(body.theme, 'Theme', ['system', 'dark', 'light'] as const),
			motion: oneOf(body.motion, 'Animations', ['on', 'mobile-off', 'off'] as const),
			musicService: oneOf(body.musicService, 'Music service', ['apple', 'spotify'] as const),
			timeline: oneOf(body.timeline, 'Player timeline', ['line', 'waveform'] as const),
			dawEnabled: optBool(body.dawEnabled, 'Open in DAW'),
			projectFolder: projectFolder(body.projectFolder),
			projectExt: projectExt(body.projectExt)
		})
	};
	db.update(schema.users).set({ settings: next }).where(eq(schema.users.id, user.id)).run();
	return json({ settings: next });
}

function projectFolder(v: unknown) {
	const s = optStr(v, 'Project folder', { max: 500 });
	if (s && !s.startsWith('/') && !s.startsWith('~')) error(400, 'Project folder should be a full path, e.g. /Users/you/Documents/…');
	return s;
}

function projectExt(v: unknown) {
	const s = optStr(v, 'Project file extension', { max: 16 });
	if (s === undefined) return undefined;
	const e = normalizeExt(s);
	if (e && !/^\.[A-Za-z0-9]{1,15}$/.test(e)) error(400, 'Extension should look like .rpp');
	return e;
}

function defined<T extends Record<string, unknown>>(o: T) {
	return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}
