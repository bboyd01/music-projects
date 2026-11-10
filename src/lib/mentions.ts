/** Extract @handles from a comment body (lowercased, unique). */
export function extractMentions(body: string): string[] {
	const out = new Set<string>();
	for (const m of body.matchAll(/(^|[^\w@])@([a-z0-9_]{2,32})\b/gi)) out.add(m[2].toLowerCase());
	return [...out];
}
