import { error, json } from '@sveltejs/kit';
import { and, eq, or } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { oneOf, readJson, str } from '#lib/server/http.ts';

const ROLES = ['owner', 'editor', 'viewer'] as const;

/** Add or update a member. Body: { userId } or { handle: username or email }, plus role. */
export async function POST({ params, request, locals }) {
	requireProjectAccess(locals.user, params.id, 'owner');
	const body = await readJson(request);
	const role = oneOf(body.role, 'Role', ROLES) ?? 'editor';
	let u: { id: string } | undefined;
	if (body.userId !== undefined) {
		u = db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.id, str(body.userId, 'User'))).get();
	} else {
		const handle = str(body.handle, 'Username or email', { min: 1, max: 200 }).toLowerCase().replace(/^@/, '');
		u = db
			.select({ id: schema.users.id })
			.from(schema.users)
			.where(or(eq(schema.users.username, handle), eq(schema.users.email, handle)))
			.get();
	}
	if (!u) error(404, 'No account with that username or email. An admin can create one in Settings.');
	const userId = u.id;
	db.transaction((tx) => {
		tx.insert(schema.projectMembers)
			.values({ projectId: params.id, userId, role })
			.onConflictDoUpdate({ target: [schema.projectMembers.projectId, schema.projectMembers.userId], set: { role } })
			.run();
		ensureOwner(tx, params.id);
	});
	return json({ ok: true });
}

export async function DELETE({ params, url, locals }) {
	const { user } = requireProjectAccess(locals.user, params.id, 'viewer');
	const userId = url.searchParams.get('userId') ?? '';
	// Owners can remove anyone; anyone can leave.
	if (userId !== user.id) requireProjectAccess(locals.user, params.id, 'owner');
	db.transaction((tx) => {
		tx.delete(schema.projectMembers)
			.where(and(eq(schema.projectMembers.projectId, params.id), eq(schema.projectMembers.userId, userId)))
			.run();
		ensureOwner(tx, params.id);
	});
	return json({ ok: true });
}

/** A project must always keep at least one owner (throwing rolls the transaction back). */
function ensureOwner(tx: Pick<typeof db, 'select'>, projectId: string) {
	const members = tx.select().from(schema.projectMembers).where(eq(schema.projectMembers.projectId, projectId)).all();
	if (members.length && !members.some((m) => m.role === 'owner')) {
		error(400, 'A project needs at least one owner');
	}
}
