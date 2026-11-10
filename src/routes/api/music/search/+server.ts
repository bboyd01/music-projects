import { json } from '@sveltejs/kit';
import { lookupLink, searchMusic } from '#lib/server/music.ts';
import { parseMusicLink } from '#lib/music-links.ts';

/** ?q= — a track name (searched on Apple's public catalog) or a Spotify / Apple Music link. */
export async function GET({ url }) {
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 300);
	if (q.length < 2) return json({ results: [], link: false });
	if (parseMusicLink(q)) {
		const r = await lookupLink(q);
		return json({ results: r ? [r] : [], link: true });
	}
	return json({ results: await searchMusic(q), link: false });
}
