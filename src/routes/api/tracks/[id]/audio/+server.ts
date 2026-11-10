import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { deleteAudio, resolveAudioType, storeTrackAudio } from '#lib/server/audio.ts';

/**
 * Upload (or replace) the track's single audio file.
 * Raw body, filename in `x-filename` (URI-encoded). Streams to disk.
 */
export async function PUT({ params, request, locals }) {
	requireTrackAccess(locals.user, params.id, 'editor');
	const filename = decodeURIComponent(request.headers.get('x-filename') ?? '').slice(0, 255) || 'audio';
	const type = resolveAudioType(filename, request.headers.get('content-type'));
	if (!type) error(415, 'Unsupported audio type. Use MP3, WAV, FLAC, AAC/M4A, OGG or AIFF.');
	if (!request.body) error(400, 'No file');

	const stored = await storeTrackAudio(params.id, request.body, filename, type);
	return json({ ok: true, duration: stored.duration, peaks: stored.peaks });
}

export async function DELETE({ params, locals }) {
	requireTrackAccess(locals.user, params.id, 'editor');
	const previous = db.select().from(schema.audioFiles).where(eq(schema.audioFiles.trackId, params.id)).get();
	db.delete(schema.audioFiles).where(eq(schema.audioFiles.trackId, params.id)).run();
	await deleteAudio(previous?.path);
	return json({ ok: true });
}

/** Browsers report precise durations for formats music-metadata can't parse. */
export async function PATCH({ params, request, locals }) {
	requireTrackAccess(locals.user, params.id, 'viewer');
	const { duration } = await request.json();
	if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
		db.update(schema.audioFiles).set({ duration }).where(eq(schema.audioFiles.trackId, params.id)).run();
	}
	return json({ ok: true });
}
