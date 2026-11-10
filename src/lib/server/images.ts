import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { error } from '@sveltejs/kit';
import { config } from './config';
import { newToken } from './id';

/**
 * Every uploaded image goes through here. The original is only ever held in memory;
 * only compressed WebP outputs are written to disk. All metadata (EXIF, GPS, ICC…)
 * is stripped because sharp drops it unless `.withMetadata()` is called.
 */

export const imageVariants = {
	inspiration: { width: 1280, height: 720, quality: 82 },
	coverFull: { longEdge: 1600, quality: 78 },
	coverBackdrop: { width: 480, quality: 60 },
	thumb: { square: 100, quality: 80 }
} as const;

const ACCEPTED = new Set(['jpeg', 'png', 'webp', 'gif', 'avif', 'tiff', 'heif']);
const MAX_PIXELS = 80_000_000;

export type SavedImage = { file: string; width: number; height: number; bytes: number };

async function validate(input: Buffer) {
	if (input.byteLength > config.maxImageBytes) error(413, 'Image is larger than 25 MB');
	let meta: Awaited<ReturnType<ReturnType<typeof sharp>['metadata']>>;
	try {
		meta = await sharp(input, { limitInputPixels: MAX_PIXELS }).metadata();
	} catch {
		error(415, 'That file is not an image we can read. Try JPEG, PNG or WebP.');
	}
	if (!meta.format || !ACCEPTED.has(meta.format)) {
		error(415, `Unsupported image format${meta.format ? ` (${meta.format})` : ''}. Try JPEG, PNG or WebP.`);
	}
}

function pipeline(input: Buffer) {
	// .rotate() with no args applies EXIF orientation, then metadata is discarded on output.
	return sharp(input, { limitInputPixels: MAX_PIXELS, animated: false }).rotate();
}

async function write(img: ReturnType<typeof sharp>, quality: number): Promise<SavedImage> {
	const { data, info } = await img.webp({ quality, effort: 5 }).toBuffer({ resolveWithObject: true });
	const file = `${newToken()}.webp`;
	await fs.writeFile(path.join(config.imageDir, file), data);
	return { file, width: info.width, height: info.height, bytes: info.size };
}

export async function saveInspirationImage(input: Buffer) {
	await validate(input);
	const v = imageVariants.inspiration;
	// Fit inside 1280×720 (keeps aspect ratio, never upscales).
	return write(
		pipeline(input).resize({ width: v.width, height: v.height, fit: 'inside', withoutEnlargement: true }),
		v.quality
	);
}

export async function saveCover(input: Buffer) {
	await validate(input);
	const full = await write(
		pipeline(input).resize({
			width: imageVariants.coverFull.longEdge,
			height: imageVariants.coverFull.longEdge,
			fit: 'inside',
			withoutEnlargement: true
		}),
		imageVariants.coverFull.quality
	);
	const backdrop = await write(
		pipeline(input).resize({ width: imageVariants.coverBackdrop.width, withoutEnlargement: true }),
		imageVariants.coverBackdrop.quality
	);
	return { full, backdrop };
}

/** Square thumbnail (center crop) — used for audio inspiration artwork fetched from a URL. */
export async function saveThumb(input: Buffer) {
	await validate(input);
	const s = imageVariants.thumb.square;
	return write(pipeline(input).resize(s, s, { fit: 'cover' }), imageVariants.thumb.quality);
}

export async function saveThumbFromUrl(url: string): Promise<string | undefined> {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
		if (!res.ok) return undefined;
		const buf = Buffer.from(await res.arrayBuffer());
		return (await saveThumb(buf)).file;
	} catch {
		return undefined;
	}
}

export function isSafeImageName(name: string) {
	return /^[A-Za-z0-9_-]{20,64}\.webp$/.test(name);
}

export async function deleteImage(file: string | null | undefined) {
	if (!file || !isSafeImageName(file)) return;
	await fs.rm(path.join(config.imageDir, file), { force: true });
}

export function imageUrl(file: string | null | undefined) {
	return file ? `/files/images/${file}` : null;
}
