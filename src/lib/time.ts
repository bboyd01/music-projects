/** 75.4 → "1:15", 3725 → "1:02:05" */
export function formatTime(sec: number | null | undefined): string {
	if (sec == null || !Number.isFinite(sec) || sec < 0) sec = 0;
	const s = Math.floor(sec);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const r = s % 60;
	const ss = String(r).padStart(2, '0');
	return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Timestamp for a comment or todo: the current playhead, rounded to tenths of a second. */
export function commentTimestamp(currentTime: number): number {
	if (!Number.isFinite(currentTime)) return 0;
	return Math.max(0, Math.round(currentTime * 10) / 10);
}

export function relativeTime(ms: number, now = Date.now()): string {
	const diff = Math.round((now - ms) / 1000);
	if (diff < 45) return 'just now';
	if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
	if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
	if (diff < 86400 * 7) return `${Math.round(diff / 86400)}d ago`;
	return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatDate(d: string | null | undefined): string {
	if (!d) return '';
	const date = new Date(d + 'T00:00:00');
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
