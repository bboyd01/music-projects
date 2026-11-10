export type ParsedLink =
	| { service: 'spotify'; kind: string; id: string; url: string }
	| { service: 'apple'; id: string; kind: 'song' | 'album'; url: string };

/** Recognise Spotify / Apple Music share links. Returns null for anything else. */
export function parseMusicLink(input: string): ParsedLink | null {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return null;
	}
	const host = url.hostname.replace(/^www\./, '');
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
	data: { title: string; artist?: string; appleUrl?: string; spotifyUrl?: string },
	preferred: 'apple' | 'spotify' = 'apple'
): string {
	const query = [data.title, data.artist].filter(Boolean).join(' ');
	if (preferred === 'spotify') {
		return data.spotifyUrl ?? `https://open.spotify.com/search/${encodeURIComponent(query)}`;
	}
	return data.appleUrl ?? `https://music.apple.com/search?term=${encodeURIComponent(query)}`;
}
