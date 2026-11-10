import { describe, expect, it } from 'vitest';
import { roleAllows } from './roles';

describe('roleAllows', () => {
	it('orders viewer < editor < owner', () => {
		expect(roleAllows('owner', 'editor')).toBe(true);
		expect(roleAllows('editor', 'editor')).toBe(true);
		expect(roleAllows('viewer', 'editor')).toBe(false);
		expect(roleAllows('editor', 'owner')).toBe(false);
	});
	it('denies non-members', () => {
		expect(roleAllows(null, 'viewer')).toBe(false);
		expect(roleAllows(undefined, 'viewer')).toBe(false);
	});
});
