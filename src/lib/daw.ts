/** Custom link type handled by the Music Projects Opener helper on the Mac. */
export const OPENER_SCHEME = 'musicprojects';

/** ".rpp", "rpp" or " .RPP " → ".rpp"-style (keeps case as typed, adds the dot). */
export function normalizeExt(ext: string): string {
	const e = ext.trim();
	if (!e) return '';
	return e.startsWith('.') ? e : `.${e}`;
}

/**
 * Build the project file path using the convention
 *   <folder>/<Track Name>/<Track Name><ext>
 * e.g. /Users/me/Documents/REAPER Media/PROJECTS/New Sketch 14/New Sketch 14.rpp
 * The track title is used verbatim. Returns null when not configured.
 */
export function projectPath(folder: string | undefined, ext: string | undefined, title: string): string | null {
	const f = (folder ?? '').trim();
	const e = normalizeExt(ext ?? '');
	const t = title.trim();
	if (!f || !e || !t) return null;
	const base = f.endsWith('/') ? f : `${f}/`;
	return `${base}${t}/${t}${e}`;
}

/** The link the Open Project button uses; the helper decodes and opens the path. */
export function openerUrl(path: string): string {
	return `${OPENER_SCHEME}://open?path=${encodeURIComponent(path)}`;
}
