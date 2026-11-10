import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { deleteImage, saveCover } from '#lib/server/images.ts';

export async function POST({ params, request, locals }) {
	requireProjectAccess(locals.user, params.id, 'editor');
	const form = await request.formData();
	const file = form.get('file');
	if (!(file instanceof File)) error(400, 'No file uploaded');
	const { full, backdrop } = await saveCover(Buffer.from(await file.arrayBuffer()));
	const p = db.select().from(schema.projects).where(eq(schema.projects.id, params.id)).get();
	db.update(schema.projects)
		.set({ coverFull: full.file, coverBackdrop: backdrop.file, coverInspirationId: null })
		.where(eq(schema.projects.id, params.id))
		.run();
	await deleteImage(p?.coverFull);
	await deleteImage(p?.coverBackdrop);
	return json({ ok: true, bytes: full.bytes + backdrop.bytes });
}

/** Remove the uploaded/pinned cover; the backdrop falls back to auto. */
export async function DELETE({ params, locals }) {
	requireProjectAccess(locals.user, params.id, 'editor');
	const p = db.select().from(schema.projects).where(eq(schema.projects.id, params.id)).get();
	db.update(schema.projects)
		.set({ coverFull: null, coverBackdrop: null, coverInspirationId: null })
		.where(eq(schema.projects.id, params.id))
		.run();
	await deleteImage(p?.coverFull);
	await deleteImage(p?.coverBackdrop);
	return json({ ok: true });
}
