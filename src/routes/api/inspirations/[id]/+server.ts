import { error, json } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { readJson, str } from '#lib/server/http.ts';
import { deleteImage } from '#lib/server/images.ts';
import type { AudioData, ImageData, TextData } from '#lib/server/db/schema.ts';

function load(id: string) {
	const i = db.select().from(schema.inspirations).where(eq(schema.inspirations.id, id)).get();
	if (!i) error(404, 'Inspiration not found');
	return i;
}

const clamp = (v: unknown, min: number, max: number) =>
	typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : undefined;

/** Geometry (x, y, w, h, z), track assignment, and text content. */
export async function PATCH({ params, request, locals }) {
	const i = load(params.id);
	requireProjectAccess(locals.user, i.projectId, 'editor');
	const body = await readJson(request);
	const update: Partial<typeof schema.inspirations.$inferInsert> = {};
	const x = clamp(body.x, -20_000, 20_000);
	const y = clamp(body.y, -20_000, 20_000);
	const w = clamp(body.w, 60, 4000);
	const h = clamp(body.h, 40, 4000);
	const z = clamp(body.z, 0, 1_000_000);
	if (x !== undefined) update.x = x;
	if (y !== undefined) update.y = y;
	if (w !== undefined) update.w = w;
	if (h !== undefined) update.h = h;
	if (z !== undefined) update.z = Math.round(z);
	if (body.text !== undefined) {
		if (i.type !== 'text') error(400, 'Only text inspirations have text');
		update.data = { text: str(body.text, 'Text', { max: 10_000 }) } satisfies TextData;
	}
	if (Object.keys(update).length) {
		db.update(schema.inspirations).set(update).where(eq(schema.inspirations.id, i.id)).run();
	}
	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	const i = load(params.id);
	requireProjectAccess(locals.user, i.projectId, 'editor');
	db.delete(schema.inspirations).where(eq(schema.inspirations.id, i.id)).run();
	db.update(schema.projects)
		.set({ coverInspirationId: null })
		.where(and(eq(schema.projects.id, i.projectId), eq(schema.projects.coverInspirationId, i.id)))
		.run();
	if (i.type === 'image') await deleteImage((i.data as ImageData).file);
	if (i.type === 'audio') await deleteImage((i.data as AudioData).thumb);
	return json({ ok: true });
}
