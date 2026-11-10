import { randomBytes } from 'node:crypto';

const alphabet = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Random, URL-safe id. 16 chars of base36 ≈ 82 bits. */
export function newId(length = 16): string {
	const bytes = randomBytes(length);
	let out = '';
	for (let i = 0; i < length; i++) out += alphabet[bytes[i] % alphabet.length];
	return out;
}

/** Long random token for sessions and file names (~190 bits). */
export function newToken(): string {
	return randomBytes(24).toString('base64url');
}
