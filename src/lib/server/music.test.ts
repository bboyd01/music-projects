import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupLink } from './music';

afterEach(() => vi.unstubAllGlobals());

describe('lookupLink — YouTube', () => {
	const link = 'https://youtu.be/dQw4w9WgXcQ?si=abc';

	it('uses oEmbed for title and channel', async () => {
		const fetchMock = vi.fn(async (url: string) => {
			expect(url).toBe('https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ&format=json');
			return new Response(JSON.stringify({ title: 'Never Gonna Give You Up', author_name: 'Rick Astley' }));
		});
		vi.stubGlobal('fetch', fetchMock);
		expect(await lookupLink(link)).toEqual({
			title: 'Never Gonna Give You Up',
			artist: 'Rick Astley',
			artwork: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
			youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
		});
	});

	it('still returns a usable result when oEmbed fails', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => new Response('Not Found', { status: 404 })));
		const r = await lookupLink(link);
		expect(r?.title).toBe('YouTube video');
		expect(r?.youtubeUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
		expect(r?.artwork).toContain('dQw4w9WgXcQ');
	});
});
