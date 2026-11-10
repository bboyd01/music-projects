import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parseFile } from 'music-metadata';
import { error } from '@sveltejs/kit';
import { config } from './config';
import { newId, newToken } from './id';
import { eq } from 'drizzle-orm';
import { db, schema } from './db';

const EXT_BY_MIME: Record<string, string> = {
	'audio/mpeg': 'mp3',
	'audio/mp3': 'mp3',
	'audio/wav': 'wav',
	'audio/x-wav': 'wav',
	'audio/wave': 'wav',
	'audio/flac': 'flac',
	'audio/x-flac': 'flac',
	'audio/aac': 'aac',
	'audio/mp4': 'm4a',
	'audio/x-m4a': 'm4a',
	'audio/ogg': 'ogg',
	'audio/opus': 'opus',
	'audio/webm': 'webm',
	'audio/aiff': 'aiff',
	'audio/x-aiff': 'aiff'
};

const MIME_BY_EXT: Record<string, string> = {
	mp3: 'audio/mpeg',
	wav: 'audio/wav',
	flac: 'audio/flac',
	aac: 'audio/aac',
	m4a: 'audio/mp4',
	ogg: 'audio/ogg',
	opus: 'audio/ogg',
	webm: 'audio/webm',
	aif: 'audio/aiff',
	aiff: 'audio/aiff'
};

export function resolveAudioType(filename: string, mime: string | null) {
	const ext = path.extname(filename).slice(1).toLowerCase();
	if (MIME_BY_EXT[ext]) return { ext, mime: MIME_BY_EXT[ext] };
	if (mime && EXT_BY_MIME[mime]) return { ext: EXT_BY_MIME[mime], mime };
	return null;
}

/** Streams an upload body straight to disk (never buffered whole in memory). */
export async function saveAudioStream(body: ReadableStream<Uint8Array>, ext: string) {
	const file = `${newToken()}.${ext}`;
	const full = path.join(config.audioDir, file);
	let size = 0;
	const limiter = new Transform({
		transform(chunk, _enc, cb) {
			size += chunk.length;
			if (size > config.maxAudioBytes) cb(new Error('too-large'));
			else cb(null, chunk);
		}
	});
	try {
		await pipeline(Readable.fromWeb(body as never), limiter, fs.createWriteStream(full));
	} catch (e) {
		await fsp.rm(full, { force: true });
		if ((e as Error).message === 'too-large') error(413, 'Audio file is too large');
		throw e;
	}
	let duration: number | null = null;
	try {
		const meta = await parseFile(full, { duration: true, skipCovers: true });
		duration = meta.format.duration ?? null;
	} catch {
		/* duration is optional — the browser will report it */
	}
	return { file, size, duration };
}

export function audioPath(file: string) {
	if (!/^[A-Za-z0-9_-]{20,64}\.[a-z0-9]{2,5}$/.test(file)) error(400, 'Bad file');
	return path.join(config.audioDir, file);
}

export async function deleteAudio(file: string | null | undefined) {
	if (!file) return;
	await fsp.rm(audioPath(file), { force: true });
}

/** Check a saved file really is WAV or MP3 by its first bytes. */
export async function sniffAudio(file: string): Promise<'wav' | 'mp3' | null> {
	const fh = await fsp.open(audioPath(file), 'r');
	try {
		const b = Buffer.alloc(12);
		await fh.read(b, 0, 12, 0);
		if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WAVE') return 'wav';
		if (b.toString('ascii', 0, 3) === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return 'mp3';
		return null;
	} finally {
		await fh.close();
	}
}

/**
 * Store (or replace) a track's single audio file: stream to disk, compute waveform peaks,
 * swap the row, then delete the previous file. Shared by the browser upload and the API.
 */
export async function storeTrackAudio(
	trackId: string,
	body: ReadableStream<Uint8Array>,
	filename: string,
	type: { ext: string; mime: string },
	opts: { require?: ('wav' | 'mp3')[] } = {}
) {
	const saved = await saveAudioStream(body, type.ext);
	if (opts.require) {
		const kind = await sniffAudio(saved.file).catch(() => null);
		if (!kind || !opts.require.includes(kind)) {
			await deleteAudio(saved.file);
			error(415, 'The file isn’t a valid WAV or MP3.');
		}
	}
	const { computePeaks } = await import('./waveform');
	const peaks = await computePeaks(audioPath(saved.file));
	const previous = db.select().from(schema.audioFiles).where(eq(schema.audioFiles.trackId, trackId)).get();
	const row = {
		id: newId(),
		trackId,
		filename,
		path: saved.file,
		mime: type.mime,
		duration: saved.duration,
		size: saved.size,
		peaks,
		uploadedAt: Date.now()
	};
	db.transaction((tx) => {
		tx.delete(schema.audioFiles).where(eq(schema.audioFiles.trackId, trackId)).run();
		tx.insert(schema.audioFiles).values(row).run();
	});
	await deleteAudio(previous?.path);
	return { duration: saved.duration, peaks: !!peaks, size: saved.size };
}
