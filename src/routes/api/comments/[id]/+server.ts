import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess, roleAllows } from '#lib/server/access.ts';
import { readJson, str } from '#lib/server/http.ts';

function load(id: string) {
	const c = db.select().from(schema.comments).where(eq(schema.comments.id, id)).get();
	if (!c) error(404, 'Comment not found');
	return c;
}

/** Edit your own comment ({ body }), or resolve/unresolve it ({ resolved }). */
export async function PATCH({ params, request, locals }) {
	const c = load(params.id);
	const { user, role } = requireProjectAccess(locals.user, c.projectId, 'viewer');
	const body = await readJson(request);
	if (typeof body.resolved === 'boolean') {
		// Editors and owners resolve feedback; authors can resolve their own.
		if (c.authorId !== user.id && !roleAllows(role, 'editor')) error(403, 'Only editors can resolve comments');
		db.update(schema.comments)
			.set(body.resolved ? { resolvedAt: Date.now(), resolvedBy: user.id } : { resolvedAt: null, resolvedBy: null })
			.where(eq(schema.comments.id, c.id))
			.run();
	}
	if (body.body !== undefined) {
		if (c.authorId !== user.id) error(403, 'You can only edit your own comments');
		db.update(schema.comments)
			.set({ body: str(body.body, 'Comment', { min: 1, max: 5000 }) })
			.where(eq(schema.comments.id, c.id))
			.run();
	}
	return json({ ok: true });
}

export function DELETE({ params, locals }) {
	const c = load(params.id);
	const { user, role } = requireProjectAccess(locals.user, c.projectId, 'viewer');
	if (c.authorId !== user.id && !roleAllows(role, 'owner')) error(403, 'You can only delete your own comments');
	db.delete(schema.comments).where(eq(schema.comments.id, c.id)).run();
	return json({ ok: true });
}
