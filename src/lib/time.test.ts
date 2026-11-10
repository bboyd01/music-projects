import { describe, expect, it } from 'vitest';
import { commentTimestamp, formatTime, COMMENT_LEAD_SEC } from './time';

describe('formatTime', () => {
	it('formats minutes and seconds', () => {
		expect(formatTime(0)).toBe('0:00');
		expect(formatTime(75.4)).toBe('1:15');
		expect(formatTime(599.9)).toBe('9:59');
	});
	it('formats hours', () => {
		expect(formatTime(3725)).toBe('1:02:05');
	});
	it('treats invalid values as zero', () => {
		expect(formatTime(null)).toBe('0:00');
		expect(formatTime(NaN)).toBe('0:00');
		expect(formatTime(-4)).toBe('0:00');
	});
});

describe('commentTimestamp', () => {
	it('starts 3 seconds before the playhead', () => {
		expect(COMMENT_LEAD_SEC).toBe(3);
		expect(commentTimestamp(42.5)).toBe(39.5);
	});
	it('never goes below zero', () => {
		expect(commentTimestamp(1.2)).toBe(0);
		expect(commentTimestamp(0)).toBe(0);
	});
	it('rounds to tenths', () => {
		expect(commentTimestamp(10.06)).toBe(7.1);
	});
});
