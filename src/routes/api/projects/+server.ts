import { json } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireUser } from '#lib/server/access.ts';
import { readJson, str } from '#lib/server/http.ts';

export async function POST({ request, locals }) {
	const user = requireUser(locals.user);
	const body = await readJson(request);
	const name = str(body.name, 'Name', { min: 1, max: 120 });
	const firstStatus = db
		.select({ id: schema.statuses.id })
		.from(schema.statuses)
		.where(eq(schema.statuses.scope, 'project'))
		.orderBy(asc(schema.statuses.sortOrder))
		.get();
	const id = newId();
	db.transaction((tx) => {
		tx.insert(schema.projects).values({ id, name, ownerId: user.id, statusId: firstStatus?.id ?? null }).run();
		tx.insert(schema.projectMembers).values({ projectId: id, userId: user.id, role: 'owner' }).run();
	});
	return json({ id }, { status: 201 });
}
