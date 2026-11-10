import { describe, expect, it } from 'vitest';
import { commentTimestamp, formatTime } from './time';

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
	it('uses the exact playhead position', () => {
		expect(commentTimestamp(42.5)).toBe(42.5);
		expect(commentTimestamp(1.2)).toBe(1.2);
	});
	it('rounds to tenths and never goes below zero', () => {
		expect(commentTimestamp(10.06)).toBe(10.1);
		expect(commentTimestamp(0)).toBe(0);
		expect(commentTimestamp(-1)).toBe(0);
		expect(commentTimestamp(NaN)).toBe(0);
	});
});
