import { parseMusicLink } from '#lib/music-links.ts';

export type MusicResult = {
	title: string;
	artist?: string;
	album?: string;
	artwork?: string;
	appleUrl?: string;
	spotifyUrl?: string;
};

type ItunesItem = {
	wrapperType?: string;
	kind?: string;
	trackName?: string;
	collectionName?: string;
	artistName?: string;
	artworkUrl100?: string;
	trackViewUrl?: string;
	collectionViewUrl?: string;
};

function fromItunes(r: ItunesItem): MusicResult {
	const isTrack = r.wrapperType === 'track';
	return {
		title: (isTrack ? r.trackName : r.collectionName) ?? 'Unknown',
		artist: r.artistName,
		album: isTrack ? r.collectionName : undefined,
		artwork: r.artworkUrl100,
		appleUrl: (isTrack ? r.trackViewUrl : r.collectionViewUrl)?.replace(/&uo=\d+/, '')
	};
}

async function getJson<T>(url: string): Promise<T | null> {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
		if (!res.ok) return null;
		return (await res.json()) as T;
	} catch {
		return null;
	}
}

export async function searchMusic(term: string, country = 'us'): Promise<MusicResult[]> {
	const q = new URLSearchParams({ term, media: 'music', entity: 'song', limit: '8', country });
	const data = await getJson<{ results: ItunesItem[] }>(`https://itunes.apple.com/search?${q}`);
	return (data?.results ?? []).map(fromItunes);
}

/** Resolve a Spotify or Apple Music link into metadata. */
export async function lookupLink(input: string): Promise<MusicResult | null> {
	const link = parseMusicLink(input);
	if (!link) return null;
	if (link.service === 'apple') {
		const data = await getJson<{ results: ItunesItem[] }>(
			`https://itunes.apple.com/lookup?id=${link.id}&entity=song`
		);
		const item = data?.results?.find((r) => r.wrapperType === 'track') ?? data?.results?.[0];
		if (!item) return { title: 'Apple Music link', appleUrl: link.url };
		return { ...fromItunes(item), appleUrl: link.url };
	}
	const o = await getJson<{ title?: string; thumbnail_url?: string }>(
		`https://open.spotify.com/oembed?url=${encodeURIComponent(link.url)}`
	);
	return {
		title: o?.title ?? 'Spotify link',
		artwork: o?.thumbnail_url,
		spotifyUrl: link.url
	};
}
