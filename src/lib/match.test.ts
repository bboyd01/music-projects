import { describe, expect, it } from 'vitest';
import { audioKind, matchTracks, normalizeTitle, stemOf, type Candidate } from './match';

const c = (title: string, projectName = 'Winter Suite', projectId = 'p1'): Candidate => ({
	trackId: `${projectId}:${title}`,
	title,
	projectId,
	projectName
});

describe('file name matching', () => {
	it('strips only .wav / .mp3 and any folders', () => {
		expect(stemOf('New Sketch 14.mp3')).toBe('New Sketch 14');
		expect(stemOf('/Users/me/Renders/Thaw.WAV')).toBe('Thaw');
		expect(stemOf('notes.mp3.txt')).toBe('notes.mp3.txt');
	});
	it('knows the allowed kinds', () => {
		expect(audioKind('a.MP3')).toBe('mp3');
		expect(audioKind('a.wav')).toBe('wav');
		expect(audioKind('a.flac')).toBeNull();
	});
	it('ignores case, extra spaces and NFC/NFD differences', () => {
		const nfd = 'Café Song'; // macOS file-name form
		expect(normalizeTitle(nfd)).toBe(normalizeTitle('Café  song '));
		expect(matchTracks(`${nfd}.mp3`, [c('Café Song')])).toHaveLength(1);
		expect(matchTracks('new sketch 14.wav', [c('New Sketch 14')])).toHaveLength(1);
	});
	it('returns all matches, narrowed by project name or id', () => {
		const list = [c('Intro', 'Winter Suite', 'p1'), c('Intro', 'Summer EP', 'p2'), c('Outro')];
		expect(matchTracks('Intro.mp3', list)).toHaveLength(2);
		expect(matchTracks('Intro.mp3', list, 'summer ep')).toEqual([list[1]]);
		expect(matchTracks('Intro.mp3', list, 'p1')).toEqual([list[0]]);
		expect(matchTracks('Nope.mp3', list)).toHaveLength(0);
	});
});
