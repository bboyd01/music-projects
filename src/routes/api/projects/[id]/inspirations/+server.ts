import { error, json } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '#lib/server/db/index.ts';
import { newId } from '#lib/server/id.ts';
import { requireProjectAccess } from '#lib/server/access.ts';
import { readJson, str } from '#lib/server/http.ts';
import { saveInspirationImage, saveThumbFromUrl } from '#lib/server/images.ts';
import { toInspirationView } from '#lib/server/queries.ts';
import type { AudioData, InspirationData } from '#lib/server/db/schema.ts';

function validTrack(projectId: string, trackId: unknown): string | null {
	if (trackId == null || trackId === '') return null;
	if (typeof trackId !== 'string') error(400, 'Bad track');
	const t = db
		.select({ id: schema.tracks.id })
		.from(schema.tracks)
		.where(and(eq(schema.tracks.id, trackId), eq(schema.tracks.projectId, projectId)))
		.get();
	if (!t) error(400, 'Track is not in this project');
	return t.id;
}

function nextPlacement(projectId: string) {
	const [{ z, n }] = db
		.select({ z: sql<number>`coalesce(max(${schema.inspirations.z}), 0)`, n: sql<number>`count(*)` })
		.from(schema.inspirations)
		.where(eq(schema.inspirations.projectId, projectId))
		.all();
	// Cascade new items so they don't stack exactly on top of each other.
	const step = n % 10;
	return { z: z + 1, x: 60 + step * 28, y: 60 + step * 28 };
}

function num(v: unknown): number | undefined {
	return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/**
 * Create an inspiration.
 * - multipart with `file` → image (compressed to 300px WebP)
 * - JSON { type: 'text', text } | { type: 'audio', title, artist, album, artwork, appleUrl, spotifyUrl }
 */
export async function POST({ params, request, locals }) {
	requireProjectAccess(locals.user, params.id, 'editor');
	const place = nextPlacement(params.id);
	let type: 'text' | 'image' | 'audio';
	let data: InspirationData;
	let trackId: string | null;
	let size = { w: 240, h: 160 };
	let pos: { x?: number; y?: number } = {};

	if ((request.headers.get('content-type') ?? '').startsWith('multipart/form-data')) {
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) error(400, 'No file uploaded');
		trackId = validTrack(params.id, form.get('trackId'));
		const img = await saveInspirationImage(Buffer.from(await file.arrayBuffer()));
		type = 'image';
		data = { file: img.file, width: img.width, height: img.height };
		// Stored up to 1280×720 for sharpness; placed on the canvas at a comfortable size.
		const w = Math.min(img.width, 320);
		size = { w, h: Math.round((w / img.width) * img.height) };
		pos = { x: num(Number(form.get('x')) || undefined), y: num(Number(form.get('y')) || undefined) };
	} else {
		const body = await readJson(request);
		trackId = validTrack(params.id, body.trackId);
		pos = { x: num(body.x), y: num(body.y) };
		if (body.type === 'text') {
			type = 'text';
			data = { text: str(body.text ?? '', 'Text', { max: 10_000 }) };
			size = { w: 260, h: 140 };
		} else if (body.type === 'audio') {
			type = 'audio';
			const artwork = typeof body.artwork === 'string' && /^https:\/\//.test(body.artwork) ? body.artwork : null;
			const audio: AudioData = {
				title: str(body.title, 'Title', { min: 1, max: 300 }),
				artist: typeof body.artist === 'string' ? body.artist.slice(0, 300) : undefined,
				album: typeof body.album === 'string' ? body.album.slice(0, 300) : undefined,
				appleUrl: safeUrl(body.appleUrl),
				spotifyUrl: safeUrl(body.spotifyUrl),
				youtubeUrl: safeUrl(body.youtubeUrl),
				thumb: artwork ? await saveThumbFromUrl(artwork) : undefined
			};
			data = audio;
			size = { w: 280, h: 76 };
		} else {
			error(400, 'Unknown inspiration type');
		}
	}

	const id = newId();
	const row = {
		id,
		projectId: params.id,
		trackId,
		type,
		data,
		x: pos.x ?? place.x,
		y: pos.y ?? place.y,
		...size,
		z: place.z
	};
	db.insert(schema.inspirations).values(row).run();
	const saved = db.select().from(schema.inspirations).where(eq(schema.inspirations.id, id)).get()!;
	return json(toInspirationView(saved), { status: 201 });
}

function safeUrl(v: unknown): string | undefined {
	if (typeof v !== 'string') return undefined;
	try {
		const u = new URL(v);
		return u.protocol === 'https:' ? u.toString() : undefined;
	} catch {
		return undefined;
	}
}
