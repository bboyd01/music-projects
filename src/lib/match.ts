/** Normalize a title/file name for matching: Unicode NFC (macOS file names are NFD), trimmed, single spaces, case-insensitive. */
export function normalizeTitle(s: string): string {
	return s.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

/** "New Sketch 14.mp3" → "New Sketch 14" (only strips .wav / .mp3). */
export function stemOf(filename: string): string {
	const base = filename.split(/[\\/]/).pop() ?? filename;
	return base.replace(/\.(wav|mp3)$/i, '');
}

export function audioKind(filename: string): 'wav' | 'mp3' | null {
	const m = filename.match(/\.(wav|mp3)$/i);
	return m ? (m[1].toLowerCase() as 'wav' | 'mp3') : null;
}

export type Candidate = { trackId: string; title: string; projectId: string; projectName: string };

/** Tracks whose title matches the file's name, optionally narrowed to a project (by id or name). */
export function matchTracks(filename: string, candidates: Candidate[], project?: string | null): Candidate[] {
	const want = normalizeTitle(stemOf(filename));
	let list = candidates.filter((c) => normalizeTitle(c.title) === want);
	if (project) {
		const p = normalizeTitle(project);
		list = list.filter((c) => c.projectId === project || normalizeTitle(c.projectName) === p);
	}
	return list;
}
