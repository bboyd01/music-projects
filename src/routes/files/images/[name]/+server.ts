import fs from 'node:fs/promises';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import { config } from '#lib/server/config.ts';
import { isSafeImageName } from '#lib/server/images.ts';

/** Image names are random and content never changes for a name, so cache forever. */
export async function GET({ params }) {
	if (!isSafeImageName(params.name)) error(404, 'Not found');
	try {
		const data = await fs.readFile(path.join(config.imageDir, params.name));
		return new Response(new Uint8Array(data), {
			headers: { 'content-type': 'image/webp', 'cache-control': 'private, max-age=31536000, immutable' }
		});
	} catch {
		error(404, 'Not found');
	}
}
