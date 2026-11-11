export type ParsedLink =
	| { service: 'spotify'; kind: string; id: string; url: string }
	| { service: 'apple'; id: string; kind: 'song' | 'album'; url: string }
	| { service: 'youtube'; kind: 'video'; id: string; url: string };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

/** Recognise Spotify / Apple Music / YouTube share links. Returns null for anything else. */
export function parseMusicLink(input: string): ParsedLink | null {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return null;
	}
	const host = url.hostname.replace(/^www\./, '');
	if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com' || host === 'youtu.be') {
		const parts = url.pathname.split('/').filter(Boolean);
		let id: string | null = null;
		if (host === 'youtu.be') id = parts[0] ?? null;
		else if (parts[0] === 'watch') id = url.searchParams.get('v');
		else if (['shorts', 'embed', 'live', 'v'].includes(parts[0])) id = parts[1] ?? null;
		if (id && YOUTUBE_ID.test(id)) return { service: 'youtube', kind: 'video', id, url: `https://www.youtube.com/watch?v=${id}` };
		return null;
	}
	if (host === 'open.spotify.com' || host === 'spotify.link') {
		const parts = url.pathname.split('/').filter(Boolean).filter((p) => !p.startsWith('intl-'));
		const [kind, id] = parts;
		if (kind && id && ['track', 'album', 'artist', 'playlist', 'episode'].includes(kind)) {
			return { service: 'spotify', kind, id, url: `https://open.spotify.com/${kind}/${id}` };
		}
		return null;
	}
	if (host === 'music.apple.com' || host === 'itunes.apple.com' || host === 'geo.music.apple.com') {
		const song = url.searchParams.get('i');
		if (song && /^\d+$/.test(song)) return { service: 'apple', kind: 'song', id: song, url: url.toString() };
		const parts = url.pathname.split('/').filter(Boolean);
		const last = parts.at(-1)?.replace(/^id/, '') ?? '';
		if (/^\d+$/.test(last)) {
			const kind = parts.includes('song') ? 'song' : 'album';
			return { service: 'apple', kind, id: last, url: url.toString() };
		}
	}
	return null;
}

/** The URL to open for an audio inspiration given the user's preferred service. */
export function openUrlFor(
	data: { title: string; artist?: string; appleUrl?: string; spotifyUrl?: string; youtubeUrl?: string },
	preferred: 'apple' | 'spotify' = 'apple'
): string {
	// YouTube inspirations always open on YouTube.
	if (data.youtubeUrl) return data.youtubeUrl;
	const query = [data.title, data.artist].filter(Boolean).join(' ');
	if (preferred === 'spotify') {
		return data.spotifyUrl ?? `https://open.spotify.com/search/${encodeURIComponent(query)}`;
	}
	return data.appleUrl ?? `https://music.apple.com/search?term=${encodeURIComponent(query)}`;
}
