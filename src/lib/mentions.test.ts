import { describe, expect, it } from 'vitest';
import { extractMentions } from './mentions';

describe('extractMentions', () => {
	it('finds unique, lowercased handles', () => {
		expect(extractMentions('@Alice nice! cc @bob_2 and @alice again')).toEqual(['alice', 'bob_2']);
	});
	it('ignores email addresses and lone @', () => {
		expect(extractMentions('mail me at me@example.com @ ok')).toEqual([]);
	});
	it('handles punctuation after a handle', () => {
		expect(extractMentions('thanks @sam, (@kim)')).toEqual(['sam', 'kim']);
	});
});
