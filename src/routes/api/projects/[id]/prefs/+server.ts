import { error, json } from '@sveltejs/kit';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { oneOf, readJson } from '#lib/server/http.ts';

export async function PUT({ params, request, locals }) {
	const { user } = requireProjectAccess(locals.user, params.id, 'viewer');
	const body = await readJson(request);
	const view = oneOf(body.view, 'View', ['table', 'list', 'board'] as const);
	let visibleFields: string[] | undefined;
	if (body.visibleFields !== undefined) {
		if (!Array.isArray(body.visibleFields) || !body.visibleFields.every((f) => typeof f === 'string')) {
			error(400, 'visibleFields must be a list');
		}
		visibleFields = body.visibleFields as string[];
	}
	const set = { ...(view && { view }), ...(visibleFields && { visibleFields }) };
	db.insert(schema.projectViewPrefs)
		.values({ projectId: params.id, userId: user.id, view: view ?? 'table', visibleFields: visibleFields ?? null })
		.onConflictDoUpdate({ target: [schema.projectViewPrefs.projectId, schema.projectViewPrefs.userId], set })
		.run();
	return json({ ok: true });
}
