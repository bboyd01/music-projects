import fs from 'node:fs';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { Readable } from 'node:stream';
import { db, schema } from '#lib/server/db/index.ts';
import { requireTrackAccess } from '#lib/server/access.ts';
import { audioPath } from '#lib/server/audio.ts';

/** Streams audio with HTTP Range support (needed for seeking, especially on iOS Safari). */
export function GET({ params, request, locals }) {
	requireTrackAccess(locals.user, params.trackId, 'viewer');
	const audio = db.select().from(schema.audioFiles).where(eq(schema.audioFiles.trackId, params.trackId)).get();
	if (!audio) error(404, 'No audio for this track');
	const file = audioPath(audio.path);
	let size: number;
	try {
		size = fs.statSync(file).size;
	} catch {
		error(404, 'Audio file missing');
	}

	const headers: Record<string, string> = {
		'content-type': audio.mime,
		'accept-ranges': 'bytes',
		'cache-control': 'private, max-age=86400',
		'content-disposition': `inline; filename*=UTF-8''${encodeURIComponent(audio.filename)}`
	};

	const range = request.headers.get('range');
	const m = range?.match(/^bytes=(\d*)-(\d*)$/);
	if (m && (m[1] || m[2])) {
		let start = m[1] ? Number(m[1]) : size - Number(m[2]);
		let end = m[1] && m[2] ? Number(m[2]) : size - 1;
		start = Math.max(0, start);
		end = Math.min(end, size - 1);
		if (start > end || start >= size) {
			return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
		}
		const stream = Readable.toWeb(fs.createReadStream(file, { start, end })) as ReadableStream;
		return new Response(stream, {
			status: 206,
			headers: { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) }
		});
	}
	const stream = Readable.toWeb(fs.createReadStream(file)) as ReadableStream;
	return new Response(stream, { headers: { ...headers, 'content-length': String(size) } });
}
