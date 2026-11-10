import { describe, expect, it } from 'vitest';
import { normalizeExt, openerUrl, projectPath } from './daw';

describe('projectPath', () => {
	it('encloses the project file in an identically named folder', () => {
		expect(projectPath('/Users/userName/Documents/REAPER Media/PROJECTS/', '.rpp', 'New Sketch 14')).toBe(
			'/Users/userName/Documents/REAPER Media/PROJECTS/New Sketch 14/New Sketch 14.rpp'
		);
	});
	it('adds a missing trailing slash and leading dot', () => {
		expect(projectPath('/Users/me/Projects', 'rpp', 'Thaw')).toBe('/Users/me/Projects/Thaw/Thaw.rpp');
	});
	it('uses the title verbatim (only trimming outer spaces)', () => {
		expect(projectPath('/p/', '.rpp', '  Opening — Snowfall ')).toBe('/p/Opening — Snowfall/Opening — Snowfall.rpp');
	});
	it('returns null until folder and extension are set', () => {
		expect(projectPath('', '.rpp', 'X')).toBeNull();
		expect(projectPath('/p/', '', 'X')).toBeNull();
		expect(projectPath(undefined, undefined, 'X')).toBeNull();
	});
});

describe('helpers', () => {
	it('normalizeExt', () => {
		expect(normalizeExt(' rpp ')).toBe('.rpp');
		expect(normalizeExt('.als')).toBe('.als');
		expect(normalizeExt('')).toBe('');
	});
	it('openerUrl encodes spaces, slashes and unicode', () => {
		const url = openerUrl('/a b/Café — 1/x.rpp');
		expect(url.startsWith('musicprojects://open?path=')).toBe(true);
		expect(decodeURIComponent(url.split('path=')[1])).toBe('/a b/Café — 1/x.rpp');
		expect(url).not.toContain(' ');
	});
});
