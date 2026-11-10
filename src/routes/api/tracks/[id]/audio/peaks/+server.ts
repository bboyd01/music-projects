import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { readJson } from '#lib/server/http.ts';
import { isValidPeaks } from '#lib/waveform.ts';

/**
 * Peaks computed in the uploader's browser, for formats the server can't decode (e.g. M4A).
 * Only fills in missing peaks — server-computed ones are never overwritten.
 */
export async function POST({ params, request, locals }) {
	requireTrackAccess(locals.user, params.id, 'editor');
	const { peaks } = await readJson(request);
	if (!isValidPeaks(peaks)) error(400, 'Invalid waveform data');
	const audio = db.select().from(schema.audioFiles).where(eq(schema.audioFiles.trackId, params.id)).get();
	if (!audio) error(404, 'No audio for this track');
	if (!audio.peaks) db.update(schema.audioFiles).set({ peaks }).where(eq(schema.audioFiles.id, audio.id)).run();
	return json({ ok: true });
}
