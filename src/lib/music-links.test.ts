import { describe, expect, it } from 'vitest';
import { openUrlFor, parseMusicLink } from './music-links';

describe('parseMusicLink', () => {
	it('parses Spotify track links (with intl prefix and query)', () => {
		expect(parseMusicLink('https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC?si=abc')).toEqual({
			service: 'spotify',
			kind: 'track',
			id: '4uLU6hMCjMI75M1A2tKUQC',
			url: 'https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC'
		});
	});
	it('parses Apple Music song-in-album links', () => {
		const r = parseMusicLink('https://music.apple.com/us/album/in-rainbows/1109714933?i=1109715167');
		expect(r).toMatchObject({ service: 'apple', kind: 'song', id: '1109715167' });
	});
	it('parses Apple Music album and song links', () => {
		expect(parseMusicLink('https://music.apple.com/gb/album/kid-a/1097863576')).toMatchObject({ kind: 'album', id: '1097863576' });
		expect(parseMusicLink('https://music.apple.com/us/song/reckoner/1109715170')).toMatchObject({ kind: 'song', id: '1109715170' });
	});
	it('rejects other text', () => {
		expect(parseMusicLink('reckoner radiohead')).toBeNull();
		expect(parseMusicLink('https://example.com/track/1')).toBeNull();
		expect(parseMusicLink('https://open.spotify.com/user/abc')).toBeNull();
	});
});

describe('openUrlFor', () => {
	const song = { title: 'Reckoner', artist: 'Radiohead', appleUrl: 'https://music.apple.com/x' };
	it('uses the direct link for the preferred service', () => {
		expect(openUrlFor(song, 'apple')).toBe('https://music.apple.com/x');
	});
	it('falls back to a search on the other service', () => {
		expect(openUrlFor(song, 'spotify')).toBe('https://open.spotify.com/search/Reckoner%20Radiohead');
	});
});
