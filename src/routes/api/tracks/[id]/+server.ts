import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { defined, nullableStr, optDate, optStr, readJson } from '#lib/server/http.ts';
import { deleteAudio } from '#lib/server/audio.ts';

export async function PATCH({ params, request, locals }) {
	requireTrackAccess(locals.user, params.id, 'editor');
	const body = await readJson(request);
	const statusId = nullableStr(body.statusId, 'Status');
	if (statusId) {
		const s = db.select().from(schema.statuses).where(eq(schema.statuses.id, statusId)).get();
		if (!s || s.scope !== 'track') error(400, 'Unknown status');
	}
	const update = defined({
		title: optStr(body.title, 'Title', { max: 200 }),
		icon: nullableStr(body.icon, 'Icon', { max: 40 }),
		statusId,
		startDate: optDate(body.startDate, 'Start date'),
		dueDate: optDate(body.dueDate, 'Due date'),
		description: optStr(body.description, 'Description', { max: 20_000 })
	});
	if (update.title === '') error(400, 'Title is required');
	if (Object.keys(update).length) db.update(schema.tracks).set(update).where(eq(schema.tracks.id, params.id)).run();
	return json({ ok: true });
}

export async function DELETE({ params, locals }) {
	requireTrackAccess(locals.user, params.id, 'editor');
	const audio = db.select().from(schema.audioFiles).where(eq(schema.audioFiles.trackId, params.id)).get();
	// Inspirations stay on the project canvas (track_id is set null), so only audio is removed.
	db.delete(schema.tracks).where(eq(schema.tracks.id, params.id)).run();
	await deleteAudio(audio?.path);
	return json({ ok: true });
}
